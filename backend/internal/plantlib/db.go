package plantlib

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

// libraryRow maps a plant to the library_plants table. Array-valued fields are
// stored as JSON-encoded text; search_text and sort_key are derived columns
// populated by the seeder.
type libraryRow struct {
	ID                     string `gorm:"primaryKey;column:id"`
	Source                 string `gorm:"column:source"`
	Family                 string `gorm:"column:family"`
	CommonNamePL           string `gorm:"column:common_name_pl"`
	CommonNameEN           string `gorm:"column:common_name_en"`
	LatinName              string `gorm:"column:latin_name"`
	Category               string `gorm:"column:category"`
	Lifecycle              string `gorm:"column:lifecycle"`
	Difficulty             string `gorm:"column:difficulty"`
	SunRequirement         string `gorm:"column:sun_requirement"`
	WaterFrequencyDays     int    `gorm:"column:water_frequency_days"`
	FertilizeFrequencyDays int    `gorm:"column:fertilize_frequency_days"`
	SowMonths              string `gorm:"column:sow_months"`
	TransplantMonths       string `gorm:"column:transplant_months"`
	HarvestMonths          string `gorm:"column:harvest_months"`
	FrostSensitive         bool   `gorm:"column:frost_sensitive"`
	CompanionPlants        string `gorm:"column:companion_plants"`
	AntagonistPlants       string `gorm:"column:antagonist_plants"`
	TypicalHeightCM        int    `gorm:"column:typical_height_cm"`
	SpacingCM              int    `gorm:"column:spacing_cm"`
	CareNotes              string `gorm:"column:care_notes"`
	CommonPests            string `gorm:"column:common_pests"`
	Tags                   string `gorm:"column:tags"`
	SearchText             string `gorm:"column:search_text"`
	SortKey                string `gorm:"column:sort_key"`
	ImageURL               string `gorm:"column:image_url"`
	ImageThumbURL          string `gorm:"column:image_thumb_url"`
	Enriched               bool   `gorm:"column:enriched"`
}

func (libraryRow) TableName() string { return "library_plants" }

func marshalInts(v []int) string {
	if v == nil {
		v = []int{}
	}
	b, _ := json.Marshal(v)
	return string(b)
}

func marshalStrs(v []string) string {
	if v == nil {
		v = []string{}
	}
	b, _ := json.Marshal(v)
	return string(b)
}

func unmarshalInts(s string) []int {
	var x []int
	_ = json.Unmarshal([]byte(s), &x)
	if x == nil {
		x = []int{}
	}
	return x
}

func unmarshalStrs(s string) []string {
	var x []string
	_ = json.Unmarshal([]byte(s), &x)
	if x == nil {
		x = []string{}
	}
	return x
}

// searchText builds the diacritic-correct lowercase haystack for substring search.
func searchText(p Plant) string {
	return strings.ToLower(strings.Join([]string{
		p.CommonNamePL, p.CommonNameEN, p.LatinName, p.Family, strings.Join(p.Tags, " "),
	}, " "))
}

func toRow(p Plant) libraryRow {
	return libraryRow{
		ID:                     p.ID,
		Source:                 p.Source,
		Family:                 p.Family,
		CommonNamePL:           p.CommonNamePL,
		CommonNameEN:           p.CommonNameEN,
		LatinName:              p.LatinName,
		Category:               p.Category,
		Lifecycle:              p.Lifecycle,
		Difficulty:             p.Difficulty,
		SunRequirement:         p.SunRequirement,
		WaterFrequencyDays:     p.WaterFrequencyDays,
		FertilizeFrequencyDays: p.FertilizeFrequencyDays,
		SowMonths:              marshalInts(p.SowMonths),
		TransplantMonths:       marshalInts(p.TransplantMonths),
		HarvestMonths:          marshalInts(p.HarvestMonths),
		FrostSensitive:         p.FrostSensitive,
		CompanionPlants:        marshalStrs(p.CompanionPlants),
		AntagonistPlants:       marshalStrs(p.AntagonistPlants),
		TypicalHeightCM:        p.TypicalHeightCM,
		SpacingCM:              p.SpacingCM,
		CareNotes:              p.CareNotes,
		CommonPests:            marshalStrs(p.CommonPests),
		Tags:                   marshalStrs(p.Tags),
		SearchText:             searchText(p),
		SortKey:                displayName(p),
	}
}

func fromRow(r libraryRow) Plant {
	return Plant{
		ID:                     r.ID,
		Source:                 r.Source,
		Family:                 r.Family,
		CommonNamePL:           r.CommonNamePL,
		CommonNameEN:           r.CommonNameEN,
		LatinName:              r.LatinName,
		Category:               r.Category,
		Lifecycle:              r.Lifecycle,
		Difficulty:             r.Difficulty,
		SunRequirement:         r.SunRequirement,
		WaterFrequencyDays:     r.WaterFrequencyDays,
		FertilizeFrequencyDays: r.FertilizeFrequencyDays,
		SowMonths:              unmarshalInts(r.SowMonths),
		TransplantMonths:       unmarshalInts(r.TransplantMonths),
		HarvestMonths:          unmarshalInts(r.HarvestMonths),
		FrostSensitive:         r.FrostSensitive,
		CompanionPlants:        unmarshalStrs(r.CompanionPlants),
		AntagonistPlants:       unmarshalStrs(r.AntagonistPlants),
		TypicalHeightCM:        r.TypicalHeightCM,
		SpacingCM:              r.SpacingCM,
		CareNotes:              r.CareNotes,
		CommonPests:            unmarshalStrs(r.CommonPests),
		Tags:                   unmarshalStrs(r.Tags),
		ImageURL:               r.ImageURL,
		ImageThumbURL:          r.ImageThumbURL,
		Enriched:               r.Enriched,
	}
}

