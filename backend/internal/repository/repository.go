// Package repository is the only layer that talks to the database.
package repository

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/piotrekg/gardening/backend/internal/models"
)

var ErrNotFound = errors.New("not found")

type Repository struct {
	db *gorm.DB
}

func New(db *gorm.DB) *Repository { return &Repository{db: db} }

func translate(err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrNotFound
	}
	return err
}

// --- users ---

func (r *Repository) CreateUser(u *models.User) error { return r.db.Create(u).Error }

func (r *Repository) UserByEmail(email string) (*models.User, error) {
	var u models.User
	if err := r.db.Where("email = ?", email).First(&u).Error; err != nil {
		return nil, translate(err)
	}
	return &u, nil
}

func (r *Repository) UserByID(id string) (*models.User, error) {
	var u models.User
	if err := r.db.First(&u, "id = ?", id).Error; err != nil {
		return nil, translate(err)
	}
	return &u, nil
}

// --- refresh tokens ---

func (r *Repository) CreateRefreshToken(t *models.RefreshToken) error { return r.db.Create(t).Error }

func (r *Repository) RefreshTokenByHash(hash string) (*models.RefreshToken, error) {
	var t models.RefreshToken
	if err := r.db.Where("token_hash = ?", hash).First(&t).Error; err != nil {
		return nil, translate(err)
	}
	return &t, nil
}

func (r *Repository) RevokeRefreshToken(id string) error {
	now := time.Now()
	return r.db.Model(&models.RefreshToken{}).Where("id = ?", id).Update("revoked_at", &now).Error
}

func (r *Repository) DeleteExpiredRefreshTokens() error {
	return r.db.Where("expires_at < ?", time.Now()).Delete(&models.RefreshToken{}).Error
}

// --- gardens ---

func (r *Repository) CreateGarden(g *models.Garden) error { return r.db.Create(g).Error }

func (r *Repository) GardensByUser(userID string) ([]models.Garden, error) {
	var gs []models.Garden
	err := r.db.Where("user_id = ?", userID).Order("created_at").Find(&gs).Error
	return gs, err
}

func (r *Repository) GardenByID(userID, id string) (*models.Garden, error) {
	var g models.Garden
	if err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&g).Error; err != nil {
		return nil, translate(err)
	}
	return &g, nil
}

func (r *Repository) SaveGarden(g *models.Garden) error { return r.db.Save(g).Error }

func (r *Repository) SoftDeleteGarden(userID, id string) error {
	res := r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Garden{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) PlantCountByGarden(gardenID string) (int64, error) {
	var n int64
	err := r.db.Model(&models.PlantInstance{}).
		Where("garden_id = ? AND status = ?", gardenID, "active").Count(&n).Error
	return n, err
}

// --- plant instances ---

func (r *Repository) CreatePlantInstance(p *models.PlantInstance) error { return r.db.Create(p).Error }

func (r *Repository) PlantsByGarden(gardenID string) ([]models.PlantInstance, error) {
	var ps []models.PlantInstance
	err := r.db.Where("garden_id = ?", gardenID).Order("created_at").Find(&ps).Error
	return ps, err
}

func (r *Repository) ActivePlantsByUser(userID string) ([]models.PlantInstance, error) {
	var ps []models.PlantInstance
	err := r.db.Where("user_id = ? AND status = ?", userID, "active").Find(&ps).Error
	return ps, err
}

func (r *Repository) PlantInstanceByID(userID, gardenID, id string) (*models.PlantInstance, error) {
	var p models.PlantInstance
	if err := r.db.Where("id = ? AND garden_id = ? AND user_id = ?", id, gardenID, userID).
		First(&p).Error; err != nil {
		return nil, translate(err)
	}
	return &p, nil
}

func (r *Repository) SavePlantInstance(p *models.PlantInstance) error { return r.db.Save(p).Error }

func (r *Repository) SoftDeletePlantInstance(userID, gardenID, id string) error {
	res := r.db.Where("id = ? AND garden_id = ? AND user_id = ?", id, gardenID, userID).
		Delete(&models.PlantInstance{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) PlantCountByUser(userID string) (int64, error) {
	var n int64
	err := r.db.Model(&models.PlantInstance{}).
		Where("user_id = ? AND status = ?", userID, "active").Count(&n).Error
	return n, err
}

// --- care log ---

func (r *Repository) CreateCareLog(e *models.CareLogEntry) error { return r.db.Create(e).Error }

func (r *Repository) CareLogByPlant(plantID string, page, pageSize int) ([]models.CareLogEntry, int64, error) {
	var total int64
	q := r.db.Model(&models.CareLogEntry{}).Where("plant_instance_id = ?", plantID)
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var es []models.CareLogEntry
	err := q.Order("timestamp DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&es).Error
	return es, total, err
}

func (r *Repository) RecentCareByUser(userID string, limit int) ([]models.CareLogEntry, error) {
	var es []models.CareLogEntry
	err := r.db.Where("user_id = ?", userID).Order("timestamp DESC").Limit(limit).Find(&es).Error
	return es, err
}

func (r *Repository) CareCountSince(userID string, since time.Time) (int64, error) {
	var n int64
	err := r.db.Model(&models.CareLogEntry{}).
		Where("user_id = ? AND timestamp >= ?", userID, since).Count(&n).Error
	return n, err
}

// --- photos ---

func (r *Repository) CreatePhoto(p *models.Photo) error { return r.db.Create(p).Error }

func (r *Repository) PhotosByPlant(plantID string) ([]models.Photo, error) {
	var ps []models.Photo
	err := r.db.Where("plant_instance_id = ?", plantID).Order("created_at DESC").Find(&ps).Error
	return ps, err
}

func (r *Repository) PhotoByID(userID, id string) (*models.Photo, error) {
	var p models.Photo
	if err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&p).Error; err != nil {
		return nil, translate(err)
	}
	return &p, nil
}

func (r *Repository) DeletePhoto(id string) error {
	return r.db.Delete(&models.Photo{}, "id = ?", id).Error
}

// --- notifications ---

func (r *Repository) CreateNotification(n *models.Notification) error { return r.db.Create(n).Error }

func (r *Repository) UnreadNotifications(userID string) ([]models.Notification, error) {
	var ns []models.Notification
	err := r.db.Where("user_id = ? AND read_at IS NULL", userID).
		Order("created_at DESC").Find(&ns).Error
	return ns, err
}

// HasNotificationToday reports whether a notification of the given type already
// exists today for the plant, to de-duplicate daily reminders.
func (r *Repository) HasNotificationToday(userID, plantInstanceID, ntype string, dayStart time.Time) (bool, error) {
	var n int64
	err := r.db.Model(&models.Notification{}).
		Where("user_id = ? AND plant_instance_id = ? AND type = ? AND created_at >= ?",
			userID, plantInstanceID, ntype, dayStart).
		Count(&n).Error
	return n > 0, err
}

func (r *Repository) MarkAllNotificationsRead(userID string) error {
	now := time.Now()
	return r.db.Model(&models.Notification{}).
		Where("user_id = ? AND read_at IS NULL", userID).
		Update("read_at", &now).Error
}

// Ping verifies database connectivity for the health endpoint.
func (r *Repository) Ping() error {
	sqlDB, err := r.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Ping()
}
