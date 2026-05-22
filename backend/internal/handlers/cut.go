package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/suwit/sprite-cutter/internal/models"
)

type cutHandler struct{ d Deps }

func (h *cutHandler) analyze(c *fiber.Ctx) error {
	var body struct {
		Image string `json:"image"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	imgPath, err := safeJoin(h.d.Config.InputDir(), body.Image)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	ctx, cancel := context.WithTimeout(c.UserContext(), 30*time.Second)
	defer cancel()
	var resp models.AnalyzeResponse
	if err := h.d.Python.Run(ctx, "analyze.py", []string{imgPath}, &resp); err != nil {
		return fmt.Errorf("analyze: %w", err)
	}
	return c.JSON(resp)
}

func (h *cutHandler) preview(c *fiber.Ctx) error {
	var body models.PreviewRequest
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	imgPath, err := safeJoin(h.d.Config.InputDir(), body.Image)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	paramsJSON, err := json.Marshal(body.Params)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(c.UserContext(), 30*time.Second)
	defer cancel()
	var resp models.PreviewResponse
	if err := h.d.Python.Run(ctx, "preview.py", []string{imgPath, string(paramsJSON)}, &resp); err != nil {
		return fmt.Errorf("preview: %w", err)
	}
	return c.JSON(resp)
}

func (h *cutHandler) execute(c *fiber.Ctx) error {
	var body models.CutRequest
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	imgPath, err := safeJoin(h.d.Config.InputDir(), body.Image)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	outDir := h.d.Config.OutputDir()
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return fmt.Errorf("ensure output dir: %w", err)
	}
	reqBlob, err := json.Marshal(struct {
		Params  models.CutParams `json:"params"`
		Exclude []int            `json:"exclude"`
		Merge   [][]int          `json:"merge"`
	}{body.Params, body.Exclude, body.Merge})
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(c.UserContext(), 5*time.Minute)
	defer cancel()
	var resp models.CutResponse
	if err := h.d.Python.Run(ctx, "cut.py", []string{imgPath, outDir, string(reqBlob)}, &resp); err != nil {
		return fmt.Errorf("cut: %w", err)
	}
	return c.JSON(resp)
}
