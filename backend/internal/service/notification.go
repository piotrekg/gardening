package service

import (
	"github.com/piotrekg/gardening/backend/internal/models"
	"github.com/piotrekg/gardening/backend/internal/repository"
)

type NotificationService struct {
	repo *repository.Repository
}

func NewNotificationService(repo *repository.Repository) *NotificationService {
	return &NotificationService{repo: repo}
}

func (s *NotificationService) Unread(userID string) ([]models.Notification, error) {
	return s.repo.UnreadNotifications(userID)
}

func (s *NotificationService) MarkAllRead(userID string) error {
	return s.repo.MarkAllNotificationsRead(userID)
}
