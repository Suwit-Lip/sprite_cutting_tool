// Package python invokes the Python engine scripts as subprocesses.
//
// Contract with each script:
//   - args: positional path to the input image + a JSON blob with options.
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

// Run executes engineDir/<script> with the given args, JSON-decodes stdout into out.
func (r *Runner) Run(ctx context.Context, script string, args []string, out any) error {
	scriptPath := filepath.Join(r.engineDir, script)

	cmdArgs := append([]string{scriptPath}, args...)
	cmd := exec.CommandContext(ctx, r.bin, cmdArgs...)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		slog.Error("python script failed",
			"script", script,
			"stderr", stderr.String(),
			"err", err)
		return fmt.Errorf("%s: %w", script, err)
	}

	if out == nil {
		return nil
	}
	if err := json.Unmarshal(stdout.Bytes(), out); err != nil {
		return fmt.Errorf("%s: decode stdout: %w", script, err)
	}
	return nil
}
