package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID           string    `gorm:"primaryKey" json:"id"`
	Email        string    `gorm:"uniqueIndex" json:"email"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type RefreshToken struct {
	ID        string     `gorm:"primaryKey" json:"id"`
	UserID    string     `gorm:"index" json:"user_id"`
	TokenHash string     `gorm:"uniqueIndex" json:"-"`
	ExpiresAt time.Time  `json:"expires_at"`
	RevokedAt *time.Time `json:"revoked_at"`
	CreatedAt time.Time  `json:"created_at"`
}

func (RefreshToken) TableName() string { return "refresh_tokens" }

type Garden struct {
	ID           string         `gorm:"primaryKey" json:"id"`
	UserID       string         `gorm:"index" json:"user_id"`
	Name         string         `json:"name"`
	Description  string         `json:"description"`
	LocationType string         `json:"location_type"`
	AreaSqm      *float64       `json:"area_sqm"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	PlantCount int64 `gorm:"-" json:"plant_count"`
}

type PlantInstance struct {
	ID               string         `gorm:"primaryKey" json:"id"`
	GardenID         string         `gorm:"index" json:"garden_id"`
	UserID           string         `gorm:"index" json:"user_id"`
	PlantLibraryID   *string        `json:"plant_library_id"`
	CustomName       *string        `json:"custom_name"`
	PlantedDate      *time.Time     `json:"planted_date"`
	Quantity         int            `json:"quantity"`
	LocationNotes    string         `json:"location_notes"`
	Status           string         `json:"status"`
	LastWateredAt    *time.Time     `json:"last_watered_at"`
	LastFertilizedAt *time.Time     `json:"last_fertilized_at"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`

	DisplayName string      `gorm:"-" json:"display_name"`
	CareStatus  *CareStatus `gorm:"-" json:"care_status,omitempty"`
	Library     any         `gorm:"-" json:"library,omitempty"`
	GardenName  string      `gorm:"-" json:"garden_name,omitempty"`
}

func (PlantInstance) TableName() string { return "plant_instances" }

// CareStatus values: overdue, due_today, ok, unknown.
type CareStatus struct {
	Water     string `json:"water"`
	Fertilize string `json:"fertilize"`
}

type CareLogEntry struct {
	ID                string    `gorm:"primaryKey" json:"id"`
	PlantInstanceID   string    `gorm:"index" json:"plant_instance_id"`
	UserID            string    `gorm:"index" json:"user_id"`
	Action            string    `json:"action"`
	Note              string    `json:"note"`
	QuantityHarvested *float64  `json:"quantity_harvested"`
	Timestamp         time.Time `json:"timestamp"`
	CreatedAt         time.Time `json:"created_at"`

	PlantName  string `gorm:"-" json:"plant_name,omitempty"`
	GardenName string `gorm:"-" json:"garden_name,omitempty"`
}

func (CareLogEntry) TableName() string { return "care_log" }

type Photo struct {
	ID              string    `gorm:"primaryKey" json:"id"`
	PlantInstanceID string    `gorm:"index" json:"plant_instance_id"`
	UserID          string    `gorm:"index" json:"user_id"`
	Filename        string    `json:"-"`
	ThumbFilename   string    `json:"-"`
	FileSize        int64     `json:"file_size"`
	CreatedAt       time.Time `json:"created_at"`

	URL      string `gorm:"-" json:"url"`
	ThumbURL string `gorm:"-" json:"thumb_url"`
}

type Notification struct {
	ID              string     `gorm:"primaryKey" json:"id"`
	UserID          string     `gorm:"index" json:"user_id"`
	PlantInstanceID *string    `json:"plant_instance_id"`
	Type            string     `json:"type"`
	Message         string     `json:"message"`
	ReadAt          *time.Time `json:"read_at"`
	CreatedAt       time.Time  `json:"created_at"`
}

// Valid enumerations used by validation layers.
var (
	ValidLocationTypes = map[string]bool{"indoor": true, "outdoor": true, "greenhouse": true}
	ValidPlantStatuses = map[string]bool{"active": true, "harvested": true, "removed": true, "dead": true}
	ValidCareActions   = map[string]bool{
		"watered": true, "fertilized": true, "pruned": true, "repotted": true,
		"treated": true, "observed": true, "harvested": true,
	}
)
