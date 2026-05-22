package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/suwit/sprite-cutter/internal/config"
	"github.com/suwit/sprite-cutter/internal/handlers"
	"github.com/suwit/sprite-cutter/internal/services/llm"
	"github.com/suwit/sprite-cutter/internal/services/python"
	"github.com/suwit/sprite-cutter/internal/static"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		slog.Error("load config", "err", err)
		os.Exit(1)
	}

	if err := run(cfg); err != nil && !errors.Is(err, http.ErrServerClosed) {
		slog.Error("server exited", "err", err)
		os.Exit(1)
	}
}

func run(cfg *config.Config) error {
	py := python.New(cfg.PythonBin, cfg.EngineDir)
	llmClient, err := llm.New(cfg.LLM)
	if err != nil {
		return err
	}

	app := fiber.New(fiber.Config{
		AppName:               "sprite-cutter",
		BodyLimit:             cfg.MaxUploadBytes(),
		DisableStartupMessage: true,
		ErrorHandler:          handlers.ErrorHandler,
	})

	handlers.Register(app, handlers.Deps{
		Config: cfg,
		Python: py,
		LLM:    llmClient,
	})
	static.Mount(app)

	addr := ":" + cfg.Port
	slog.Info("listening", "addr", addr, "input", cfg.InputDir, "output", cfg.OutputDir)

	errCh := make(chan error, 1)
	go func() { errCh <- app.Listen(addr) }()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-errCh:
		return err
	case <-stop:
		slog.Info("shutdown signal received")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return app.ShutdownWithContext(ctx)
	}
}
