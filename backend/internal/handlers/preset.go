package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sync"

	"github.com/gofiber/fiber/v2"

	"github.com/suwit/sprite-cutter/internal/models"
)

type presetHandler struct {
	d  Deps
	mu sync.Mutex
}

func (h *presetHandler) load() ([]models.Preset, error) {
	data, err := os.ReadFile(h.d.Config.Presets)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []models.Preset{}, nil
		}
		return nil, err
	}
	var arr []models.Preset
	if err := json.Unmarshal(data, &arr); err != nil {
		return nil, err
	}
	return arr, nil
}

func (h *presetHandler) save(presets []models.Preset) error {
	data, err := json.MarshalIndent(presets, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(h.d.Config.Presets, data, 0o644)
}

func (h *presetHandler) list(c *fiber.Ctx) error {
	h.mu.Lock()
	defer h.mu.Unlock()
	presets, err := h.load()
	if err != nil {
		return fmt.Errorf("load presets: %w", err)
	}
	return c.JSON(fiber.Map{"presets": presets})
}

func (h *presetHandler) saveOne(c *fiber.Ctx) error {
	var body struct {
		Name   string           `json:"name"`
		Params models.CutParams `json:"params"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	if body.Name == "" {
		return fiber.NewError(fiber.StatusBadRequest, "name required")
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	presets, err := h.load()
	if err != nil {
		return err
	}
	preset := models.Preset{ID: newID(), Name: body.Name, Params: body.Params}
	presets = append(presets, preset)
	if err := h.save(presets); err != nil {
		return err
	}
	return c.JSON(preset)
}

func (h *presetHandler) delete(c *fiber.Ctx) error {
	id := c.Params("id")
	h.mu.Lock()
	defer h.mu.Unlock()
	presets, err := h.load()
	if err != nil {
		return err
	}
	filtered := presets[:0]
	found := false
	for _, p := range presets {
		if p.ID == id {
			found = true
			continue
		}
		filtered = append(filtered, p)
	}
	if !found {
		return fiber.NewError(fiber.StatusNotFound, "preset not found")
	}
	if err := h.save(filtered); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"deleted": id})
}

func newID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
