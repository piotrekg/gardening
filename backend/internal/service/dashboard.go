package service

import (
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/piotrekg/gardening/backend/internal/models"
	"github.com/piotrekg/gardening/backend/internal/plantlib"
	"github.com/piotrekg/gardening/backend/internal/repository"
)

type DashboardStats struct {
	GardenCount         int   `json:"garden_count"`
	PlantCount          int64 `json:"plant_count"`
	CareActionsThisWeek int64 `json:"care_actions_this_week"`
}

type Dashboard struct {
	OverdueWater        []*models.PlantInstance `json:"overdue_water"`
	OverdueFertilize    []*models.PlantInstance `json:"overdue_fertilize"`
	DueToday            []*models.PlantInstance `json:"due_today"`
	SowThisMonth        []*plantlib.Plant       `json:"sow_this_month"`
	TransplantThisMonth []*plantlib.Plant       `json:"transplant_this_month"`
	UpcomingHarvests    []*models.PlantInstance `json:"upcoming_harvests"`
	RecentCare          []models.CareLogEntry   `json:"recent_care"`
	Stats               DashboardStats          `json:"stats"`
}

type DashboardService struct {
	repo   *repository.Repository
	lib    *plantlib.Library
	plants *PlantService
}

func NewDashboardService(repo *repository.Repository, lib *plantlib.Library, plants *PlantService) *DashboardService {
	return &DashboardService{repo: repo, lib: lib, plants: plants}
}

// Build assembles the dashboard and, as a side effect mandated by the spec,
// generates daily-deduplicated notifications for badly overdue plants.
func (s *DashboardService) Build(userID string) (*Dashboard, error) {
	d := &Dashboard{
		OverdueWater:     []*models.PlantInstance{},
		OverdueFertilize: []*models.PlantInstance{},
		DueToday:         []*models.PlantInstance{},
		UpcomingHarvests: []*models.PlantInstance{},
		RecentCare:       []models.CareLogEntry{},
	}

	gardens, err := s.repo.GardensByUser(userID)
	if err != nil {
		return nil, err
	}
	gardenNames := map[string]string{}
	for _, g := range gardens {
		gardenNames[g.ID] = g.Name
	}
	d.Stats.GardenCount = len(gardens)

	instances, err := s.repo.ActivePlantsByUser(userID)
	if err != nil {
		return nil, err
	}
	d.Stats.PlantCount = int64(len(instances))

	now := time.Now()
	thisMonth := int(now.Month())
	nextMonth := thisMonth%12 + 1

	for i := range instances {
		p := &instances[i]
		s.plants.Enrich(p)
		p.GardenName = gardenNames[p.GardenID]
		if p.CareStatus.Water == "overdue" {
			d.OverdueWater = append(d.OverdueWater, p)
		}
		if p.CareStatus.Fertilize == "overdue" {
			d.OverdueFertilize = append(d.OverdueFertilize, p)
		}
		if p.CareStatus.Water == "due_today" || p.CareStatus.Fertilize == "due_today" {
			d.DueToday = append(d.DueToday, p)
		}
		if p.PlantLibraryID != nil {
			if lp, ok := s.lib.Get(*p.PlantLibraryID); ok {
				for _, m := range lp.HarvestMonths {
					if m == thisMonth || m == nextMonth {
						d.UpcomingHarvests = append(d.UpcomingHarvests, p)
						break
					}
				}
			}
		}
		s.maybeNotify(userID, p, now)
	}

	d.SowThisMonth = s.lib.SowableIn(thisMonth)
	d.TransplantThisMonth = s.lib.TransplantableIn(thisMonth)

	recent, err := s.repo.RecentCareByUser(userID, 5)
	if err != nil {
		return nil, err
	}
	nameByInstance := map[string]string{}
	gardenByInstance := map[string]string{}
	for i := range instances {
		nameByInstance[instances[i].ID] = instances[i].DisplayName
		gardenByInstance[instances[i].ID] = instances[i].GardenName
	}
	for i := range recent {
		recent[i].PlantName = nameByInstance[recent[i].PlantInstanceID]
		recent[i].GardenName = gardenByInstance[recent[i].PlantInstanceID]
	}
	d.RecentCare = recent

	weekAgo := now.AddDate(0, 0, -7)
	if d.Stats.CareActionsThisWeek, err = s.repo.CareCountSince(userID, weekAgo); err != nil {
		return nil, err
	}
	return d, nil
}

// maybeNotify creates an overdue_water notification when a plant has gone more
// than 2x its watering frequency without water, at most once per plant per day.
func (s *DashboardService) maybeNotify(userID string, p *models.PlantInstance, now time.Time) {
	if p.PlantLibraryID == nil {
		return
	}
	lp, ok := s.lib.Get(*p.PlantLibraryID)
	if !ok || lp.WaterFrequencyDays <= 0 {
		return
	}
	ref := p.LastWateredAt
	if ref == nil {
		ref = p.PlantedDate
	}
	if ref == nil {
		return
	}
	if now.Sub(*ref) <= time.Duration(2*lp.WaterFrequencyDays)*24*time.Hour {
		return
	}
	dayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	exists, err := s.repo.HasNotificationToday(userID, p.ID, "overdue_water", dayStart)
	if err != nil || exists {
		return
	}
	days := int(now.Sub(*ref).Hours() / 24)
	// Notification creation is best-effort; dashboard rendering must not fail on it.
	_ = s.repo.CreateNotification(&models.Notification{
		ID:              uuid.NewString(),
		UserID:          userID,
		PlantInstanceID: &p.ID,
		Type:            "overdue_water",
		Message:         fmt.Sprintf("%s has not been watered for %d days (needs water every %d days)", p.DisplayName, days, lp.WaterFrequencyDays),
	})
}
