package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sort"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/suwit/sprite-cutter/internal/models"
)

type promptHandler struct {
	d  Deps
	mu sync.Mutex
}

func (h *promptHandler) load() ([]models.PromptRecord, error) {
	data, err := os.ReadFile(h.d.Config.Prompts)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []models.PromptRecord{}, nil
		}
		return nil, err
	}
	var arr []models.PromptRecord
	if err := json.Unmarshal(data, &arr); err != nil {
		return nil, err
	}
	return arr, nil
}

func (h *promptHandler) save(records []models.PromptRecord) error {
	data, err := json.MarshalIndent(records, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(h.d.Config.Prompts, data, 0o644)
}

func (h *promptHandler) generate(c *fiber.Ctx) error {
	var body struct {
		Image       string `json:"image"`
		InputPrompt string `json:"inputPrompt"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	composed := fmt.Sprintf(
		"ช่วยคิด prompt สำหรับ ChatGPT โดยใช้ %s โดยที่ %s",
		h.d.Config.LLM.DefaultPrompt,
		body.InputPrompt,
	)
	ctx, cancel := context.WithTimeout(c.UserContext(), 60*time.Second)
	defer cancel()
	result, err := h.d.LLM.Generate(ctx, composed)
	if err != nil {
		return fmt.Errorf("llm: %w", err)
	}
	return c.JSON(fiber.Map{"prompt": result})
}

func (h *promptHandler) saveRecord(c *fiber.Ctx) error {
	var body struct {
		Image       string `json:"image"`
		InputPrompt string `json:"inputPrompt"`
		Prompt      string `json:"prompt"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	records, err := h.load()
	if err != nil {
		return err
	}
	record := models.PromptRecord{
		ID:          newID(),
		Image:       body.Image,
		InputPrompt: body.InputPrompt,
		Prompt:      body.Prompt,
		CreatedAt:   time.Now().UTC().Format(time.RFC3339),
	}
	records = append(records, record)
	if err := h.save(records); err != nil {
		return err
	}
	return c.JSON(record)
}

func (h *promptHandler) list(c *fiber.Ctx) error {
	h.mu.Lock()
	defer h.mu.Unlock()
	records, err := h.load()
	if err != nil {
		return err
	}
	sort.Slice(records, func(i, j int) bool { return records[i].CreatedAt > records[j].CreatedAt })
	return c.JSON(fiber.Map{"prompts": records})
}

func (h *promptHandler) delete(c *fiber.Ctx) error {
	id := c.Params("id")
	h.mu.Lock()
	defer h.mu.Unlock()
	records, err := h.load()
	if err != nil {
		return err
	}
	filtered := records[:0]
	found := false
	for _, r := range records {
		if r.ID == id {
			found = true
			continue
		}
		filtered = append(filtered, r)
	}
	if !found {
		return fiber.NewError(fiber.StatusNotFound, "prompt not found")
	}
	if err := h.save(filtered); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"deleted": id})
}
