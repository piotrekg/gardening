package service

import (
	"time"

	"github.com/google/uuid"

	"github.com/piotrekg/gardening/backend/internal/models"
	"github.com/piotrekg/gardening/backend/internal/repository"
)

type CareInput struct {
	Action            string     `json:"action"`
	Note              string     `json:"note"`
	QuantityHarvested *float64   `json:"quantity_harvested"`
	Timestamp         *time.Time `json:"timestamp"`
}

type CareService struct {
	repo *repository.Repository
}

func NewCareService(repo *repository.Repository) *CareService {
	return &CareService{repo: repo}
}

// Log records a care action and keeps the plant's last_watered_at /
// last_fertilized_at in sync (only moving them forward).
func (s *CareService) Log(userID, gardenID, plantID string, in CareInput) (*models.CareLogEntry, error) {
	if !models.ValidCareActions[in.Action] {
		return nil, Invalid("action must be one of watered, fertilized, pruned, repotted, treated, observed, harvested")
	}
	plant, err := s.repo.PlantInstanceByID(userID, gardenID, plantID)
	if err != nil {
		return nil, err
	}
	ts := time.Now()
	if in.Timestamp != nil {
		ts = *in.Timestamp
		if ts.After(time.Now().Add(time.Hour)) {
			return nil, Invalid("timestamp cannot be in the future")
		}
	}
	entry := &models.CareLogEntry{
		ID:              uuid.NewString(),
		PlantInstanceID: plant.ID,
		UserID:          userID,
		Action:          in.Action,
		Note:            in.Note,
		Timestamp:       ts,
	}
	if in.Action == "harvested" {
		entry.QuantityHarvested = in.QuantityHarvested
	}
	if err := s.repo.CreateCareLog(entry); err != nil {
		return nil, err
	}
	changed := false
	if in.Action == "watered" && (plant.LastWateredAt == nil || ts.After(*plant.LastWateredAt)) {
		plant.LastWateredAt = &ts
		changed = true
	}
	if in.Action == "fertilized" && (plant.LastFertilizedAt == nil || ts.After(*plant.LastFertilizedAt)) {
		plant.LastFertilizedAt = &ts
		changed = true
	}
	if changed {
		if err := s.repo.SavePlantInstance(plant); err != nil {
			return nil, err
		}
	}
	return entry, nil
}

func (s *CareService) History(userID, gardenID, plantID string, page, pageSize int) ([]models.CareLogEntry, int64, error) {
	if _, err := s.repo.PlantInstanceByID(userID, gardenID, plantID); err != nil {
		return nil, 0, err
	}
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return s.repo.CareLogByPlant(plantID, page, pageSize)
}
