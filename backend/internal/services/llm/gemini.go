package llm

import (
	"context"
	"errors"

	"github.com/suwit/sprite-cutter/internal/config"
)

type geminiClient struct {
	cfg config.LLMConfig
}

func newGemini(cfg config.LLMConfig) *geminiClient {
	return &geminiClient{cfg: cfg}
}

func (c *geminiClient) Generate(ctx context.Context, prompt string) (string, error) {
	if c.cfg.APIKey == "" {
		return "", errors.New("LLM_API_KEY not set")
	}
	// TODO Phase 2: call https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent.
	return "", errors.New("gemini provider: not implemented")
}
