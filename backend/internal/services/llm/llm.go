// Package llm is a pluggable client for prompt generation.
//
// Add a provider by implementing Provider and wiring it in New().
package llm

import (
	"context"
	"fmt"

	"github.com/suwit/sprite-cutter/internal/config"
)

type Provider interface {
	Generate(ctx context.Context, prompt string) (string, error)
}

func New(cfg config.LLMConfig) (Provider, error) {
	switch cfg.Provider {
	case "openai", "":
		return newOpenAI(cfg), nil
	case "gemini":
		return newGemini(cfg), nil
	default:
		return nil, fmt.Errorf("unknown LLM provider %q", cfg.Provider)
	}
}
