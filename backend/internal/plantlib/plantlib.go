// Package plantlib is the plant-library access layer. In production it is backed
// by the PostgreSQL library_plants table (seeded from the bundled JSON sources)
// and serves search/list/count via SQL; a small in-memory cache holds every row
// for the hot per-plant lookups (Get/Resolve/month filters). With a nil db it
// falls back to a pure in-memory implementation, used by unit tests.
// No external API calls at runtime.
package plantlib

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
	"sync"

	"gorm.io/gorm"
)

type Plant struct {
	ID                     string   `json:"id"`
	Source                 string   `json:"source,omitempty"` // "curated" (rich care data) or "gbif" (catalog)
	Family                 string   `json:"family,omitempty"`
	CommonNamePL           string   `json:"common_name_pl"`
	CommonNameEN           string   `json:"common_name_en"`
	LatinName              string   `json:"latin_name"`
	Category               string   `json:"category"`
	Lifecycle              string   `json:"lifecycle"`
	Difficulty             string   `json:"difficulty"`
	SunRequirement         string   `json:"sun_requirement"`
	WaterFrequencyDays     int      `json:"water_frequency_days"`
	FertilizeFrequencyDays int      `json:"fertilize_frequency_days"`
	SowMonths              []int    `json:"sow_months"`
	TransplantMonths       []int    `json:"transplant_months"`
	HarvestMonths          []int    `json:"harvest_months"`
	FrostSensitive         bool     `json:"frost_sensitive"`
	CompanionPlants        []string `json:"companion_plants"`
	AntagonistPlants       []string `json:"antagonist_plants"`
	TypicalHeightCM        int      `json:"typical_height_cm"`
	SpacingCM              int      `json:"spacing_cm"`
	CareNotes              string   `json:"care_notes"`
	CommonPests            []string `json:"common_pests"`
	Tags                   []string `json:"tags"`
}

type Library struct {
	db    *gorm.DB // nil → pure in-memory mode (tests)
	cache sync.Map // id -> *Plant (always populated)
	ids   []string // ids in listing order (curated first, then by name)
	count int
}

// Load parses the curated library, optionally overriding it with a file at path.
func Load(path string, embedded []byte) (*Library, error) {
	raw := embedded
	if path != "" {
		b, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("read plant library %s: %w", path, err)
		}
		raw = b
	}
	return LoadMerged(raw, nil)
}

// LoadMerged builds the library from one curated source plus an optional GBIF
// catalog. See LoadMergedMulti for the merge semantics.
func LoadMerged(curatedRaw, catalogRaw []byte) (*Library, error) {
	return LoadMergedMulti([][]byte{curatedRaw}, catalogRaw)
}

// LoadMergedMulti builds the library from one or more curated sources plus an
// optional GBIF catalog. Curated entries always win: a catalog plant sharing a
// latin name with a curated one is dropped, so rich care data is never shadowed
// by a bare catalog stub. Earlier curated sources win over later ones on a
// collision. Listing order puts curated plants first, then alphabetical.
func LoadMergedMulti(curatedRaws [][]byte, catalogRaw []byte) (*Library, error) {
	all, err := mergePlants(curatedRaws, catalogRaw)
	if err != nil {
		return nil, err
	}
	lib := &Library{}
	for i := range all {
		p := all[i]
		lib.cache.Store(p.ID, &p)
		lib.ids = append(lib.ids, p.ID)
	}
	lib.count = len(all)
	return lib, nil
}

