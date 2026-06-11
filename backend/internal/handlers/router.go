package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/piotrekg/gardening/backend/internal/auth"
)

type Deps struct {
	TokenManager *auth.TokenManager
	Auth         *AuthHandler
	Gardens      *GardenHandler
	Library      *LibraryHandler
	Plants       *PlantHandler
	Photos       *PhotoHandler
	Dashboard    *DashboardHandler
	Calendar     *CalendarHandler
	Notification *NotificationHandler
	Health       *HealthHandler
	UploadDir    string
	FrontendDist string
}

// NewRouter wires every route. The backend also serves uploaded files and,
// when FrontendDist is set, the built SPA with an index.html fallback.
func NewRouter(d Deps) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.MaxMultipartMemory = 16 << 20

	api := r.Group("/api")
	api.GET("/health", d.Health.Get)

	authGroup := api.Group("/auth")
	{
		authGroup.POST("/register", d.Auth.Register)
		authGroup.POST("/login", d.Auth.Login)
		authGroup.POST("/refresh", d.Auth.Refresh)
		authGroup.POST("/logout", d.Auth.Logout)
		authGroup.GET("/me", auth.Middleware(d.TokenManager), d.Auth.Me)
	}

	protected := api.Group("", auth.Middleware(d.TokenManager))
	{
		protected.POST("/gardens", d.Gardens.Create)
		protected.GET("/gardens", d.Gardens.List)
		protected.GET("/gardens/:gardenId", wrapID(d.Gardens.Get))
		protected.PUT("/gardens/:gardenId", wrapID(d.Gardens.Update))
		protected.DELETE("/gardens/:gardenId", wrapID(d.Gardens.Delete))
		protected.GET("/gardens/:gardenId/compatibility", d.Plants.Compatibility)

		protected.POST("/gardens/:gardenId/plants", d.Plants.Add)
		protected.GET("/gardens/:gardenId/plants", d.Plants.List)
		protected.GET("/gardens/:gardenId/plants/:plantId", wrapPlantID(d.Plants.Get))
		protected.PUT("/gardens/:gardenId/plants/:plantId", wrapPlantID(d.Plants.Update))
		protected.DELETE("/gardens/:gardenId/plants/:plantId", wrapPlantID(d.Plants.Delete))

		protected.POST("/gardens/:gardenId/plants/:plantId/care", d.Plants.LogCare)
		protected.GET("/gardens/:gardenId/plants/:plantId/care", d.Plants.CareHistory)

		protected.POST("/gardens/:gardenId/plants/:plantId/photos", d.Photos.Upload)
		protected.GET("/gardens/:gardenId/plants/:plantId/photos", d.Photos.List)
		protected.DELETE("/gardens/:gardenId/plants/:plantId/photos/:photoId", d.Photos.Delete)

		protected.GET("/plants/library", d.Library.Search)
		protected.GET("/plants/library/categories", d.Library.Categories)
		protected.GET("/plants/library/:id", d.Library.Get)
		protected.GET("/plants/library/:id/companions", d.Library.Companions)

		protected.GET("/dashboard", d.Dashboard.Get)
		protected.GET("/calendar", d.Calendar.Get)
		protected.GET("/notifications", d.Notification.List)
		protected.POST("/notifications/read", d.Notification.MarkAllRead)
	}

	r.Static("/uploads", d.UploadDir)

	if d.FrontendDist != "" {
		registerSPA(r, d.FrontendDist)
	}
	return r
}

// wrapID adapts handlers written against :id to routes that use :gardenId,
// keeping route param names consistent across the nested groups (gin requires
// a single wildcard name per path position).
func wrapID(h gin.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Params = append(c.Params, gin.Param{Key: "id", Value: c.Param("gardenId")})
		h(c)
	}
}

func wrapPlantID(h gin.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Params = append(c.Params, gin.Param{Key: "id", Value: c.Param("plantId")})
		h(c)
	}
}

// registerSPA serves the built frontend with an index.html fallback for client routes.
func registerSPA(r *gin.Engine, dist string) {
	index := filepath.Join(dist, "index.html")
	if _, err := os.Stat(index); err != nil {
		return // dist not present; API-only mode
	}
	r.Static("/assets", filepath.Join(dist, "assets"))
	for _, f := range []string{"favicon.ico", "favicon.svg", "robots.txt", "manifest.webmanifest"} {
		p := filepath.Join(dist, f)
		if _, err := os.Stat(p); err == nil {
			r.StaticFile("/"+f, p)
		}
	}
	r.GET("/", func(c *gin.Context) { c.File(index) })
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/api/") || strings.HasPrefix(path, "/uploads/") {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.File(index)
	})
}
