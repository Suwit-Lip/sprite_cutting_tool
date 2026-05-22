// Package handlers wires HTTP routes to their handler functions.
//
// Each resource (input/output/cut/preset/prompt/tileset) lives in its own
// file as a small struct with a *Deps receiver, so the test surface stays flat.
package handlers

import (
	"errors"
	"log/slog"

	"github.com/gofiber/fiber/v2"

	"github.com/suwit/sprite-cutter/internal/config"
	"github.com/suwit/sprite-cutter/internal/services/llm"
	"github.com/suwit/sprite-cutter/internal/services/python"
)

type Deps struct {
	Config *config.Config
	Python *python.Runner
	LLM    llm.Provider
}

func Register(app *fiber.App, d Deps) {
	api := app.Group("/api")

	input := &inputHandler{d: d}
	api.Get("/input/images", input.list)
	api.Get("/input/file/:name", input.serve)
	api.Post("/input/folder", input.setFolder)
	api.Post("/input/upload", input.upload)
	api.Post("/input/delete", input.delete)

	cut := &cutHandler{d: d}
	api.Post("/cut/analyze", cut.analyze)
	api.Post("/cut/preview", cut.preview)
	api.Post("/cut/execute", cut.execute)

	preset := &presetHandler{d: d}
	api.Get("/preset/list", preset.list)
	api.Post("/preset/save", preset.save)
	api.Delete("/preset/:id", preset.delete)

	output := &outputHandler{d: d}
	api.Get("/output/list", output.list)
	api.Get("/output/file/:group/:name", output.serve)
	api.Post("/output/zip", output.zip)
	api.Post("/output/folder", output.setFolder)
	api.Post("/output/delete", output.delete)

	prompt := &promptHandler{d: d}
	api.Post("/prompt/generate", prompt.generate)
	api.Post("/prompt/save", prompt.save)
	api.Get("/prompt/list", prompt.list)
	api.Delete("/prompt/:id", prompt.delete)

	tileset := &tilesetHandler{d: d}
	api.Post("/tileset/create", tileset.create)
}

// ErrorHandler is Fiber's central error renderer. It returns JSON for /api/*
// and Fiber's default for everything else.
func ErrorHandler(c *fiber.Ctx, err error) error {
	status := fiber.StatusInternalServerError
	var fe *fiber.Error
	if errors.As(err, &fe) {
		status = fe.Code
	}
	slog.Warn("request error", "path", c.Path(), "status", status, "err", err)
	return c.Status(status).JSON(fiber.Map{"error": err.Error()})
}
