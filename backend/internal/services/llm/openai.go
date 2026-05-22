package llm

import (
	"context"
	"errors"

	"github.com/suwit/sprite-cutter/internal/config"
)

type openaiClient struct {
	cfg config.LLMConfig
}

func newOpenAI(cfg config.LLMConfig) *openaiClient {
	return &openaiClient{cfg: cfg}
}

func (c *openaiClient) Generate(ctx context.Context, prompt string) (string, error) {
	if c.cfg.APIKey == "" {
		return "", errors.New("LLM_API_KEY not set")
	}
	// TODO Phase 2: call https://api.openai.com/v1/chat/completions with c.cfg.Model.
	return "", errors.New("openai provider: not implemented")
}
