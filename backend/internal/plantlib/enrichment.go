package plantlib

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"

	"gorm.io/gorm"
)

// Disease is one disease / pest / disorder / behavior entry for a plant, fully
// bilingual with the symptom → treatment → prevention chain.
type Disease struct {
	Kind         string `json:"kind"` // disease | pest | disorder | behavior
	NamePL       string `json:"name_pl"`
	NameEN       string `json:"name_en"`
	SymptomsPL   string `json:"symptoms_pl"`
	SymptomsEN   string `json:"symptoms_en"`
	TreatmentPL  string `json:"treatment_pl"`
	TreatmentEN  string `json:"treatment_en"`
	PreventionPL string `json:"prevention_pl"`
	PreventionEN string `json:"prevention_en"`
}

// Enrichment is the rich bilingual record produced for a plant by the enrichment
// workflow and overlaid onto its library row.
type Enrichment struct {
	DescriptionPL     string    `json:"description_pl"`
	DescriptionEN     string    `json:"description_en"`
	WateringDetailPL  string    `json:"watering_detail_pl"`
	WateringDetailEN  string    `json:"watering_detail_en"`
	FertilizingPL     string    `json:"fertilizing_pl"`
	FertilizingEN     string    `json:"fertilizing_en"`
	LightPL           string    `json:"light_pl"`
	LightEN           string    `json:"light_en"`
	SoilPL            string    `json:"soil_pl"`
	SoilEN            string    `json:"soil_en"`
	PruningPL         string    `json:"pruning_pl"`
	PruningEN         string    `json:"pruning_en"`
	PropagationPL     string    `json:"propagation_pl"`
	PropagationEN     string    `json:"propagation_en"`
	HarvestDetailPL   string    `json:"harvest_detail_pl"`
	HarvestDetailEN   string    `json:"harvest_detail_en"`
	OverwinteringPL   string    `json:"overwintering_pl"`
	OverwinteringEN   string    `json:"overwintering_en"`
	ToxicityPL        string    `json:"toxicity_pl"`
	ToxicityEN        string    `json:"toxicity_en"`
	HardinessZone     string    `json:"hardiness_zone"`
	TipsPL            []string  `json:"tips_pl"`
	TipsEN            []string  `json:"tips_en"`
	Diseases          []Disease `json:"diseases"`
}

// Image is an open-source image reference with attribution.
type Image struct {
	ImageURL         string `json:"image_url"`
	ImageThumbURL    string `json:"image_thumb_url"`
	ImageSourceURL   string `json:"image_source_url"`
	ImageLicense     string `json:"image_license"`
	ImageAttribution string `json:"image_attribution"`
}