// Sources bundles every input the library is seeded from.
type Sources struct {
	Curated    [][]byte // curated JSON files (full care data)
	Catalog    []byte   // GBIF European catalog
	Enrichment []byte   // map id → rich bilingual care data + diseases
	Images     []byte   // map id → open-source image
}

// Open seeds library_plants from the given sources (idempotently), applies the
// enrichment/image overlay, and returns a database-backed Library with its
// in-memory cache hydrated.
func Open(db *gorm.DB, src Sources) (*Library, error) {
	reseeded, err := seedBase(db, src.Curated, src.Catalog)
	if err != nil {
		return nil, err
	}
	if err := applyEnrichment(db, src.Enrichment, src.Images, reseeded); err != nil {
		return nil, err
	}
	var rows []libraryRow
	if err := db.Order("CASE WHEN source = 'curated' THEN 0 ELSE 1 END").
		Order("sort_key").Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("hydrate library cache: %w", err)
	}
	lib := &Library{db: db}
	for _, r := range rows {
		p := fromRow(r)
		lib.cache.Store(p.ID, &p)
		lib.ids = append(lib.ids, p.ID)
	}
	lib.count = len(rows)
	return lib, nil
}

// seedBase writes the merged base plant set into library_plants when the content
// changed (tracked by a hash in app_meta). Returns whether it reseeded so the
// caller knows the enrichment overlay must be re-applied.
func seedBase(db *gorm.DB, curatedRaws [][]byte, catalogRaw []byte) (bool, error) {
	plants, err := mergePlants(curatedRaws, catalogRaw)
	if err != nil {
		return false, err
	}
	version := hashInputs(curatedRaws, catalogRaw)

	var stored string
	db.Raw("SELECT value FROM app_meta WHERE key = 'library_version'").Scan(&stored)
	var count int64
	db.Table("library_plants").Count(&count)
	if stored == version && count > 0 {
		return false, nil // already up to date
	}

	rows := make([]libraryRow, len(plants))
	for i, p := range plants {
		rows[i] = toRow(p)
	}
	err = db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("TRUNCATE library_plants CASCADE").Error; err != nil {
			return fmt.Errorf("truncate library: %w", err)
		}
		if err := tx.CreateInBatches(rows, 500).Error; err != nil {
			return fmt.Errorf("seed library: %w", err)
		}
		return tx.Exec(
			`INSERT INTO app_meta (key, value) VALUES ('library_version', ?)
			 ON CONFLICT (key) DO UPDATE SET value = excluded.value`, version).Error
	})
	return err == nil, err
}

func hashInputs(curatedRaws [][]byte, catalogRaw []byte) string {
	h := sha256.New()
	for _, r := range curatedRaws {
		h.Write(r)
		h.Write([]byte{0})
	}
	h.Write(catalogRaw)
	return hex.EncodeToString(h.Sum(nil))
}

func (l *Library) countDB() int {
	var n int64
	l.db.Table("library_plants").Count(&n)
	return int(n)
}

func (l *Library) categoriesDB() []string {
	var cats []string
	l.db.Model(&libraryRow{}).Distinct().Order("category").Pluck("category", &cats)
	return cats
}

func (l *Library) searchDB(query, category, lifecycle string, page, pageSize int) ([]*Plant, int) {
	page, pageSize = normalizePage(page, pageSize)
	q := l.db.Model(&libraryRow{})
	if category != "" {
		q = q.Where("category = ?", category)
	}
	if lifecycle != "" {
		q = q.Where("lifecycle = ?", lifecycle)
	}
	if s := strings.ToLower(strings.TrimSpace(query)); s != "" {
		q = q.Where(`search_text LIKE ? ESCAPE '\'`, "%"+escapeLike(s)+"%")
	}

	var total int64
	q.Count(&total)

	var rows []libraryRow
	// Promote the plants we actually have rich data for: fully enriched first,
	// then those with at least an image, then the rest — alphabetical within each
	// tier. This surfaces the well-documented, popular species ahead of the bare
	// catalog long tail.
	q.Order("enriched DESC").
		Order("(image_url <> '') DESC").
		Order("sort_key").
		Offset((page - 1) * pageSize).Limit(pageSize).Find(&rows)

	out := make([]*Plant, len(rows))
	for i := range rows {
		p := fromRow(rows[i])
		out[i] = &p
	}
	return out, int(total)
}

func normalizePage(page, pageSize int) (int, int) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return page, pageSize
}

// escapeLike neutralises LIKE wildcards in user input (the query uses ESCAPE '\').
func escapeLike(s string) string {
	r := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return r.Replace(s)
}
