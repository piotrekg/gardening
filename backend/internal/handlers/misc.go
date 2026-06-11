package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/piotrekg/gardening/backend/internal/auth"
	"github.com/piotrekg/gardening/backend/internal/plantlib"
	"github.com/piotrekg/gardening/backend/internal/repository"
	"github.com/piotrekg/gardening/backend/internal/service"
)

type PhotoHandler struct {
	svc *service.PhotoService
}

func NewPhotoHandler(svc *service.PhotoService) *PhotoHandler { return &PhotoHandler{svc: svc} }

func (h *PhotoHandler) Upload(c *gin.Context) {
	file, err := c.FormFile("photo")
	if err != nil {
		badRequest(c, "multipart field 'photo' is required")
		return
	}
	photo, err := h.svc.Upload(auth.UserID(c), c.Param("gardenId"), c.Param("plantId"), file)
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"photo": photo})
}

func (h *PhotoHandler) List(c *gin.Context) {
	photos, err := h.svc.List(auth.UserID(c), c.Param("gardenId"), c.Param("plantId"))
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"photos": photos})
}

func (h *PhotoHandler) Delete(c *gin.Context) {
	err := h.svc.Delete(auth.UserID(c), c.Param("gardenId"), c.Param("plantId"), c.Param("photoId"))
	if err != nil {
		fail(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

type DashboardHandler struct {
	svc *service.DashboardService
}

func NewDashboardHandler(svc *service.DashboardService) *DashboardHandler {
	return &DashboardHandler{svc: svc}
}

func (h *DashboardHandler) Get(c *gin.Context) {
	d, err := h.svc.Build(auth.UserID(c))
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, d)
}

type CalendarHandler struct {
	svc *service.CalendarService
}

func NewCalendarHandler(svc *service.CalendarService) *CalendarHandler {
	return &CalendarHandler{svc: svc}
}

func (h *CalendarHandler) Get(c *gin.Context) {
	now := time.Now()
	cal, err := h.svc.Build(auth.UserID(c), intQuery(c, "month", int(now.Month())), intQuery(c, "year", now.Year()))
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, cal)
}

type NotificationHandler struct {
	svc *service.NotificationService
}

func NewNotificationHandler(svc *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{svc: svc}
}

func (h *NotificationHandler) List(c *gin.Context) {
	ns, err := h.svc.Unread(auth.UserID(c))
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"notifications": ns, "unread_count": len(ns)})
}

func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	if err := h.svc.MarkAllRead(auth.UserID(c)); err != nil {
		fail(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

type HealthHandler struct {
	repo      *repository.Repository
	lib       *plantlib.Library
	startedAt time.Time
	version   string
}

func NewHealthHandler(repo *repository.Repository, lib *plantlib.Library, version string) *HealthHandler {
	return &HealthHandler{repo: repo, lib: lib, startedAt: time.Now(), version: version}
}

func (h *HealthHandler) Get(c *gin.Context) {
	dbStatus := "connected"
	status := "ok"
	code := http.StatusOK
	if err := h.repo.Ping(); err != nil {
		dbStatus = "error"
		status = "degraded"
		code = http.StatusServiceUnavailable
	}
	c.JSON(code, gin.H{
		"status":         status,
		"version":        h.version,
		"db":             dbStatus,
		"plant_library":  h.lib.Count(),
		"uptime_seconds": int(time.Since(h.startedAt).Seconds()),
	})
}
