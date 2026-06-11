package service

import (
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/piotrekg/gardening/backend/internal/models"
	"github.com/piotrekg/gardening/backend/internal/plantlib"
	"github.com/piotrekg/gardening/backend/internal/repository"
)

type PlantInput struct {
	PlantLibraryID *string    `json:"plant_library_id"`
	CustomName     *string    `json:"custom_name"`
	PlantedDate    *time.Time `json:"planted_date"`
	LocationNotes  *string    `json:"location_notes"`
	Quantity       *int       `json:"quantity"`
	Status         *string    `json:"status"`
}

type PlantService struct {
	repo *repository.Repository
	lib  *plantlib.Library
}

func NewPlantService(repo *repository.Repository, lib *plantlib.Library) *PlantService {
	return &PlantService{repo: repo, lib: lib}
}

// ComputeCareStatus derives water/fertilize status from the care timestamps and
// the library frequencies. The planted date seeds the schedule for plants that
// have never been watered/fertilized; without any reference point the status is unknown.
func ComputeCareStatus(p *models.PlantInstance, lib *plantlib.Library) models.CareStatus {
	st := models.CareStatus{Water: "unknown", Fertilize: "unknown"}
	if p.PlantLibraryID == nil {
		return st
	}
	libPlant, ok := lib.Get(*p.PlantLibraryID)
	if !ok {
		return st
	}
	st.Water = scheduleStatus(p.LastWateredAt, p.PlantedDate, libPlant.WaterFrequencyDays)
	st.Fertilize = scheduleStatus(p.LastFertilizedAt, p.PlantedDate, libPlant.FertilizeFrequencyDays)
	return st
}

func scheduleStatus(last, planted *time.Time, freqDays int) string {
	ref := last
	if ref == nil {
		ref = planted
	}
	if ref == nil || freqDays <= 0 {
		return "unknown"
	}
	due := ref.AddDate(0, 0, freqDays)
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	dueDay := time.Date(due.Year(), due.Month(), due.Day(), 0, 0, 0, 0, due.Location())
	switch {
	case dueDay.Before(today):
		return "overdue"
	case dueDay.Equal(today):
		return "due_today"
	default:
		return "ok"
	}
}

// Enrich fills the computed fields (display name, care status, embedded library entry).
func (s *PlantService) Enrich(p *models.PlantInstance) {
	if p.CustomName != nil && *p.CustomName != "" {
		p.DisplayName = *p.CustomName
	}
	if p.PlantLibraryID != nil {
		if libPlant, ok := s.lib.Get(*p.PlantLibraryID); ok {
			p.Library = libPlant
			if p.DisplayName == "" {
				p.DisplayName = libPlant.CommonNamePL
			}
		}
	}
	if p.DisplayName == "" {
		p.DisplayName = "Unknown plant"
	}
	st := ComputeCareStatus(p, s.lib)
	p.CareStatus = &st
}

func (s *PlantService) Add(userID, gardenID string, in PlantInput) (*models.PlantInstance, error) {
	if _, err := s.repo.GardenByID(userID, gardenID); err != nil {
		return nil, err
	}
	hasLib := in.PlantLibraryID != nil && *in.PlantLibraryID != ""
	hasCustom := in.CustomName != nil && strings.TrimSpace(*in.CustomName) != ""
	if !hasLib && !hasCustom {
		return nil, Invalid("either plant_library_id or custom_name is required")
	}
	if hasLib {
		if _, ok := s.lib.Get(*in.PlantLibraryID); !ok {
			return nil, Invalid("unknown plant_library_id %q", *in.PlantLibraryID)
		}
	}
	p := &models.PlantInstance{
		ID:          uuid.NewString(),
		GardenID:    gardenID,
		UserID:      userID,
		PlantedDate: in.PlantedDate,
		Quantity:    1,
		Status:      "active",
	}
	if hasLib {
		p.PlantLibraryID = in.PlantLibraryID
	}
	if hasCustom {
		trimmed := strings.TrimSpace(*in.CustomName)
		p.CustomName = &trimmed
	}
	if in.LocationNotes != nil {
		p.LocationNotes = strings.TrimSpace(*in.LocationNotes)
	}
	if in.Quantity != nil {
		if *in.Quantity < 1 {
			return nil, Invalid("quantity must be at least 1")
		}
		p.Quantity = *in.Quantity
	}
	if err := s.repo.CreatePlantInstance(p); err != nil {
		return nil, err
	}
	s.Enrich(p)
	return p, nil
}