// applyEnrichment overlays the enrichment + image data onto the library rows and
// repopulates plant_diseases. It re-runs when the overlay content changed or the
// base library was just reseeded (which clears the overlay columns).
func applyEnrichment(db *gorm.DB, enrichmentRaw, imagesRaw []byte, force bool) error {
	var enrichment map[string]Enrichment
	var images map[string]Image
	if len(enrichmentRaw) > 0 {
		if err := json.Unmarshal(enrichmentRaw, &enrichment); err != nil {
			return fmt.Errorf("parse enrichment: %w", err)
		}
	}
	if len(imagesRaw) > 0 {
		if err := json.Unmarshal(imagesRaw, &images); err != nil {
			return fmt.Errorf("parse images: %w", err)
		}
	}
	if len(enrichment) == 0 && len(images) == 0 {
		return nil
	}

	h := sha256.New()
	h.Write(enrichmentRaw)
	h.Write(imagesRaw)
	version := hex.EncodeToString(h.Sum(nil))

	if !force {
		var stored string
		db.Raw("SELECT value FROM app_meta WHERE key = 'enrichment_version'").Scan(&stored)
		if stored == version {
			return nil
		}
	}

	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("DELETE FROM plant_diseases").Error; err != nil {
			return err
		}
		for id, img := range images {
			if err := tx.Table("library_plants").Where("id = ?", id).Updates(map[string]any{
				"image_url":         img.ImageURL,
				"image_thumb_url":   img.ImageThumbURL,
				"image_source_url":  img.ImageSourceURL,
				"image_license":     img.ImageLicense,
				"image_attribution": img.ImageAttribution,
			}).Error; err != nil {
				return fmt.Errorf("apply image %s: %w", id, err)
			}
		}
		for id, e := range enrichment {
			if err := tx.Table("library_plants").Where("id = ?", id).Updates(map[string]any{
				"description_pl":     e.DescriptionPL,
				"description_en":     e.DescriptionEN,
				"watering_detail_pl": e.WateringDetailPL,
				"watering_detail_en": e.WateringDetailEN,
				"fertilizing_pl":     e.FertilizingPL,
				"fertilizing_en":     e.FertilizingEN,
				"light_pl":           e.LightPL,
				"light_en":           e.LightEN,
				"soil_pl":            e.SoilPL,
				"soil_en":            e.SoilEN,
				"pruning_pl":         e.PruningPL,
				"pruning_en":         e.PruningEN,
				"propagation_pl":     e.PropagationPL,
				"propagation_en":     e.PropagationEN,
				"harvest_detail_pl":  e.HarvestDetailPL,
				"harvest_detail_en":  e.HarvestDetailEN,
				"overwintering_pl":   e.OverwinteringPL,
				"overwintering_en":   e.OverwinteringEN,
				"toxicity_pl":        e.ToxicityPL,
				"toxicity_en":        e.ToxicityEN,
				"hardiness_zone":     e.HardinessZone,
				"tips_pl":            marshalStrs(e.TipsPL),
				"tips_en":            marshalStrs(e.TipsEN),
				"enriched":           true,
			}).Error; err != nil {
				return fmt.Errorf("apply enrichment %s: %w", id, err)
			}
			for i, d := range e.Diseases {
				kind := d.Kind
				if kind == "" {
					kind = "disease"
				}
				if err := tx.Exec(`INSERT INTO plant_diseases
					(plant_id, kind, name_pl, name_en, symptoms_pl, symptoms_en,
					 treatment_pl, treatment_en, prevention_pl, prevention_en, sort_order)
					VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
					id, kind, d.NamePL, d.NameEN, d.SymptomsPL, d.SymptomsEN,
					d.TreatmentPL, d.TreatmentEN, d.PreventionPL, d.PreventionEN, i).Error; err != nil {
					return fmt.Errorf("insert disease for %s: %w", id, err)
				}
			}
		}
		return tx.Exec(
			`INSERT INTO app_meta (key, value) VALUES ('enrichment_version', ?)
			 ON CONFLICT (key) DO UPDATE SET value = excluded.value`, version).Error
	})
}

// PlantDetail is the full "single source of truth" view of a library plant:
// the base fields (which already carry image_url/image_thumb_url) plus the
// bilingual enrichment (including diseases) and the image's source/license/
// attribution, flattened into one JSON object.
type PlantDetail struct {
	Plant
	Enrichment
	ImageSourceURL   string `json:"image_source_url"`
	ImageLicense     string `json:"image_license"`
	ImageAttribution string `json:"image_attribution"`
}

// detailRow reads the enrichment-only columns for a single plant. The base
// fields (name, image_url/thumb, enriched, ...) come from the in-memory cache,
// so they are intentionally not repeated here.
type detailRow struct {
	DescriptionPL    string `gorm:"column:description_pl"`
	DescriptionEN    string `gorm:"column:description_en"`
	WateringDetailPL string `gorm:"column:watering_detail_pl"`
	WateringDetailEN string `gorm:"column:watering_detail_en"`
	FertilizingPL    string `gorm:"column:fertilizing_pl"`
	FertilizingEN    string `gorm:"column:fertilizing_en"`
	LightPL          string `gorm:"column:light_pl"`
	LightEN          string `gorm:"column:light_en"`
	SoilPL           string `gorm:"column:soil_pl"`
	SoilEN           string `gorm:"column:soil_en"`
	PruningPL        string `gorm:"column:pruning_pl"`
	PruningEN        string `gorm:"column:pruning_en"`
	PropagationPL    string `gorm:"column:propagation_pl"`
	PropagationEN    string `gorm:"column:propagation_en"`
	HarvestDetailPL  string `gorm:"column:harvest_detail_pl"`
	HarvestDetailEN  string `gorm:"column:harvest_detail_en"`
	OverwinteringPL  string `gorm:"column:overwintering_pl"`
	OverwinteringEN  string `gorm:"column:overwintering_en"`
	ToxicityPL       string `gorm:"column:toxicity_pl"`
	ToxicityEN       string `gorm:"column:toxicity_en"`
	HardinessZone    string `gorm:"column:hardiness_zone"`
	TipsPL           string `gorm:"column:tips_pl"`
	TipsEN           string `gorm:"column:tips_en"`
	ImageSourceURL   string `gorm:"column:image_source_url"`
	ImageLicense     string `gorm:"column:image_license"`
	ImageAttribution string `gorm:"column:image_attribution"`
}

// GetDetail returns the full enriched view of a plant, or false if unknown.
// Only meaningful when the library is database-backed.
func (l *Library) GetDetail(id string) (*PlantDetail, bool) {
	if l.db == nil {
		if p, ok := l.Get(id); ok {
			return &PlantDetail{Plant: *p, Enrichment: Enrichment{Diseases: []Disease{}}}, true
		}
		return nil, false
	}
	base, ok := l.Get(id)
	if !ok {
		return nil, false
	}
	var r detailRow
	if err := l.db.Table("library_plants").
		Select(`description_pl, description_en, watering_detail_pl, watering_detail_en,
			fertilizing_pl, fertilizing_en, light_pl, light_en, soil_pl, soil_en,
			pruning_pl, pruning_en, propagation_pl, propagation_en, harvest_detail_pl,
			harvest_detail_en, overwintering_pl, overwintering_en, toxicity_pl, toxicity_en,
			hardiness_zone, tips_pl, tips_en, image_source_url, image_license, image_attribution`).
		Where("id = ?", id).First(&r).Error; err != nil {
		return nil, false
	}
	var diseases []Disease
	l.db.Raw(`SELECT kind, name_pl, name_en, symptoms_pl, symptoms_en,
		treatment_pl, treatment_en, prevention_pl, prevention_en
		FROM plant_diseases WHERE plant_id = ? ORDER BY sort_order`, id).Scan(&diseases)
	if diseases == nil {
		diseases = []Disease{}
	}
	return &PlantDetail{
		Plant: *base,
		Enrichment: Enrichment{
			DescriptionPL: r.DescriptionPL, DescriptionEN: r.DescriptionEN,
			WateringDetailPL: r.WateringDetailPL, WateringDetailEN: r.WateringDetailEN,
			FertilizingPL: r.FertilizingPL, FertilizingEN: r.FertilizingEN,
			LightPL: r.LightPL, LightEN: r.LightEN,
			SoilPL: r.SoilPL, SoilEN: r.SoilEN,
			PruningPL: r.PruningPL, PruningEN: r.PruningEN,
			PropagationPL: r.PropagationPL, PropagationEN: r.PropagationEN,
			HarvestDetailPL: r.HarvestDetailPL, HarvestDetailEN: r.HarvestDetailEN,
			OverwinteringPL: r.OverwinteringPL, OverwinteringEN: r.OverwinteringEN,
			ToxicityPL: r.ToxicityPL, ToxicityEN: r.ToxicityEN,
			HardinessZone: r.HardinessZone,
			TipsPL:        unmarshalStrs(r.TipsPL),
			TipsEN:        unmarshalStrs(r.TipsEN),
			Diseases:      diseases,
		},
		ImageSourceURL:   r.ImageSourceURL,
		ImageLicense:     r.ImageLicense,
		ImageAttribution: r.ImageAttribution,
	}, true
}
