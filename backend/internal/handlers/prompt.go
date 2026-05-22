package handlers

import "github.com/gofiber/fiber/v2"

type promptHandler struct{ d Deps }

func (h *promptHandler) generate(c *fiber.Ctx) error { return notImplemented(c) }
func (h *promptHandler) save(c *fiber.Ctx) error     { return notImplemented(c) }
func (h *promptHandler) list(c *fiber.Ctx) error     { return notImplemented(c) }
func (h *promptHandler) delete(c *fiber.Ctx) error   { return notImplemented(c) }
