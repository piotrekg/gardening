package service

import (
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/piotrekg/gardening/backend/internal/auth"
	"github.com/piotrekg/gardening/backend/internal/models"
	"github.com/piotrekg/gardening/backend/internal/repository"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrEmailTaken         = errors.New("email already registered")
	ErrInvalidRefresh     = errors.New("invalid or expired refresh token")
)

type ValidationError struct{ Msg string }

func (e *ValidationError) Error() string { return e.Msg }

func Invalid(format string, args ...any) error {
	return &ValidationError{Msg: fmt.Sprintf(format, args...)}
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}

type AuthService struct {
	repo *repository.Repository
	tm   *auth.TokenManager
}

func NewAuthService(repo *repository.Repository, tm *auth.TokenManager) *AuthService {
	return &AuthService{repo: repo, tm: tm}
}

func ValidatePassword(pw string) error {
	if len(pw) < 8 {
		return Invalid("password must be at least 8 characters")
	}
	var hasUpper, hasDigit bool
	for _, r := range pw {
		if unicode.IsUpper(r) {
			hasUpper = true
		}
		if unicode.IsDigit(r) {
			hasDigit = true
		}
	}
	if !hasUpper || !hasDigit {
		return Invalid("password must contain at least one uppercase letter and one number")
	}
	return nil
}

func (s *AuthService) Register(email, password, name string) (*models.User, *TokenPair, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	name = strings.TrimSpace(name)
	if email == "" || !strings.Contains(email, "@") {
		return nil, nil, Invalid("a valid email is required")
	}
	if name == "" {
		return nil, nil, Invalid("name is required")
	}
	if err := ValidatePassword(password); err != nil {
		return nil, nil, err
	}
	if _, err := s.repo.UserByEmail(email); err == nil {
		return nil, nil, ErrEmailTaken
	} else if !errors.Is(err, repository.ErrNotFound) {
		return nil, nil, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, nil, err
	}
	user := &models.User{ID: uuid.NewString(), Email: email, PasswordHash: string(hash), Name: name}
	if err := s.repo.CreateUser(user); err != nil {
		return nil, nil, err
	}
	pair, err := s.issuePair(user)
	return user, pair, err
}

func (s *AuthService) Login(email, password string) (*models.User, *TokenPair, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	user, err := s.repo.UserByEmail(email)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, nil, ErrInvalidCredentials
		}
		return nil, nil, err
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)) != nil {
		return nil, nil, ErrInvalidCredentials
	}
	pair, err := s.issuePair(user)
	return user, pair, err
}

// Refresh rotates the refresh token: the presented token is revoked and a new pair issued.
func (s *AuthService) Refresh(rawToken string) (*TokenPair, error) {
	stored, err := s.repo.RefreshTokenByHash(auth.HashToken(rawToken))
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrInvalidRefresh
		}
		return nil, err
	}
	if stored.RevokedAt != nil || time.Now().After(stored.ExpiresAt) {
		return nil, ErrInvalidRefresh
	}
	user, err := s.repo.UserByID(stored.UserID)
	if err != nil {
		return nil, ErrInvalidRefresh
	}
	if err := s.repo.RevokeRefreshToken(stored.ID); err != nil {
		return nil, err
	}
	return s.issuePair(user)
}

func (s *AuthService) Logout(rawToken string) error {
	stored, err := s.repo.RefreshTokenByHash(auth.HashToken(rawToken))
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil // already invalid; logout is idempotent
		}
		return err
	}
	return s.repo.RevokeRefreshToken(stored.ID)
}

func (s *AuthService) Me(userID string) (*models.User, error) {
	return s.repo.UserByID(userID)
}

func (s *AuthService) issuePair(user *models.User) (*TokenPair, error) {
	access, err := s.tm.NewAccessToken(user.ID, user.Email)
	if err != nil {
		return nil, err
	}
	raw, hash, err := auth.NewRefreshToken()
	if err != nil {
		return nil, err
	}
	rt := &models.RefreshToken{
		ID:        uuid.NewString(),
		UserID:    user.ID,
		TokenHash: hash,
		ExpiresAt: time.Now().Add(auth.RefreshTokenTTL),
	}
	if err := s.repo.CreateRefreshToken(rt); err != nil {
		return nil, err
	}
	// Opportunistic cleanup keeps the table small; failure is harmless.
	_ = s.repo.DeleteExpiredRefreshTokens()
	return &TokenPair{
		AccessToken:  access,
		RefreshToken: raw,
		ExpiresIn:    int(auth.AccessTokenTTL.Seconds()),
	}, nil
}
