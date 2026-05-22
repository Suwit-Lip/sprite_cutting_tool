package handlers

import (
	"errors"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/suwit/sprite-cutter/internal/models"
)

type inputHandler struct{ d Deps }

var imageExts = map[string]struct{}{
	".png":  {},
	".jpg":  {},
	".jpeg": {},
	".webp": {},
}

func (h *inputHandler) list(c *fiber.Ctx) error {
	dir := h.d.Config.InputDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return c.JSON(fiber.Map{"images": []any{}})
		}
		return fmt.Errorf("read input dir: %w", err)
	}
	images := make([]models.ImageInfo, 0, len(entries))
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		ext := strings.ToLower(filepath.Ext(e.Name()))
		if _, ok := imageExts[ext]; !ok {
			continue
		}
		full := filepath.Join(dir, e.Name())
		info, err := e.Info()
		if err != nil {
			continue
		}
		w, hgt := decodeDimensions(full)
		images = append(images, models.ImageInfo{
			Name:   e.Name(),
			Width:  w,
			Height: hgt,
			Size:   info.Size(),
			URL:    "/api/input/file/" + e.Name(),
		})
	}
	return c.JSON(fiber.Map{"images": images})
}

func (h *inputHandler) serve(c *fiber.Ctx) error {
	name := c.Params("name")
	full, err := safeJoin(h.d.Config.InputDir(), name)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.SendFile(full)
}

func (h *inputHandler) setFolder(c *fiber.Ctx) error {
	var body struct {
		Path string `json:"path"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	if body.Path == "" {
		return fiber.NewError(fiber.StatusBadRequest, "path required")
	}
	if st, err := os.Stat(body.Path); err != nil || !st.IsDir() {
		return fiber.NewError(fiber.StatusBadRequest, "folder not found")
	}
	h.d.Config.SetInputDir(body.Path)
	return c.JSON(fiber.Map{"path": h.d.Config.InputDir()})
}

func (h *inputHandler) upload(c *fiber.Ctx) error {
	dir := h.d.Config.InputDir()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("ensure dir: %w", err)
	}
	form, err := c.MultipartForm()
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	files := form.File["files"]
	maxBytes := int64(h.d.Config.MaxUploadMB) * 1024 * 1024
	uploaded := []models.ImageInfo{}
	skipped := []map[string]string{}
	for _, fh := range files {
		if fh.Size > maxBytes {
			skipped = append(skipped, map[string]string{"name": fh.Filename, "reason": "too large"})
			continue
		}
		src, err := fh.Open()
		if err != nil {
			skipped = append(skipped, map[string]string{"name": fh.Filename, "reason": "open: " + err.Error()})
			continue
		}
		head := make([]byte, 512)
		n, _ := io.ReadFull(src, head)
		ct := http.DetectContentType(head[:n])
		if !strings.HasPrefix(ct, "image/") {
			src.Close()
			skipped = append(skipped, map[string]string{"name": fh.Filename, "reason": "not an image (" + ct + ")"})
			continue
		}
		if _, err := src.Seek(0, io.SeekStart); err != nil {
			src.Close()
			skipped = append(skipped, map[string]string{"name": fh.Filename, "reason": "seek: " + err.Error()})
			continue
		}
		name := uniqueName(dir, filepath.Base(fh.Filename))
		full, err := safeJoin(dir, name)
		if err != nil {
			src.Close()
			skipped = append(skipped, map[string]string{"name": fh.Filename, "reason": err.Error()})
			continue
		}
		dst, err := os.Create(full)
		if err != nil {
			src.Close()
			skipped = append(skipped, map[string]string{"name": fh.Filename, "reason": err.Error()})
			continue
		}
		if _, err := io.Copy(dst, src); err != nil {
			src.Close()
			dst.Close()
			os.Remove(full)
			skipped = append(skipped, map[string]string{"name": fh.Filename, "reason": err.Error()})
			continue
		}
		src.Close()
		dst.Close()
		w, hgt := decodeDimensions(full)
		st, _ := os.Stat(full)
		uploaded = append(uploaded, models.ImageInfo{
			Name:   name,
			Width:  w,
			Height: hgt,
			Size:   st.Size(),
			URL:    "/api/input/file/" + name,
		})
	}
	return c.JSON(fiber.Map{"uploaded": uploaded, "skipped": skipped})
}

func (h *inputHandler) delete(c *fiber.Ctx) error {
	var body struct {
		Names []string `json:"names"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	dir := h.d.Config.InputDir()
	deleted := []string{}
	failed := []map[string]string{}
	for _, name := range body.Names {
		full, err := safeJoin(dir, name)
		if err != nil {
			failed = append(failed, map[string]string{"name": name, "reason": err.Error()})
			continue
		}
		if err := os.Remove(full); err != nil {
			failed = append(failed, map[string]string{"name": name, "reason": err.Error()})
			continue
		}
		deleted = append(deleted, name)
	}
	return c.JSON(fiber.Map{"deleted": deleted, "failed": failed})
}

func decodeDimensions(path string) (int, int) {
	f, err := os.Open(path)
	if err != nil {
		return 0, 0
	}
	defer f.Close()
	cfg, _, err := image.DecodeConfig(f)
	if err != nil {
		return 0, 0
	}
	return cfg.Width, cfg.Height
}

func uniqueName(dir, name string) string {
	full := filepath.Join(dir, name)
	if _, err := os.Stat(full); errors.Is(err, os.ErrNotExist) {
		return name
	}
	ext := filepath.Ext(name)
	stem := strings.TrimSuffix(name, ext)
	for i := 1; i < 10_000; i++ {
		candidate := fmt.Sprintf("%s_%d%s", stem, i, ext)
		if _, err := os.Stat(filepath.Join(dir, candidate)); errors.Is(err, os.ErrNotExist) {
			return candidate
		}
	}
	return name
}
