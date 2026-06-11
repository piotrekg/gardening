package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/piotrekg/gardening/backend/internal/auth"
	"github.com/piotrekg/gardening/backend/internal/service"
)

type PlantHandler struct {
	svc  *service.PlantService
	care *service.CareService
}

func NewPlantHandler(svc *service.PlantService, care *service.CareService) *PlantHandler {
	return &PlantHandler{svc: svc, care: care}
}

func (h *PlantHandler) Add(c *gin.Context) {
	var in service.PlantInput
	if err := c.ShouldBindJSON(&in); err != nil {
		badRequest(c, "invalid request body")
		return
	}
	p, err := h.svc.Add(auth.UserID(c), c.Param("gardenId"), in)
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"plant": p})
}

func (h *PlantHandler) List(c *gin.Context) {
	plants, err := h.svc.List(auth.UserID(c), c.Param("gardenId"))
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"plants": plants})
}

func (h *PlantHandler) Get(c *gin.Context) {
	p, recent, err := h.svc.Get(auth.UserID(c), c.Param("gardenId"), c.Param("id"))
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"plant": p, "recent_care": recent})
}

func (h *PlantHandler) Update(c *gin.Context) {
	var in service.PlantInput
	if err := c.ShouldBindJSON(&in); err != nil {
		badRequest(c, "invalid request body")
		return
	}
	p, err := h.svc.Update(auth.UserID(c), c.Param("gardenId"), c.Param("id"), in)
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"plant": p})
}

func (h *PlantHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(auth.UserID(c), c.Param("gardenId"), c.Param("id")); err != nil {
		fail(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *PlantHandler) Compatibility(c *gin.Context) {
	conflicts, err := h.svc.Compatibility(auth.UserID(c), c.Param("gardenId"))
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"conflicts": conflicts})
}

// --- care log ---

func (h *PlantHandler) LogCare(c *gin.Context) {
	var in service.CareInput
	if err := c.ShouldBindJSON(&in); err != nil {
		badRequest(c, "invalid request body")
		return
	}
	entry, err := h.care.Log(auth.UserID(c), c.Param("gardenId"), c.Param("plantId"), in)
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"entry": entry})
}

func (h *PlantHandler) CareHistory(c *gin.Context) {
	page := intQuery(c, "page", 1)
	pageSize := intQuery(c, "page_size", 20)
	entries, total, err := h.care.History(auth.UserID(c), c.Param("gardenId"), c.Param("plantId"), page, pageSize)
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"entries":   entries,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}
