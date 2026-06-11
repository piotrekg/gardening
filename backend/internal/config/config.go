package config

import (
	"fmt"
	"log"
	"net/url"
	"os"
	"strconv"
)

type Config struct {
	Port         int
	DatabaseURL  string
	UploadPath   string
	JWTSecret    string
	FrontendDist string
}

// Load reads configuration from the environment. The database connection is a
// PostgreSQL DSN: either DATABASE_URL directly, or assembled from the discrete
// DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME/DB_SSLMODE variables.
func Load() (*Config, error) {
	cfg := &Config{
		Port:         envInt("PORT", 8080),
		DatabaseURL:  databaseURL(),
		UploadPath:   envStr("UPLOAD_PATH", "./data/uploads"),
		JWTSecret:    os.Getenv("JWT_SECRET"),
		FrontendDist: os.Getenv("FRONTEND_DIST"),
	}
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET environment variable is required")
	}
	if cfg.JWTSecret == "CHANGE_THIS_SECRET_BEFORE_USE" && os.Getenv("GIN_MODE") == "release" {
		return nil, fmt.Errorf("JWT_SECRET must be changed from the placeholder value in release mode")
	}
	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL (or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME) is required")
	}
	if err := os.MkdirAll(cfg.UploadPath, 0o755); err != nil {
		return nil, fmt.Errorf("create upload dir: %w", err)
	}
	return cfg, nil
}

func databaseURL() string {
	if u := os.Getenv("DATABASE_URL"); u != "" {
		return u
	}
	host := os.Getenv("DB_HOST")
	if host == "" {
		return ""
	}
	user := envStr("DB_USER", "plantdiary")
	pass := os.Getenv("DB_PASSWORD")
	name := envStr("DB_NAME", "plantdiary")
	port := envStr("DB_PORT", "5432")
	sslmode := envStr("DB_SSLMODE", "disable")
	return (&url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword(user, pass),
		Host:     fmt.Sprintf("%s:%s", host, port),
		Path:     "/" + name,
		RawQuery: "sslmode=" + sslmode,
	}).String()
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
