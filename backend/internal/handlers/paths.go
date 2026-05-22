package handlers

import (
	"fmt"
	"path/filepath"
	"strings"
)

// safeJoin resolves name relative to root and verifies the result stays
// inside root. Returns an error on any traversal attempt or absolute path.
//
// Use this for every file operation that takes a name from the client.
func safeJoin(root, name string) (string, error) {
	if name == "" {
		return "", fmt.Errorf("empty name")
	}
	if filepath.IsAbs(name) || strings.ContainsAny(name, `/\`) {
		// We never accept subpaths from the client; names must be flat filenames
		// (group/file is split before reaching this helper).
		return "", fmt.Errorf("invalid name %q", name)
	}
	cleaned := filepath.Join(root, name)
	rel, err := filepath.Rel(root, cleaned)
	if err != nil || strings.HasPrefix(rel, "..") {
		return "", fmt.Errorf("path escapes root: %q", name)
	}
	return cleaned, nil
}

// safeJoinGroup is the two-segment variant for output files: <root>/<group>/<file>.
func safeJoinGroup(root, group, file string) (string, error) {
	dir, err := safeJoin(root, group)
	if err != nil {
		return "", err
	}
	if file == "" {
		return dir, nil
	}
	return safeJoin(dir, file)
}
