package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	plantdata "github.com/piotrekg/gardening/backend/data/plants"
	"github.com/piotrekg/gardening/backend/internal/auth"
	"github.com/piotrekg/gardening/backend/migrations"
	"github.com/piotrekg/gardening/backend/internal/config"
	"github.com/piotrekg/gardening/backend/internal/handlers"
	"github.com/piotrekg/gardening/backend/internal/migrate"
	"github.com/piotrekg/gardening/backend/internal/plantlib"
	"github.com/piotrekg/gardening/backend/internal/repository"
	"github.com/piotrekg/gardening/backend/internal/service"
)

const version = "1.0.0"

func main() {
	if err := run(); err != nil {
		log.Fatalf("fatal: %v", err)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(cfg.DBPath), 0o755); err != nil {
		return fmt.Errorf("create db dir: %w", err)
	}

	db, err := gorm.Open(sqlite.Open(cfg.DBPath+"?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	if err := migrate.Up(sqlDB, migrations.FS); err != nil {
		return fmt.Errorf("migrations: %w", err)
	}
	log.Println("database migrations up to date")

	lib, err := plantlib.Load(cfg.PlantsPath, plantdata.PlantsJSON)
	if err != nil {
		return err
	}
	log.Printf("plant library loaded: %d plants", lib.Count())

	repo := repository.New(db)
	tm := auth.NewTokenManager(cfg.JWTSecret)

	authSvc := service.NewAuthService(repo, tm)
	gardenSvc := service.NewGardenService(repo, lib)
	plantSvc := service.NewPlantService(repo, lib)
	careSvc := service.NewCareService(repo)
	photoSvc := service.NewPhotoService(repo, cfg.UploadPath)
	dashSvc := service.NewDashboardService(repo, lib, plantSvc)
	calSvc := service.NewCalendarService(repo, lib, plantSvc)
	notifSvc := service.NewNotificationService(repo)

	router := handlers.NewRouter(handlers.Deps{
		TokenManager: tm,
		Auth:         handlers.NewAuthHandler(authSvc),
		Gardens:      handlers.NewGardenHandler(gardenSvc),
		Library:      handlers.NewLibraryHandler(lib),
		Plants:       handlers.NewPlantHandler(plantSvc, careSvc),
		Photos:       handlers.NewPhotoHandler(photoSvc),
		Dashboard:    handlers.NewDashboardHandler(dashSvc),
		Calendar:     handlers.NewCalendarHandler(calSvc),
		Notification: handlers.NewNotificationHandler(notifSvc),
		Health:       handlers.NewHealthHandler(repo, lib, version),
		UploadDir:    cfg.UploadPath,
		FrontendDist: cfg.FrontendDist,
	})

	srv := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Printf("PlantDiary server v%s listening on %s", version, srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	select {
	case err := <-errCh:
		return err
	case sig := <-stop:
		log.Printf("received %s, shutting down", sig)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return srv.Shutdown(ctx)
}
