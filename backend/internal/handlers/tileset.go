package handlers

import (
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
)

type tilesetHandler struct{ d Deps }

func (h *tilesetHandler) create(c *fiber.Ctx) error {
	var body struct {
		Files      []string                  `json:"files"`
		Mode       string                    `json:"mode"`
		CellSize   int                       `json:"cellSize"`
		Transforms map[string]map[string]any `json:"transforms"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	if len(body.Files) == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "files required")
	}
	if body.CellSize <= 0 {
		body.CellSize = 64
	}
	if body.Mode == "" {
		body.Mode = "floor"
	}
	ctx, cancel := context.WithTimeout(c.UserContext(), 2*time.Minute)
	defer cancel()
	var resp struct {
		File string `json:"file"`
		URL  string `json:"url"`
		Meta string `json:"meta"`
	}
	if err := h.d.Python.Run(ctx, "tileset.py", map[string]any{
		"outputRoot": h.d.Config.OutputDir(),
		"files":      body.Files,
		"mode":       body.Mode,
		"cellSize":   body.CellSize,
		"transforms": body.Transforms,
	}, &resp); err != nil {
		return fmt.Errorf("tileset: %w", err)
	}
	return c.JSON(resp)
}
