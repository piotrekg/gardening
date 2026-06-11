package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
)

type Config struct {
	Port         int
	DBPath       string
	UploadPath   string
	JWTSecret    string
	FrontendDist string
	PlantsPath   string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:         envInt("PORT", 8080),
		DBPath:       envStr("DB_PATH", "./data/plantdiary.db"),
		UploadPath:   envStr("UPLOAD_PATH", "./data/uploads"),
		JWTSecret:    os.Getenv("JWT_SECRET"),
		FrontendDist: os.Getenv("FRONTEND_DIST"),
		PlantsPath:   os.Getenv("PLANTS_PATH"),
	}
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET environment variable is required")
	}
	if cfg.JWTSecret == "CHANGE_THIS_SECRET_BEFORE_USE" && os.Getenv("GIN_MODE") == "release" {
		return nil, fmt.Errorf("JWT_SECRET must be changed from the placeholder value in release mode")
	}
	if err := os.MkdirAll(cfg.UploadPath, 0o755); err != nil {
		return nil, fmt.Errorf("create upload dir: %w", err)
	}
	return cfg, nil
}

func envStr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envInt(key string, def int) int {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		log.Printf("invalid %s=%q, using default %d", key, v, def)
		return def
	}
	return n
}
