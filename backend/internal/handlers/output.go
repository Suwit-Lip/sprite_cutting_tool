package handlers

import "github.com/gofiber/fiber/v2"

type outputHandler struct{ d Deps }

func (h *outputHandler) list(c *fiber.Ctx) error      { return notImplemented(c) }
func (h *outputHandler) serve(c *fiber.Ctx) error     { return notImplemented(c) }
func (h *outputHandler) zip(c *fiber.Ctx) error       { return notImplemented(c) }
func (h *outputHandler) setFolder(c *fiber.Ctx) error { return notImplemented(c) }
func (h *outputHandler) delete(c *fiber.Ctx) error    { return notImplemented(c) }
