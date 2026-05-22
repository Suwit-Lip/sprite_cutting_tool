package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"sync"
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

type LLMConfig struct {
	Provider      string // "openai" | "gemini"
	APIKey        string
	Model         string
	DefaultPrompt string
}

func Load() (*Config, error) {
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
			Provider:      getenv("LLM_PROVIDER", "gemini"),
			APIKey:        os.Getenv("LLM_API_KEY"),
			Model:         getenv("LLM_MODEL", "gemini-2.5-flash"),
			DefaultPrompt: os.Getenv("LLM_DEFAULT_PROMPT"),
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

func resolveEngineDir() string {
	// Prefer ./engine relative to the binary; fall back to cwd/engine.
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
