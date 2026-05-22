package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/suwit/sprite-cutter/internal/config"
)

type openaiClient struct {
	cfg  config.LLMConfig
	http *http.Client
}

func newOpenAI(cfg config.LLMConfig) *openaiClient {
	return &openaiClient{cfg: cfg, http: &http.Client{}}
}

type openaiReq struct {
	Model    string          `json:"model"`
	Messages []openaiMessage `json:"messages"`
}

type openaiMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openaiResp struct {
	Choices []struct {
		Message openaiMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (c *openaiClient) Generate(ctx context.Context, prompt string) (string, error) {
	if c.cfg.APIKey == "" {
		return "", errors.New("OpenAI API key not set — set OPENAI_API_KEY in .env (next to the binary or in the project root)")
	}
	model := c.cfg.Model
	if model == "" {
		model = "gpt-4.1-nano"
	}
	body := openaiReq{
		Model: model,
		Messages: []openaiMessage{
			{Role: "user", Content: prompt},
		},
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.openai.com/v1/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.cfg.APIKey)
	resp, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	var parsed openaiResp
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", fmt.Errorf("decode openai response: %w (body=%s)", err, string(raw))
	}
	if parsed.Error != nil {
		return "", fmt.Errorf("openai error: %s", parsed.Error.Message)
	}
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("openai status %d: %s", resp.StatusCode, string(raw))
	}
	if len(parsed.Choices) == 0 {
		return "", errors.New("openai: empty response")
	}
	return parsed.Choices[0].Message.Content, nil
}
