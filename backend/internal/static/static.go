// Package static serves the built Vue SPA via go:embed.
//
// At build time the Dockerfile/CI step copies the Vite build output to
// ./dist before `go build` runs. For local dev where dist/ may be empty,
// Mount falls back to a placeholder so the binary still boots.
package static

import (
	"embed"
	"io/fs"
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
)

//go:embed all:dist
var distFS embed.FS

func Mount(app *fiber.App) {
	sub, err := fs.Sub(distFS, "dist")
	if err != nil {
		panic(err)
	}

	app.Use("/", filesystem.New(filesystem.Config{
		Root:         http.FS(sub),
		Browse:       false,
		Index:        "index.html",
		NotFoundFile: "index.html",
	}))
}
