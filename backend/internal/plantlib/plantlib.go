// Package plantlib loads the bundled plant library into an in-memory cache
// and answers all read queries against it. No external API calls at runtime.
package plantlib

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
	"sync"
)

type Plant struct {
	ID                     string   `json:"id"`
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
	cache sync.Map // id -> *Plant
	ids   []string // sorted by common_name_pl for stable listing order
	count int
}

// Load reads the library from path if non-empty, otherwise from the embedded bytes.
func Load(path string, embedded []byte) (*Library, error) {
	raw := embedded
	if path != "" {
		b, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("read plant library %s: %w", path, err)
		}
		raw = b
	}
	var plants []Plant
	if err := json.Unmarshal(raw, &plants); err != nil {
		return nil, fmt.Errorf("parse plant library: %w", err)
	}
	if len(plants) == 0 {
		return nil, fmt.Errorf("plant library is empty")
	}
	lib := &Library{}
	sort.Slice(plants, func(i, j int) bool { return plants[i].CommonNamePL < plants[j].CommonNamePL })
	for i := range plants {
		p := plants[i]
		lib.cache.Store(p.ID, &p)
		lib.ids = append(lib.ids, p.ID)
	}
	lib.count = len(plants)
	return lib, nil
}

func (l *Library) Count() int { return l.count }

func (l *Library) Get(id string) (*Plant, bool) {
	v, ok := l.cache.Load(id)
	if !ok {
		return nil, false
	}
	return v.(*Plant), true
}

// Search filters by case-insensitive substring on names plus exact category/lifecycle,
// returning the requested page and the total match count.
func (l *Library) Search(query, category, lifecycle string, page, pageSize int) ([]*Plant, int) {
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
			hay := strings.ToLower(p.CommonNamePL + " " + p.CommonNameEN + " " + p.LatinName)
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
