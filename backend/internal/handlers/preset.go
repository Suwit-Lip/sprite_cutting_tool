package handlers

import "github.com/gofiber/fiber/v2"

type presetHandler struct{ d Deps }

func (h *presetHandler) list(c *fiber.Ctx) error   { return notImplemented(c) }
func (h *presetHandler) save(c *fiber.Ctx) error   { return notImplemented(c) }
func (h *presetHandler) delete(c *fiber.Ctx) error { return notImplemented(c) }
