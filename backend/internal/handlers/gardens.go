package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/piotrekg/gardening/backend/internal/auth"
	"github.com/piotrekg/gardening/backend/internal/service"
)

type GardenHandler struct {
	svc *service.GardenService
}

func NewGardenHandler(svc *service.GardenService) *GardenHandler { return &GardenHandler{svc: svc} }

func (h *GardenHandler) Create(c *gin.Context) {
	var in service.GardenInput
	if err := c.ShouldBindJSON(&in); err != nil {
		badRequest(c, "invalid request body")
		return
	}
	g, err := h.svc.Create(auth.UserID(c), in)
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"garden": g})
}

func (h *GardenHandler) List(c *gin.Context) {
	gardens, err := h.svc.List(auth.UserID(c))
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"gardens": gardens})
}

func (h *GardenHandler) Get(c *gin.Context) {
	g, summary, err := h.svc.Get(auth.UserID(c), c.Param("id"))
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"garden": g, "health_summary": summary})
}

func (h *GardenHandler) Update(c *gin.Context) {
	var in service.GardenInput
	if err := c.ShouldBindJSON(&in); err != nil {
		badRequest(c, "invalid request body")
		return
	}
	g, err := h.svc.Update(auth.UserID(c), c.Param("id"), in)
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"garden": g})
}

func (h *GardenHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(auth.UserID(c), c.Param("id")); err != nil {
		fail(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
