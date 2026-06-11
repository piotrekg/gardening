package service

import (
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp" // register webp decoder

	"github.com/piotrekg/gardening/backend/internal/models"
	"github.com/piotrekg/gardening/backend/internal/repository"
)

const (
	MaxPhotoSize  = 10 << 20 // 10 MB
	thumbMaxEdge  = 400
	thumbJPEGQual = 82
)

var allowedExt = map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}

type PhotoService struct {
	repo      *repository.Repository
	uploadDir string
}

func NewPhotoService(repo *repository.Repository, uploadDir string) *PhotoService {
	return &PhotoService{repo: repo, uploadDir: uploadDir}
}

func (s *PhotoService) decorate(p *models.Photo) {
	base := "/uploads/" + p.UserID + "/" + p.PlantInstanceID + "/"
	p.URL = base + p.Filename
	p.ThumbURL = base + p.ThumbFilename
}

// Upload stores the original file under uploads/{user}/{plant}/ and writes a
// thumbnail (max 400x400, JPEG) alongside it using pure-Go image packages.
func (s *PhotoService) Upload(userID, gardenID, plantID string, file *multipart.FileHeader) (*models.Photo, error) {
	plant, err := s.repo.PlantInstanceByID(userID, gardenID, plantID)
	if err != nil {
		return nil, err
	}
	if file.Size > MaxPhotoSize {
		return nil, Invalid("file exceeds the 10MB limit")
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedExt[ext] {
		return nil, Invalid("only jpg, png and webp files are accepted")
	}

	src, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()

	dir := filepath.Join(s.uploadDir, userID, plant.ID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}

	id := uuid.NewString()
	origName := id + ext
	origPath := filepath.Join(dir, origName)
	out, err := os.Create(origPath)
	if err != nil {
		return nil, err
	}
	written, err := io.Copy(out, io.LimitReader(src, MaxPhotoSize+1))
	out.Close()
	if err != nil {
		os.Remove(origPath)
		return nil, err
	}
	if written > MaxPhotoSize {
		os.Remove(origPath)
		return nil, Invalid("file exceeds the 10MB limit")
	}

	thumbName, err := s.makeThumbnail(origPath, dir, id)
	if err != nil {
		os.Remove(origPath)
		return nil, Invalid("file is not a valid image: %v", err)
	}

	photo := &models.Photo{
		ID:              id,
		PlantInstanceID: plant.ID,
		UserID:          userID,
		Filename:        origName,
		ThumbFilename:   thumbName,
		FileSize:        written,
	}
	if err := s.repo.CreatePhoto(photo); err != nil {
		os.Remove(origPath)
		os.Remove(filepath.Join(dir, thumbName))
		return nil, err
	}
	s.decorate(photo)
	return photo, nil
}

// makeThumbnail decodes the stored original and writes {id}_thumb.{jpg|png}.
// WebP originals get a JPEG thumbnail since Go has no pure-Go webp encoder.
func (s *PhotoService) makeThumbnail(origPath, dir, id string) (string, error) {
	f, err := os.Open(origPath)
	if err != nil {
		return "", err
	}
	defer f.Close()
	img, format, err := image.Decode(f)
	if err != nil {
		return "", fmt.Errorf("decode: %w", err)
	}

	bounds := img.Bounds()
	w, h := bounds.Dx(), bounds.Dy()
	if w <= 0 || h <= 0 {
		return "", fmt.Errorf("empty image")
	}
	scale := 1.0
	if w > thumbMaxEdge || h > thumbMaxEdge {
		if w > h {
			scale = float64(thumbMaxEdge) / float64(w)
		} else {
			scale = float64(thumbMaxEdge) / float64(h)
		}
	}
	tw := int(float64(w) * scale)
	th := int(float64(h) * scale)
	if tw < 1 {
		tw = 1
	}
	if th < 1 {
		th = 1
	}
	thumb := image.NewRGBA(image.Rect(0, 0, tw, th))
	draw.CatmullRom.Scale(thumb, thumb.Bounds(), img, bounds, draw.Over, nil)

	thumbExt := ".jpg"
	if format == "png" {
		thumbExt = ".png"
	}
	thumbName := id + "_thumb" + thumbExt
	out, err := os.Create(filepath.Join(dir, thumbName))
	if err != nil {
		return "", err
	}
	defer out.Close()
	if thumbExt == ".png" {
		err = png.Encode(out, thumb)
	} else {
		err = jpeg.Encode(out, thumb, &jpeg.Options{Quality: thumbJPEGQual})
	}
	if err != nil {
		return "", err
	}
	return thumbName, nil
}

func (s *PhotoService) List(userID, gardenID, plantID string) ([]models.Photo, error) {
	plant, err := s.repo.PlantInstanceByID(userID, gardenID, plantID)
	if err != nil {
		return nil, err
	}
	photos, err := s.repo.PhotosByPlant(plant.ID)
	if err != nil {
		return nil, err
	}
	for i := range photos {
		s.decorate(&photos[i])
	}
	return photos, nil
}

func (s *PhotoService) Delete(userID, gardenID, plantID, photoID string) error {
	if _, err := s.repo.PlantInstanceByID(userID, gardenID, plantID); err != nil {
		return err
	}
	photo, err := s.repo.PhotoByID(userID, photoID)
	if err != nil {
		return err
	}
	if photo.PlantInstanceID != plantID {
		return repository.ErrNotFound
	}
	if err := s.repo.DeletePhoto(photo.ID); err != nil {
		return err
	}
	dir := filepath.Join(s.uploadDir, userID, plantID)
	// File removal is best-effort; the DB row is the source of truth.
	os.Remove(filepath.Join(dir, photo.Filename))
	os.Remove(filepath.Join(dir, photo.ThumbFilename))
	return nil
}
