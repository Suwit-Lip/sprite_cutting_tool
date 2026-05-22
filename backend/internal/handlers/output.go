package handlers

import (
	"archive/zip"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type outputHandler struct{ d Deps }

type outputItem struct {
	File string `json:"file"`
	URL  string `json:"url"`
	W    int    `json:"w"`
	H    int    `json:"h"`
}

type outputGroup struct {
	Name  string       `json:"name"`
	Count int          `json:"count"`
	Items []outputItem `json:"items"`
}

func (h *outputHandler) list(c *fiber.Ctx) error {
	dir := h.d.Config.OutputDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return c.JSON(fiber.Map{"groups": []any{}})
		}
		return fmt.Errorf("read output dir: %w", err)
	}
	groups := []outputGroup{}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		groupName := e.Name()
		groupDir := filepath.Join(dir, groupName)
		files, err := os.ReadDir(groupDir)
		if err != nil {
			continue
		}
		items := []outputItem{}
		for _, f := range files {
			if f.IsDir() {
				continue
			}
			ext := strings.ToLower(filepath.Ext(f.Name()))
			if _, ok := imageExts[ext]; !ok {
				continue
			}
			full := filepath.Join(groupDir, f.Name())
			w, hgt := decodeDimensions(full)
			items = append(items, outputItem{
				File: f.Name(),
				URL:  "/api/output/file/" + groupName + "/" + f.Name(),
				W:    w,
				H:    hgt,
			})
		}
		sort.Slice(items, func(i, j int) bool { return items[i].File < items[j].File })
		groups = append(groups, outputGroup{Name: groupName, Count: len(items), Items: items})
	}
	sort.Slice(groups, func(i, j int) bool { return groups[i].Name < groups[j].Name })
	return c.JSON(fiber.Map{"groups": groups})
}

func (h *outputHandler) serve(c *fiber.Ctx) error {
	group := c.Params("group")
	name := c.Params("name")
	full, err := safeJoinGroup(h.d.Config.OutputDir(), group, name)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.SendFile(full)
}

func (h *outputHandler) setFolder(c *fiber.Ctx) error {
	var body struct {
		Path string `json:"path"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	if body.Path == "" {
		return fiber.NewError(fiber.StatusBadRequest, "path required")
	}
	if st, err := os.Stat(body.Path); err != nil || !st.IsDir() {
		return fiber.NewError(fiber.StatusBadRequest, "folder not found")
	}
	h.d.Config.SetOutputDir(body.Path)
	return c.JSON(fiber.Map{"path": h.d.Config.OutputDir()})
}

func (h *outputHandler) zip(c *fiber.Ctx) error {
	var body struct {
		Group string   `json:"group"`
		Files []string `json:"files"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	if body.Group == "" {
		return fiber.NewError(fiber.StatusBadRequest, "group required")
	}
	groupDir, err := safeJoin(h.d.Config.OutputDir(), body.Group)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	files := body.Files
	if len(files) == 0 {
		entries, err := os.ReadDir(groupDir)
		if err != nil {
			return fmt.Errorf("read group: %w", err)
		}
		for _, e := range entries {
			if !e.IsDir() {
				files = append(files, e.Name())
			}
		}
	}

	c.Set("Content-Type", "application/zip")
	c.Set("Content-Disposition", `attachment; filename="`+body.Group+`.zip"`)

	zw := zip.NewWriter(c.Response().BodyWriter())
	defer zw.Close()

	for _, fname := range files {
		full, err := safeJoinGroup(h.d.Config.OutputDir(), body.Group, fname)
		if err != nil {
			continue
		}
		src, err := os.Open(full)
		if err != nil {
			continue
		}
		fw, err := zw.Create(fname)
		if err != nil {
			src.Close()
			continue
		}
		_, _ = io.Copy(fw, src)
		src.Close()
	}
	return nil
}

func (h *outputHandler) delete(c *fiber.Ctx) error {
	var body struct {
		Items []struct {
			Group string `json:"group"`
			File  string `json:"file"`
		} `json:"items"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	dir := h.d.Config.OutputDir()
	deleted := []map[string]string{}
	failed := []map[string]string{}
	for _, it := range body.Items {
		if it.File == "" {
			groupDir, err := safeJoin(dir, it.Group)
			if err != nil {
				failed = append(failed, map[string]string{"group": it.Group, "file": "", "reason": err.Error()})
				continue
			}
			if err := os.RemoveAll(groupDir); err != nil {
				failed = append(failed, map[string]string{"group": it.Group, "file": "", "reason": err.Error()})
				continue
			}
			deleted = append(deleted, map[string]string{"group": it.Group, "file": ""})
			continue
		}
		full, err := safeJoinGroup(dir, it.Group, it.File)
		if err != nil {
			failed = append(failed, map[string]string{"group": it.Group, "file": it.File, "reason": err.Error()})
			continue
		}
		if err := os.Remove(full); err != nil {
			failed = append(failed, map[string]string{"group": it.Group, "file": it.File, "reason": err.Error()})
			continue
		}
		deleted = append(deleted, map[string]string{"group": it.Group, "file": it.File})

		// If the group is now empty (or only manifest left), remove it entirely.
		groupDir := filepath.Join(dir, it.Group)
		if entries, err := os.ReadDir(groupDir); err == nil {
			hasImage := false
			for _, e := range entries {
				if e.IsDir() {
					continue
				}
				ext := strings.ToLower(filepath.Ext(e.Name()))
				if _, ok := imageExts[ext]; ok {
					hasImage = true
					break
				}
			}
			if !hasImage {
				_ = os.RemoveAll(groupDir)
			}
		}
	}
	return c.JSON(fiber.Map{"deleted": deleted, "failed": failed})
}
