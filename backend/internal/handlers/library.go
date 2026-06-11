package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/piotrekg/gardening/backend/internal/plantlib"
)

type LibraryHandler struct {
	lib *plantlib.Library
}

func NewLibraryHandler(lib *plantlib.Library) *LibraryHandler { return &LibraryHandler{lib: lib} }

func (h *LibraryHandler) Search(c *gin.Context) {
	page := intQuery(c, "page", 1)
	pageSize := intQuery(c, "page_size", 20)
	plants, total := h.lib.Search(
		c.Query("search"), c.Query("category"), c.Query("lifecycle"), page, pageSize)
	c.JSON(http.StatusOK, gin.H{
		"plants":    plants,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *LibraryHandler) Categories(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"categories": h.lib.Categories()})
}

func (h *LibraryHandler) Get(c *gin.Context) {
	plant, ok := h.lib.Get(c.Param("id"))
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "plant not found in library"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"plant": plant})
}

func (h *LibraryHandler) Companions(c *gin.Context) {
	plant, ok := h.lib.Get(c.Param("id"))
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "plant not found in library"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"companions":  h.lib.Resolve(plant.CompanionPlants),
		"antagonists": h.lib.Resolve(plant.AntagonistPlants),
	})
}
