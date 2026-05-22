package handlers

import "github.com/gofiber/fiber/v2"

type cutHandler struct{ d Deps }

func (h *cutHandler) analyze(c *fiber.Ctx) error { return notImplemented(c) }
func (h *cutHandler) preview(c *fiber.Ctx) error { return notImplemented(c) }
func (h *cutHandler) execute(c *fiber.Ctx) error { return notImplemented(c) }
