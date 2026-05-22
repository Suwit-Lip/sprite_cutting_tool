// Package python invokes the Python engine scripts as subprocesses.
//
// Contract with each script:
//   - args: just the script path; no positional args.
//   - stdin: a single JSON document with all inputs. Using stdin instead of
//     argv avoids Windows argv-encoding issues with non-ASCII paths.
//   - stdout: a single JSON document. The Go side unmarshals it into the
//     caller-supplied target.
//   - stderr: free-form log lines (passed through to slog on failure).
//   - exit 0 on success; non-zero on failure.
package python

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
)

type Runner struct {
	bin       string
	engineDir string
}

func New(bin, engineDir string) *Runner {
	return &Runner{bin: bin, engineDir: engineDir}
}

// Run executes engineDir/<script>, piping input as JSON on stdin and decoding
// the script's stdout JSON into out.
func (r *Runner) Run(ctx context.Context, script string, input, out any) error {
	scriptPath := filepath.Join(r.engineDir, script)

	cmd := exec.CommandContext(ctx, r.bin, scriptPath)
	cmd.Env = append(os.Environ(), "PYTHONUTF8=1", "PYTHONIOENCODING=utf-8")

	if input != nil {
		payload, err := json.Marshal(input)
		if err != nil {
			return fmt.Errorf("%s: encode stdin: %w", script, err)
		}
		cmd.Stdin = bytes.NewReader(payload)
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		slog.Error("python script failed",
			"script", script,
			"stderr", stderr.String(),
			"err", err)
		return fmt.Errorf("%s: %s: %w", script, stderr.String(), err)
	}

	if out == nil {
		return nil
	}
	if err := json.Unmarshal(stdout.Bytes(), out); err != nil {
		return fmt.Errorf("%s: decode stdout: %w", script, err)
	}
	return nil
}
