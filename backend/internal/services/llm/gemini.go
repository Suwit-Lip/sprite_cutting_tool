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

type geminiClient struct {
	cfg  config.LLMConfig
	http *http.Client
}

func newGemini(cfg config.LLMConfig) *geminiClient {
	return &geminiClient{cfg: cfg, http: &http.Client{}}
}

type geminiReq struct {
	Contents []geminiContent `json:"contents"`
}

type geminiContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiResp struct {
	Candidates []struct {
		Content geminiContent `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (c *geminiClient) Generate(ctx context.Context, prompt string) (string, error) {
	if c.cfg.APIKey == "" {
		return "", errors.New("LLM_API_KEY not set")
	}
	model := c.cfg.Model
	if model == "" {
		model = "gemini-2.5-flash"
	}
	url := fmt.Sprintf(
		"https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
		model, c.cfg.APIKey,
	)
	body := geminiReq{
		Contents: []geminiContent{{Parts: []geminiPart{{Text: prompt}}}},
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	var parsed geminiResp
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", fmt.Errorf("decode gemini response: %w (body=%s)", err, string(raw))
	}
	if parsed.Error != nil {
		return "", fmt.Errorf("gemini error %d: %s", parsed.Error.Code, parsed.Error.Message)
	}
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("gemini status %d: %s", resp.StatusCode, string(raw))
	}
	if len(parsed.Candidates) == 0 || len(parsed.Candidates[0].Content.Parts) == 0 {
		return "", errors.New("gemini: empty response")
	}
	return parsed.Candidates[0].Content.Parts[0].Text, nil
}
