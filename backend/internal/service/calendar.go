package service

import (
	"time"

	"github.com/piotrekg/gardening/backend/internal/models"
	"github.com/piotrekg/gardening/backend/internal/plantlib"
	"github.com/piotrekg/gardening/backend/internal/repository"
)

type GardenTasks struct {
	Sow        []*models.PlantInstance `json:"sow"`
	Transplant []*models.PlantInstance `json:"transplant"`
	Harvest    []*models.PlantInstance `json:"harvest"`
}

type Calendar struct {
	Month           int               `json:"month"`
	Year            int               `json:"year"`
	GardenTasks     GardenTasks       `json:"garden_tasks"`
	Recommendations []*plantlib.Plant `json:"recommendations"`
	FrostWarning    bool              `json:"frost_warning"`
	FrostNote       string            `json:"frost_note"`
}

type CalendarService struct {
	repo   *repository.Repository
	lib    *plantlib.Library
	plants *PlantService
}

func NewCalendarService(repo *repository.Repository, lib *plantlib.Library, plants *PlantService) *CalendarService {
	return &CalendarService{repo: repo, lib: lib, plants: plants}
}

// Build returns month tasks for the user's plants plus region-aware sowing
// recommendations. Poland zone 6a: last frost ~mid-April, first ~mid-October.
func (s *CalendarService) Build(userID string, month, year int) (*Calendar, error) {
	now := time.Now()
	if month < 1 || month > 12 {
		month = int(now.Month())
	}
	if year < 2000 || year > 2100 {
		year = now.Year()
	}
	cal := &Calendar{
		Month: month,
		Year:  year,
		GardenTasks: GardenTasks{
			Sow:        []*models.PlantInstance{},
			Transplant: []*models.PlantInstance{},
			Harvest:    []*models.PlantInstance{},
		},
		FrostWarning: month <= 4 || month >= 10,
		FrostNote:    "Last frost ~mid-April, first frost ~mid-October (PL zone 6a)",
	}

	gardens, err := s.repo.GardensByUser(userID)
	if err != nil {
		return nil, err
	}
	gardenNames := map[string]string{}
	for _, g := range gardens {
		gardenNames[g.ID] = g.Name
	}

	instances, err := s.repo.ActivePlantsByUser(userID)
	if err != nil {
		return nil, err
	}
	for i := range instances {
		p := &instances[i]
		if p.PlantLibraryID == nil {
			continue
		}
		lp, ok := s.lib.Get(*p.PlantLibraryID)
		if !ok {
			continue
		}
		s.plants.Enrich(p)
		p.GardenName = gardenNames[p.GardenID]
		if containsMonth(lp.SowMonths, month) {
			cal.GardenTasks.Sow = append(cal.GardenTasks.Sow, p)
		}
		if containsMonth(lp.TransplantMonths, month) {
			cal.GardenTasks.Transplant = append(cal.GardenTasks.Transplant, p)
		}
		if containsMonth(lp.HarvestMonths, month) {
			cal.GardenTasks.Harvest = append(cal.GardenTasks.Harvest, p)
		}
	}

	cal.Recommendations = s.lib.SowableIn(month)
	return cal, nil
}

func containsMonth(months []int, m int) bool {
	for _, x := range months {
		if x == m {
			return true
		}
	}
	return false
}
