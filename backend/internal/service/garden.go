package service

import (
	"strings"

	"github.com/google/uuid"

	"github.com/piotrekg/gardening/backend/internal/models"
	"github.com/piotrekg/gardening/backend/internal/plantlib"
	"github.com/piotrekg/gardening/backend/internal/repository"
)

type GardenInput struct {
	Name         *string  `json:"name"`
	Description  *string  `json:"description"`
	LocationType *string  `json:"location_type"`
	AreaSqm      *float64 `json:"area_sqm"`
}

type HealthSummary struct {
	OverdueWater     int `json:"overdue_water"`
	OverdueFertilize int `json:"overdue_fertilize"`
	DueToday         int `json:"due_today"`
	OK               int `json:"ok"`
	Total            int `json:"total"`
}

type GardenService struct {
	repo *repository.Repository
	lib  *plantlib.Library
}

func NewGardenService(repo *repository.Repository, lib *plantlib.Library) *GardenService {
	return &GardenService{repo: repo, lib: lib}
}

func (s *GardenService) Create(userID string, in GardenInput) (*models.Garden, error) {
	if in.Name == nil || strings.TrimSpace(*in.Name) == "" {
		return nil, Invalid("name is required")
	}
	g := &models.Garden{
		ID:           uuid.NewString(),
		UserID:       userID,
		Name:         strings.TrimSpace(*in.Name),
		LocationType: "outdoor",
		AreaSqm:      in.AreaSqm,
	}
	if in.Description != nil {
		g.Description = strings.TrimSpace(*in.Description)
	}
	if in.LocationType != nil {
		if !models.ValidLocationTypes[*in.LocationType] {
			return nil, Invalid("location_type must be indoor, outdoor or greenhouse")
		}
		g.LocationType = *in.LocationType
	}
	if err := s.repo.CreateGarden(g); err != nil {
		return nil, err
	}
	return g, nil
}

func (s *GardenService) List(userID string) ([]models.Garden, error) {
	gardens, err := s.repo.GardensByUser(userID)
	if err != nil {
		return nil, err
	}
	for i := range gardens {
		n, err := s.repo.PlantCountByGarden(gardens[i].ID)
		if err != nil {
			return nil, err
		}
		gardens[i].PlantCount = n
	}
	return gardens, nil
}

func (s *GardenService) Get(userID, id string) (*models.Garden, *HealthSummary, error) {
	g, err := s.repo.GardenByID(userID, id)
	if err != nil {
		return nil, nil, err
	}
	plants, err := s.repo.PlantsByGarden(g.ID)
	if err != nil {
		return nil, nil, err
	}
	sum := &HealthSummary{}
	for i := range plants {
		if plants[i].Status != "active" {
			continue
		}
		sum.Total++
		g.PlantCount++
		st := ComputeCareStatus(&plants[i], s.lib)
		switch {
		case st.Water == "overdue":
			sum.OverdueWater++
		case st.Water == "due_today":
			sum.DueToday++
		default:
			sum.OK++
		}
		if st.Fertilize == "overdue" {
			sum.OverdueFertilize++
		}
	}
	return g, sum, nil
}

func (s *GardenService) Update(userID, id string, in GardenInput) (*models.Garden, error) {
	g, err := s.repo.GardenByID(userID, id)
	if err != nil {
		return nil, err
	}
	if in.Name != nil {
		if strings.TrimSpace(*in.Name) == "" {
			return nil, Invalid("name cannot be empty")
		}
		g.Name = strings.TrimSpace(*in.Name)
	}
	if in.Description != nil {
		g.Description = strings.TrimSpace(*in.Description)
	}
	if in.LocationType != nil {
		if !models.ValidLocationTypes[*in.LocationType] {
			return nil, Invalid("location_type must be indoor, outdoor or greenhouse")
		}
		g.LocationType = *in.LocationType
	}
	if in.AreaSqm != nil {
		g.AreaSqm = in.AreaSqm
	}
	if err := s.repo.SaveGarden(g); err != nil {
		return nil, err
	}
	n, _ := s.repo.PlantCountByGarden(g.ID)
	g.PlantCount = n
	return g, nil
}

func (s *GardenService) Delete(userID, id string) error {
	return s.repo.SoftDeleteGarden(userID, id)
}