func (s *PlantService) List(userID, gardenID string) ([]models.PlantInstance, error) {
	if _, err := s.repo.GardenByID(userID, gardenID); err != nil {
		return nil, err
	}
	plants, err := s.repo.PlantsByGarden(gardenID)
	if err != nil {
		return nil, err
	}
	for i := range plants {
		s.Enrich(&plants[i])
	}
	return plants, nil
}

func (s *PlantService) Get(userID, gardenID, id string) (*models.PlantInstance, []models.CareLogEntry, error) {
	p, err := s.repo.PlantInstanceByID(userID, gardenID, id)
	if err != nil {
		return nil, nil, err
	}
	s.Enrich(p)
	recent, _, err := s.repo.CareLogByPlant(p.ID, 1, 10)
	if err != nil {
		return nil, nil, err
	}
	return p, recent, nil
}

func (s *PlantService) Update(userID, gardenID, id string, in PlantInput) (*models.PlantInstance, error) {
	p, err := s.repo.PlantInstanceByID(userID, gardenID, id)
	if err != nil {
		return nil, err
	}
	if in.CustomName != nil {
		trimmed := strings.TrimSpace(*in.CustomName)
		if trimmed == "" {
			p.CustomName = nil
		} else {
			p.CustomName = &trimmed
		}
	}
	if in.LocationNotes != nil {
		p.LocationNotes = strings.TrimSpace(*in.LocationNotes)
	}
	if in.Quantity != nil {
		if *in.Quantity < 1 {
			return nil, Invalid("quantity must be at least 1")
		}
		p.Quantity = *in.Quantity
	}
	if in.Status != nil {
		if !models.ValidPlantStatuses[*in.Status] {
			return nil, Invalid("status must be one of active, harvested, removed, dead")
		}
		p.Status = *in.Status
	}
	if in.PlantedDate != nil {
		p.PlantedDate = in.PlantedDate
	}
	if err := s.repo.SavePlantInstance(p); err != nil {
		return nil, err
	}
	s.Enrich(p)
	return p, nil
}

func (s *PlantService) Delete(userID, gardenID, id string) error {
	return s.repo.SoftDeletePlantInstance(userID, gardenID, id)
}

// --- companion compatibility ---

type Conflict struct {
	PlantA   *models.PlantInstance `json:"plant_a"`
	PlantB   *models.PlantInstance `json:"plant_b"`
	Severity string                `json:"severity"`
	Reason   string                `json:"reason"`
}

// Compatibility reports antagonist pairs currently co-located in a garden.
// Mutual antagonism is a conflict, one-directional a warning.
func (s *PlantService) Compatibility(userID, gardenID string) ([]Conflict, error) {
	plants, err := s.List(userID, gardenID)
	if err != nil {
		return nil, err
	}
	var active []*models.PlantInstance
	for i := range plants {
		if plants[i].Status == "active" && plants[i].PlantLibraryID != nil {
			active = append(active, &plants[i])
		}
	}
	conflicts := []Conflict{}
	for i := 0; i < len(active); i++ {
		for j := i + 1; j < len(active); j++ {
			a, okA := s.lib.Get(*active[i].PlantLibraryID)
			b, okB := s.lib.Get(*active[j].PlantLibraryID)
			if !okA || !okB || a.ID == b.ID {
				continue
			}
			aHatesB := isAntagonist(a, b)
			bHatesA := isAntagonist(b, a)
			if !aHatesB && !bHatesA {
				continue
			}
			severity := "warning"
			if aHatesB && bHatesA {
				severity = "conflict"
			}
			conflicts = append(conflicts, Conflict{
				PlantA:   active[i],
				PlantB:   active[j],
				Severity: severity,
				Reason:   a.CommonNameEN + " and " + b.CommonNameEN + " are antagonistic neighbours",
			})
		}
	}
	return conflicts, nil
}

// isAntagonist reports whether a lists b (by id, name or tag) among its antagonists.
func isAntagonist(a, b *plantlib.Plant, ) bool {
	for _, slug := range a.AntagonistPlants {
		if slug == b.ID {
			return true
		}
		// Generic slugs like "fennel" or "brassica" match by id prefix or tag.
		if strings.HasPrefix(b.ID, slug+"-") || strings.HasPrefix(b.ID, slug) && len(slug) >= 4 {
			return true
		}
		for _, tag := range b.Tags {
			if tag == slug {
				return true
			}
		}
	}
	return false
}
