package handlers

import (
	"github.com/gofiber/fiber/v2"
)

type inputHandler struct{ d Deps }

func (h *inputHandler) list(c *fiber.Ctx) error      { return notImplemented(c) }
func (h *inputHandler) serve(c *fiber.Ctx) error     { return notImplemented(c) }
func (h *inputHandler) setFolder(c *fiber.Ctx) error { return notImplemented(c) }
func (h *inputHandler) upload(c *fiber.Ctx) error    { return notImplemented(c) }
func (h *inputHandler) delete(c *fiber.Ctx) error    { return notImplemented(c) }

func notImplemented(c *fiber.Ctx) error {
	return fiber.NewError(fiber.StatusNotImplemented, "not implemented in Phase 0 scaffold")
}
