package config

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"sync"

	"github.com/joho/godotenv"
)

type Config struct {
	Port string

	mu        sync.RWMutex
	inputDir  string
	outputDir string

	Prompts string
	Presets string

	PythonBin string
	EngineDir string

	MaxUploadMB int

	LLM LLMConfig
}

type LLMConfig struct {
	Provider      string // "gemini" | "openai"
	APIKey        string
	Model         string
	DefaultPrompt string
}

func (c *Config) InputDir() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.inputDir
}

func (c *Config) OutputDir() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.outputDir
}

func (c *Config) SetInputDir(p string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.inputDir = filepath.Clean(p)
}

func (c *Config) SetOutputDir(p string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.outputDir = filepath.Clean(p)
}

func Load() (*Config, error) {
	// .env is optional — env vars set in the actual environment take priority.
	envPath := loadDotenv()
	if envPath != "" {
		slog.Info("loaded env file", "path", envPath)
	} else {
		slog.Warn("no .env file found",
			"hint", "create one from .env.example next to the binary or in the project root")
	}

	provider := getenv("LLM_PROVIDER", "gemini")
	apiKey := pickAPIKey(provider)
	model := getenv("LLM_MODEL", defaultModel(provider))
	defaultPrompt := resolveDefaultPrompt()

	slog.Info("llm configured",
		"provider", provider,
		"model", model,
		"has_key", apiKey != "",
		"default_prompt_len", len(defaultPrompt),
	)

	cfg := &Config{
		Port:        getenv("PORT", "8080"),
		inputDir:    filepath.Clean(getenv("INPUT_DIR", `D:\Game Asset\input`)),
		outputDir:   filepath.Clean(getenv("OUTPUT_DIR", `D:\Game Asset\output`)),
		Prompts:     filepath.Clean(getenv("PROMPTS_FILE", `D:\Game Asset\prompts.json`)),
		Presets:     filepath.Clean(getenv("PRESETS_FILE", `D:\Game Asset\presets.json`)),
		PythonBin:   getenv("PYTHON_BIN", defaultPython()),
		EngineDir:   resolveEngineDir(),
		MaxUploadMB: getenvInt("MAX_UPLOAD_MB", 50),
		LLM: LLMConfig{
			Provider:      provider,
			APIKey:        apiKey,
			Model:         model,
			DefaultPrompt: defaultPrompt,
		},
	}

	if cfg.MaxUploadMB <= 0 {
		return nil, fmt.Errorf("MAX_UPLOAD_MB must be positive, got %d", cfg.MaxUploadMB)
	}
	return cfg, nil
}

func (c *Config) MaxUploadBytes() int {
	return c.MaxUploadMB * 1024 * 1024
}

// pickAPIKey returns the provider-specific key, falling back to LLM_API_KEY
// for backward compat. Supports having both keys configured simultaneously.
func pickAPIKey(provider string) string {
	switch provider {
	case "gemini":
		if v := os.Getenv("GEMINI_API_KEY"); v != "" {
			return v
		}
	case "openai":
		if v := os.Getenv("OPENAI_API_KEY"); v != "" {
			return v
		}
	}
	return os.Getenv("LLM_API_KEY")
}

func defaultModel(provider string) string {
	switch provider {
	case "openai":
		return "gpt-4.1-nano"
	default:
		return "gemini-2.5-flash"
	}
}

// resolveDefaultPrompt: prefer file content (LLM_DEFAULT_PROMPT_FILE) over
// the inline env var (LLM_DEFAULT_PROMPT). Env files don't handle long
// multi-line strings well — point at a file instead.
func resolveDefaultPrompt() string {
	if path := os.Getenv("LLM_DEFAULT_PROMPT_FILE"); path != "" {
		data, err := os.ReadFile(path)
		if err == nil {
			return string(data)
		}
	}
	return os.Getenv("LLM_DEFAULT_PROMPT")
}

func getenv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func getenvInt(key string, fallback int) int {
	v, ok := os.LookupEnv(key)
	if !ok || v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func defaultPython() string {
	if _, err := os.Stat("/usr/bin/python3"); err == nil {
		return "python3"
	}
	return "python"
}

// loadDotenv searches the binary's directory and the cwd (plus parents) for
// a .env file. This makes the binary work both when launched from any folder
// and when invoked via `go run` during dev. Returns the path that was loaded,
// or "" if none.
func loadDotenv() string {
	candidates := []string{}
	if exe, err := os.Executable(); err == nil {
		candidates = append(candidates, filepath.Join(filepath.Dir(exe), ".env"))
	}
	if wd, err := os.Getwd(); err == nil {
		for i := 0; i < 5; i++ {
			candidates = append(candidates, filepath.Join(wd, ".env"))
			parent := filepath.Dir(wd)
			if parent == wd {
				break
			}
			wd = parent
		}
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			if err := godotenv.Load(c); err == nil {
				return c
			}
		}
	}
	return ""
}

func resolveEngineDir() string {
	exe, err := os.Executable()
	if err == nil {
		candidate := filepath.Join(filepath.Dir(exe), "engine")
		if st, err := os.Stat(candidate); err == nil && st.IsDir() {
			return candidate
		}
	}
	wd, err := os.Getwd()
	if err != nil {
		return "engine"
	}
	return filepath.Join(wd, "engine")
}