// mergePlants parses and merges the curated sources and the optional GBIF
// catalog into a single deduplicated, listing-ordered slice. Curated entries
// always win on a latin-name collision; among curated sources the earlier one
// wins. The result is sorted curated-first, then by display name.
func mergePlants(curatedRaws [][]byte, catalogRaw []byte) ([]Plant, error) {
	var curated []Plant
	for i, raw := range curatedRaws {
		if len(raw) == 0 {
			continue
		}
		var part []Plant
		if err := json.Unmarshal(raw, &part); err != nil {
			return nil, fmt.Errorf("parse curated library #%d: %w", i, err)
		}
		curated = append(curated, part...)
	}
	if len(curated) == 0 {
		return nil, fmt.Errorf("curated plant library is empty")
	}

	seenLatin := map[string]bool{}
	seenID := map[string]bool{}
	var all []Plant

	add := func(p Plant, defaultSource string) {
		if p.Source == "" {
			p.Source = defaultSource
		}
		key := strings.ToLower(strings.TrimSpace(p.LatinName))
		if key != "" && seenLatin[key] {
			return
		}
		if seenID[p.ID] {
			return
		}
		seenLatin[key] = true
		seenID[p.ID] = true
		all = append(all, p)
	}

	for _, p := range curated {
		add(p, "curated")
	}
	if len(catalogRaw) > 0 {
		var catalog []Plant
		if err := json.Unmarshal(catalogRaw, &catalog); err != nil {
			return nil, fmt.Errorf("parse catalog: %w", err)
		}
		for _, p := range catalog {
			add(p, "gbif")
		}
	}

	sort.SliceStable(all, func(i, j int) bool {
		ci, cj := all[i].Source == "curated", all[j].Source == "curated"
		if ci != cj {
			return ci // curated first
		}
		return displayName(all[i]) < displayName(all[j])
	})
	return all, nil
}

// displayName picks the best label for ordering: Polish name, else English, else latin.
func displayName(p Plant) string {
	if p.CommonNamePL != "" {
		return strings.ToLower(p.CommonNamePL)
	}
	if p.CommonNameEN != "" {
		return strings.ToLower(p.CommonNameEN)
	}
	return strings.ToLower(p.LatinName)
}

func (l *Library) Count() int {
	if l.db != nil {
		return l.countDB()
	}
	return l.count
}

func (l *Library) Get(id string) (*Plant, bool) {
	v, ok := l.cache.Load(id)
	if !ok {
		return nil, false
	}
	return v.(*Plant), true
}

// Search filters by case-insensitive substring on names plus exact category/lifecycle,
// returning the requested page and the total match count. Backed by SQL when a
// database is configured, otherwise by the in-memory cache.
func (l *Library) Search(query, category, lifecycle string, page, pageSize int) ([]*Plant, int) {
	if l.db != nil {
		return l.searchDB(query, category, lifecycle, page, pageSize)
	}
	query = strings.ToLower(strings.TrimSpace(query))
	var matches []*Plant
	for _, id := range l.ids {
		p, _ := l.Get(id)
		if p == nil {
			continue
		}
		if category != "" && p.Category != category {
			continue
		}
		if lifecycle != "" && p.Lifecycle != lifecycle {
			continue
		}
		if query != "" {
			hay := strings.ToLower(p.CommonNamePL + " " + p.CommonNameEN + " " +
				p.LatinName + " " + p.Family + " " + strings.Join(p.Tags, " "))
			if !strings.Contains(hay, query) {
				continue
			}
		}
		matches = append(matches, p)
	}
	total := len(matches)
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	start := (page - 1) * pageSize
	if start >= total {
		return []*Plant{}, total
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	return matches[start:end], total
}

func (l *Library) Categories() []string {
	if l.db != nil {
		return l.categoriesDB()
	}
	seen := map[string]bool{}
	var out []string
	for _, id := range l.ids {
		p, _ := l.Get(id)
		if p != nil && !seen[p.Category] {
			seen[p.Category] = true
			out = append(out, p.Category)
		}
	}
	sort.Strings(out)
	return out
}

// Resolve maps a list of slugs to library plants, silently dropping unknown slugs.
func (l *Library) Resolve(slugs []string) []*Plant {
	out := []*Plant{}
	for _, s := range slugs {
		if p, ok := l.Get(s); ok {
			out = append(out, p)
		}
	}
	return out
}

// SowableIn returns plants whose sow_months include the given month.
func (l *Library) SowableIn(month int) []*Plant {
	return l.filterByMonth(month, func(p *Plant) []int { return p.SowMonths })
}

// TransplantableIn returns plants whose transplant_months include the given month.
func (l *Library) TransplantableIn(month int) []*Plant {
	return l.filterByMonth(month, func(p *Plant) []int { return p.TransplantMonths })
}

func (l *Library) filterByMonth(month int, sel func(*Plant) []int) []*Plant {
	out := []*Plant{}
	for _, id := range l.ids {
		p, _ := l.Get(id)
		if p == nil {
			continue
		}
		for _, m := range sel(p) {
			if m == month {
				out = append(out, p)
				break
			}
		}
	}
	return out
}
