# Handoff: Sprite Cutter Tool

## Overview

**Sprite Cutter Tool** — a local web application for game-asset workflows. The
core job is to take a sprite sheet (one image with many objects on a white /
transparent background) and **automatically cut it into individual image
files**. Two helper modes round out the workspace: an AI-prompt generator (to
help the user describe what they want the next sheet to look like) and a
tileset maker (to lay out cut pieces into floor/wall sheets).

Single-user, runs locally, no auth. Designed Thai-first with English technical
vocabulary mixed in.

The full requirements live in [`briefs/01_UI_Design_Brief.md`](briefs/01_UI_Design_Brief.md).
Read it first — this README is the visual spec; the brief is the product spec.

---

## About the Design Files

The files under [`prototype/`](prototype/) are **design references**, not
production code. They are an HTML + React-via-Babel prototype that runs in a
single browser tab — multiple `<script type="text/babel">` files compiled at
load. That's how the design preview works; **don't ship this structure**.

Your job is to **recreate this design inside the target codebase's environment**
(the brief calls for Vue 3 — use it, with whatever component library you
choose, or hand-roll components). Re-use the codebase's existing patterns for
state, routing, i18n, and theming. Treat the prototype as the source of truth
for **what** to build, not for **how to organize code**.

If no codebase exists yet: pick Vue 3 (per the brief) + Tailwind or a small
custom CSS layer. Vite is the obvious starter.

---

## Fidelity

**High-fidelity (hifi).** All colors, type, spacing, layout, and interactions
are final. Recreate pixel-close, not pixel-perfect — small adjustments are
fine, but the visual character (warm light palette, accent amber, IBM Plex
Thai, the auto-suggest banner, the floating action bar) must come through.

---

## Pages / Views

The app has three top-level pages, navigated from a left sidebar. The
**Workspace** page has three sub-modes (tabs in the top bar).

```
Input Gallery        Workspace                  Output Gallery
  (list)               ├── Cut Sprites  ★         (per-sheet groups)
                       ├── Prompt
                       └── Tileset
```

### Global shell

- **Sidebar** (left, fixed 232px wide):
  - Brand block: a 30×30 square mark (dark background, accent crosshair) +
    "Sprite Cutter" / "v0.1 · local" subtitle (IBM Plex Mono).
  - "Pages" label → three nav items (Input Gallery / Workspace / Output) with
    icon + label + count pill. Active item gets `accent-soft` background and
    accent text.
  - "Recent files" label → list of recent sprite-sheet rows: 24×24 thumbnail +
    mono filename. Active row gets a darker surface.
  - Footer row: current input folder path (mono, truncated) + theme toggle
    (sun/moon icon button).
- **Top bar** (52px tall): breadcrumb on the left, tabs in the middle (only on
  the Workspace page), a search shortcut hint (`⌘K` kbd) + search + settings
  icon buttons on the right.

### 1. Input Gallery

Grid of sprite-sheet cards (`repeat(auto-fill, minmax(220px, 1fr))`, 16px gap).

- Each card: 4:3 thumbnail with **checkerboard background** (to communicate
  PNG transparency), a `WxH` badge top-left, filename + filesize + "added X
  hours ago" footer, and a primary "เปิดใน Workspace" button.
- Clicking the thumbnail opens a **lightbox** (full-screen modal, blurred
  backdrop) with a larger preview and a "เปิดใน Workspace" CTA.
- Toolbar above the grid: folder breadcrumb on the left; refresh / change-folder
  / **อัปโหลด** (primary) on the right.
- Empty state: a centered 56×56 accent-soft circle with icon, title, body
  copy, and a CTA to upload.

### 2. Workspace — Cut Sprites ★ (the main page)

**Two-column layout:**

```
┌─────────────────────────────────┬──────────────────┐
│                                 │  Settings panel  │
│         Preview canvas          │  (320px wide)    │
│                                 │                  │
│  • checkerboard background      │  Auto-suggest    │
│  • sprite sheet centered        │  banner          │
│  • bounding-box SVG overlay     │  ────────        │
│  • status chips top-left        │  Auto/Manual     │
│  • zoom controls bottom-center  │  switch          │
│  • floating action bar          │  ────────        │
│    (manual mode, ≥1 selection)  │  Detection       │
│                                 │  sliders (×4)    │
│                                 │  ────────        │
│                                 │  Presets         │
│                                 │  ────────        │
│                                 │  Background      │
│                                 │  ────────        │
│                                 │  Output naming   │
├─────────────────────────────────┴──────────────────┤
│  Cut & Save footer (sticky inside settings)        │
└────────────────────────────────────────────────────┘
```

**Preview canvas:**

- Full-bleed checkerboard background (`var(--surface)` + a `20px` diagonal
  pattern at low opacity).
- Sprite image is wrapped in `.preview-stage` (max 92% of the canvas, drop
  shadow). It supports CSS-scale zoom (25–300%).
- **Bounding-box overlay** is an `<svg>` with `viewBox` matching the
  image-space (1448×1086 in mocks) and `preserveAspectRatio="none"` so it
  stretches with the image. Each box is a `<g class="bbox-group">` with a
  `<rect class="bbox">` plus an optional `<text class="bbox-label">` showing
  the zero-padded id.

**Box states (CSS class on the group):**

| State        | When                                  | Visual                                         |
| ------------ | ------------------------------------- | ---------------------------------------------- |
| (default)    | Detected, not interacted with         | Accent (amber) stroke                          |
| `:hover`     | Mouse over                            | Stroke goes from 1.5 → 2.5                     |
| `.selected`  | User clicked in manual mode           | **Teal** stroke 2.5, label tinted teal         |
| `.excluded`  | User chose to remove (alt-click)      | Red dashed stroke, 55% opacity                 |
| `.merged`    | Multiple boxes combined into one      | **Green** stroke 2, new id                     |

**Four bounding-box render styles** (driven by the Tweaks panel —
`bboxStyle`):

- `clean` — thin solid lines (default)
- `ants` — Photoshop-style marching dashes (`stroke-dasharray: 5 3`, animated
  `stroke-dashoffset`)
- `corners` — only the four L-shaped corner brackets (12px legs), no full
  rectangle
- `tinted` — semi-transparent fill (alpha ~0.08) + a thin border

**Status chips** (top-left of preview): a pill with a colored dot and a count:
"Detected **N** objects", "− N excluded", "⨯ N merged", and an image dimensions
chip. Background is `bg-elevated` at 92% opacity with a backdrop blur and a
1px border.

**Zoom controls** (bottom-center floating pill): zoom-out, zoom level (mono),
zoom-in, separator, fit-to-screen, toggle labels. Pill is `bg-elevated` at
94% opacity with backdrop blur.

**Settings panel — `Auto-suggest` banner (top, distinctive):**

A subtle gradient card with the accent color: a sparkles icon in an
accent-filled circle, "Auto-suggest" uppercase label, a confidence percentage
pill on the right, then a one-line summary of how the system "sees" the image
("วัตถุชิดกัน · ขนาดผสม") and a 2-line note (e.g., "แนะนำใช้โหมด Manual แก้
ชิ้นที่ติดกัน"). One action: **เดาค่าใหม่** — resets the sliders to the
system's recommendation and clears any manual edits.

**Auto / Manual mode switch** — segmented pill below the banner. Manual mode
turns the preview cursor into a crosshair and shows shortcut hints in a small
block. Manual is the only mode that lets the user click boxes to select them.

**Manual mode interactions:**

- Click a box = select it (clears other selections).
- Shift-click = add/remove from selection.
- Alt-click a box = exclude it immediately (dashed red).
- Drag on empty canvas = marquee select. Shift+drag = additive marquee.
- When ≥1 box is selected, a **floating action bar** appears bottom-center of
  the preview with: "N selected", a primary **"รวมเป็นชิ้นเดียว"** button
  (only when ≥2 selected; merges into one new bounding box), a secondary
  **"เขี่ยทิ้ง"** button, and a small dismiss `×`.

**Detection sliders** — four sliders, all with **live preview** (every input
event re-renders the overlay; no "Preview" button):

| Slider               | Range / step  | Hint (Thai)                                                       |
| -------------------- | ------------- | ----------------------------------------------------------------- |
| Background threshold | 200–255 / 1   | ค่าสูง = แยกพื้นหลังขาวเข้มข้น                                    |
| Min size             | 8–200 px / 4  | กรองเศษเล็กกว่าค่านี้ออก                                          |
| Group / dilation     | 0–20 px / 1   | เพิ่ม = รวมชิ้นที่แตก / ลด = แยกชิ้นที่ติดกัน                     |
| Padding              | 0–32 px / 1   | ขอบรอบวัตถุหลังตัด                                                |

Each row: label + numeric value pill (mono, on the right) + a thin hint line
underneath + a custom range input. The slider track shows fill progress on
the left of the thumb in accent color.

**Presets row** — chip-shaped pills inside the panel. Four built-ins ship with
the app:

- ★ Icons แน่น — `{threshold:248, minSize:16, dilation:2, padding:4}`
- ★ Items ห่าง — `{threshold:240, minSize:32, dilation:4, padding:8}`
- ★ Objects ใหญ่ — `{threshold:235, minSize:80, dilation:8, padding:12}`
- ★ พื้นหลังนวลๆ — `{threshold:220, minSize:24, dilation:6, padding:6, alphaMode:"fuzzy"}`

Plus a dashed "+ บันทึกชุดนี้" chip that prompts for a name and stores the
current values as a user preset. The active chip is whatever preset's
parameters exactly match the current settings (compare on threshold/minSize/
dilation/padding).

**Background section** — segmented Alpha mode (Remove / Keep / Fuzzy) and a
"Keep shadows" toggle with explanatory sub-text.

**Output section** — naming pattern text input (monospace, defaults to
`{sheetId}_{n}.png`) with help text listing available tokens.

**Footer (sticky inside the settings column)** — a small summary line ("จะตัด
N ชิ้น → output/<sheet>/") and a wide primary **"ตัด & บันทึก"** button. When
the user clicks it, a progress overlay with a backdrop blur covers the preview
showing "กำลังตัดภาพ… X/Y" and a thin progress bar. On completion, the
overlay dismisses and a success toast slides in from the bottom-right with a
"ดูที่ Output" action.

**Per-sheet auto-suggest data** is mocked in `shared.jsx` (`SHEET_HINTS`).
In production this would come from an image-analysis step on upload — the
backend should return: `{ label, note, confidence, settings }`. The settings
seed the sliders before the user touches them.

### 2. Workspace — Prompt Generator

Two-column inside the workspace page (`1fr / 360px`):

**Left column (main):**

- A source card showing the chosen sheet's thumbnail + filename + dimensions
  + a "เปลี่ยนภาพ" ghost button.
- "Prompt เสริม" textarea (Thai placeholder example), with a live character
  count in the top-right of the label row.
- An expandable `<details>` block: "Base prompt (advanced)" — a second
  textarea (monospace) so power users can tweak the AI system prompt.
- Primary big "สร้าง Prompt" button. While loading, replace the result card
  with three shimmer bars.
- Result card: monospace pre-wrapped output in a soft surface block, with
  Copy + บันทึก buttons in the header.

**Right column (history, scrollable):**

- "History" label with a mono count.
- Cards: 42×42 thumbnail of the originating sheet + the prompt (2-line clamp)
  + meta row with timestamp and copy/trash icons.

### 2. Workspace — Tileset Maker

Three-column layout (`220px / 1fr / 320px`):

- **Left column:** vertical list of pieces from the current sheet. Each row is
  a 36×36 chip (cropped from the sheet via `background-position`) + mono
  filename. Selected rows get an accent-soft background and a check icon.
- **Center (canvas):** checkerboard background, scrollable. The tileset is
  rendered as a CSS grid of cells. Cell content is cropped from the sheet
  using `background-image` + `background-size` + `background-position`. The
  active cell gets a thick accent outline; per-cell skew/rotate/scale is
  applied as a CSS `transform`.
- **Right column (settings):** mode segmented control (Floor / Wall), cell-size
  slider (32–128px, step 16), and a "ดัดมุมต่อชิ้น" section with skew-X / skew-Y
  / rotate / scale sliders that act on the currently-clicked cell. Footer has
  a Preview button and a primary "สร้าง Tileset" button.

Important UX note from the brief: **don't ever auto-convert flat art to
isometric**. The skew/rotate sliders are *only* for correcting small angle
errors on individual pieces. The system stays human-in-the-loop here.

### 3. Output Gallery

Header toolbar with breadcrumb + count + right-aligned actions. When the user
selects ≥1 piece, the toolbar swaps to a selection toolbar: "N ชิ้นถูกเลือก",
"ส่งไป Tileset", "ลบ", primary "Download zip", and a dismiss `×`.

Body is groups of output (one per original sheet) — each group has a folder
heading with name + count + timestamp + group-scoped "ดาวน์โหลด" and
"เลือกทั้งหมด" buttons. The grid below is `repeat(auto-fill, minmax(90px,
1fr))`, 8px gap. Each "piece" is a 1:1 cell with checker background, the
cropped image, a mono id in the top-left, and a checkbox that fades in on
hover or stays visible when selected (and is filled accent when selected).

Deleting pieces just moves them into a `deletedPieces` set — the toolbar
shows a "(ลบไป N)" hint and a "คืนค่าที่ลบ" button so the user can undo.

---

## Interactions & Behavior

### Live preview is the contract

The single most important behavior in the Cut mode is that **every slider
change re-renders the overlay immediately**. There is no "Preview" button.
Update settings → recompute visible boxes (filter by minSize, etc.) → re-render
the SVG. The brief is explicit about this and the user explicitly asked for it.

### Auto-suggest on sheet open

When the user opens a sheet (from Input Gallery, from the lightbox, or by
clicking it in the sidebar), the app must:

1. Reset `settings` to that sheet's `SHEET_HINTS[id].settings` value.
2. Clear `excluded`, `selected`, and `merges` to empty.
3. Switch to the Workspace page on the Cut tab.

In production, replace the static `SHEET_HINTS` lookup with a one-shot image
analysis call. The shape of the returned object is documented in the
mock — keep it the same.

### Manual edit math

- The display list = `baseVisible (filtered by minSize) − boxes inside a
  merge group − excluded boxes + one synthesized box per merge group`.
- The synthesized merge box's bounds are the min/max of its members' bounds.
- Merge group ids are negative integers so they don't collide with original
  ids. (Stable random or a monotonic counter is fine — just keep them
  disjoint.)
- The footer count = display list length minus boxes whose state is
  `excluded`.

### Marquee selection

While dragging on the empty stage (in manual mode):

1. Compute the drag rectangle in image space (use
   `getBoundingClientRect()` and scale by `IMG_W / rect.width` and
   `IMG_H / rect.height`).
2. Show a `<rect class="drag-rect">` with a teal dashed stroke and a 10%
   teal fill.
3. On pointer-up, find every display-list box that is fully contained in the
   drag rect and add them to the selection. If shift was held when the drag
   started, append; otherwise replace.

### Toasts

Toasts stack bottom-right, auto-dismiss after 4 seconds. The border-left color
keys the type: accent (info), success (green), danger (red). A toast can
include an action button that runs a callback when clicked (used for "ดูที่
Output" after a successful cut).

### Animations

| Element                    | Property                  | Duration / easing  |
| -------------------------- | ------------------------- | ------------------ |
| Buttons                    | background, border-color  | 120ms              |
| Cards (hover)              | transform, shadow         | 120ms              |
| Toggle switch              | thumb x position          | 150ms              |
| Toast in                   | x+opacity                 | 250ms ease-out     |
| Action bar in              | y+opacity                 | 150ms ease-out     |
| Marching ants              | `stroke-dashoffset`       | 400ms linear loop  |
| Progress bar fill          | width                     | 200ms ease-out     |
| Slider thumb (hover)       | scale 1 → 1.1             | snap (no transition) |

### Keyboard

The brief doesn't require full keyboard shortcuts, but the prototype displays
a `⌘K` chip in the top bar (search). At a minimum, plan for:

- `Esc` — dismiss lightbox / clear selection in manual mode.
- `Delete` / `Backspace` — exclude selected boxes (manual mode).
- `Cmd/Ctrl+A` — select all visible boxes (manual mode).
- `Cmd/Ctrl+Z` — undo last manual edit (this is not in the prototype but is
  the obvious next step).

---

## State Management

Sketch (Vue terms — adapt to your store of choice):

```ts
// Top-level app state
theme: 'light' | 'dark'
page: 'input' | 'workspace' | 'output'
workspaceMode: 'cut' | 'prompt' | 'tileset'
sheetId: string

// Cut mode state — resets on sheetId change
settings: {
  threshold: number     // 200–255
  minSize: number       // 8–200 px
  dilation: number      // 0–20 px
  padding: number       // 0–32 px
  keepShadow: boolean
  alphaMode: 'remove-white' | 'keep' | 'fuzzy'
}
editMode: 'auto' | 'manual'
excluded: Set<number>             // box ids the user dismissed
selected: Set<number>             // currently selected box ids
merges: { id: number; boxIds: number[] }[]
userPresets: { id: string; name: string; settings: Settings }[]

// Prompt mode
promptExtra: string
basePrompt: string
promptResult: string | null
promptHistory: { id, sheetId, text, when }[]

// Tileset mode — resets on sheetId change
tilesetMode: 'floor' | 'wall'
cellSize: number                  // 32 | 48 | 64 | 96 | 128
tilesetSelected: Set<number>
perPieceAdjust: Record<number, { skewX, skewY, rotate, scale }>

// Output gallery
outputSelected: Set<string>       // keys "<sheetId>_<id>"
outputDeleted: Set<string>

// Cut job state
cutStatus: null | { kind: 'running'; total: number; current: number }
```

Toasts are ephemeral list items added with a generated id and a `setTimeout`
removal. Don't put them in shared state if your framework has a toast
service — use that.

Backend interactions (described in the brief, mocked in the prototype):

| Action               | Mocked behavior                          | Production responsibility               |
| -------------------- | ---------------------------------------- | --------------------------------------- |
| Open sheet           | Look up in `SHEETS` constant             | Read file from disk, return metadata    |
| Auto-suggest         | Look up in `SHEET_HINTS` constant        | Analyze image, return label/note/seed   |
| Cut & save           | `setTimeout` loop                        | Real OpenCV-style segmentation + write  |
| Generate prompt      | 900ms `setTimeout` + canned response     | Call LLM with image + extra text        |
| Build tileset        | Toast only                               | Composite pieces into one PNG + metadata |
| Download zip         | Toast only                               | Zip selected pieces, trigger download   |

---

## Design Tokens

All design tokens live in [`prototype/styles.css`](prototype/styles.css)
under `:root` and `[data-theme="dark"]`. Use them as-is. Color values use
`oklch()` — if your CSS pipeline can't handle that, the hex approximations
are below.

### Colors — light (warm paper, default)

| Token            | OKLCH                       | Hex approx.   | Use                                |
| ---------------- | --------------------------- | ------------- | ---------------------------------- |
| `--bg`           | `oklch(0.985 0.008 75)`     | `#FBF9F5`     | App background                     |
| `--bg-elevated`  | `oklch(0.995 0.005 75)`     | `#FEFCFA`     | Sidebars, top bar, panels, cards   |
| `--surface`      | `oklch(0.965 0.012 75)`     | `#F3EFE8`     | Slider tracks, recessed surfaces   |
| `--surface-hover`| `oklch(0.945 0.016 70)`     | `#ECE6DC`     | Hover backgrounds                  |
| `--surface-active`| `oklch(0.925 0.020 65)`    | `#E2DBCD`     | Pressed / segmented inactive bg    |
| `--border`       | `oklch(0.88 0.018 75)`      | `#D8D0C0`     | All 1px borders                    |
| `--border-strong`| `oklch(0.78 0.025 70)`      | `#B9AE99`     | Hover border, focus ring carry     |
| `--text`         | `oklch(0.22 0.020 50)`      | `#2A241D`     | Primary text                       |
| `--text-muted`   | `oklch(0.48 0.018 60)`      | `#6B6358`     | Secondary text, sub-labels         |
| `--text-faint`   | `oklch(0.65 0.015 65)`      | `#9D958A`     | Hints, badges, very-low-emphasis   |
| `--accent`       | `oklch(0.65 0.18 50)`       | `#D9772A`     | Primary brand / interactive        |
| `--accent-hover` | `oklch(0.60 0.19 45)`       | `#C56518`     | Hover on primary buttons           |
| `--accent-soft`  | `oklch(0.92 0.06 65)`       | `#F6DFC2`     | Active nav bg, badge bg            |
| `--accent-fg`    | `oklch(0.99 0.005 75)`      | `#FCFAF6`     | Text on accent                     |
| `--teal`         | `oklch(0.58 0.12 200)`      | `#3D8A9E`     | "Selected" state                   |
| `--teal-soft`    | `oklch(0.92 0.05 200)`      | `#D1E8EF`     | Selected backgrounds               |
| `--success`      | `oklch(0.58 0.13 145)`      | `#3F9163`     | "Merged" state, success toast      |
| `--success-soft` | `oklch(0.93 0.05 145)`      | `#D6EBDF`     | Success backgrounds                |
| `--warn`         | `oklch(0.65 0.16 75)`       | `#C99528`     | Caution                            |
| `--danger`       | `oklch(0.58 0.18 25)`       | `#C44434`     | "Excluded" state, error toast      |

### Colors — dark

Same names; values are in `styles.css`. The accent shifts brighter
(`oklch(0.74 0.17 55)`) so it pops on the dark surface; the warm bg drops to
`oklch(0.18 0.012 50)` (~`#2A2622`).

### Spacing

There is no formal spacing scale; the design uses concrete pixel values from
this small vocabulary: **4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 28**. Stay
inside it. Card and panel paddings are typically 14–18px.

### Radii

| Token   | Value | Use                                  |
| ------- | ----- | ------------------------------------ |
| `--r-sm`| 6px   | Inputs, tiny badges, small chips     |
| `--r-md`| 10px  | Buttons, panels, toasts              |
| `--r-lg`| 14px  | Cards, prompt result block           |
| `--r-xl`| 20px  | (reserved)                           |

Full pills use `100px`.

### Shadows

| Token       | Value                                                                |
| ----------- | -------------------------------------------------------------------- |
| `--shadow-sm` | `0 1px 2px black/6%, 0 0 0 1px black/4%`                            |
| `--shadow-md` | `0 2px 6px black/8%, 0 1px 2px black/6%`                            |
| `--shadow-lg` | `0 12px 32px black/10%, 0 2px 8px black/6%` (used on lightbox, toasts) |

All shadows use warm-tinted blacks (`oklch(0.20 0.04 50)`) in light mode; in
dark mode they're solid black with higher opacity.

### Typography

**Families** (load both from Google Fonts):

- `--font-sans`: `"IBM Plex Sans Thai", "IBM Plex Sans", -apple-system,
  system-ui, sans-serif`
- `--font-mono`: `"IBM Plex Mono", "JetBrains Mono", ui-monospace,
  SFMono-Regular, Menlo, monospace`

**Roles:**

- All UI body text: Sans, 14px, weight 400, line-height 1.5.
- Section headings (e.g., "Detection", "Background"): 11px uppercase,
  letter-spacing 0.08em, weight 500, `text-faint` color.
- Field labels: 13px, `text` color.
- Field hints (under sliders): 11px, `text-faint`.
- Filename / number / techical values: **Mono**, 11–13px depending on context.
- Settings value pills: Mono 12px in a 1px-bordered surface chip.
- Toast titles: 13px weight 500; toast descriptions: 12px `text-muted`.
- Empty-state title: 16px weight 500; body: 13px `text-muted`.

---

## Assets

The three sample sprite sheets in [`prototype/assets/`](prototype/assets/)
are AI-generated medieval fantasy art (lanterns, banners, tavern buildings,
tavern interior). They are **placeholders for design review only** — replace
them with real user content in production. They were created by ChatGPT image
generation and are not licensed for shipping.

Icons are inline SVGs defined as a single `<Icon name=… />` component in
[`prototype/shared.jsx`](prototype/shared.jsx). They are 1.6px stroke, round
caps, round joins, 24×24 viewBox. They are not from any icon library — feel
free to swap them for Lucide, Heroicons, Phosphor, or whatever the codebase
already uses; just keep the line weight consistent.

Mock data:

- `SHEETS` — three sample sheets with id, filename, dimensions, byte size,
  bounding-box data, and a "addedAt" relative time. The bounding-box arrays
  are hand-tuned to roughly match the actual sprite locations.
- `SHEET_HINTS` — per-sheet auto-suggest output (label, note, confidence,
  recommended settings).
- `PRESETS` — four built-in setting presets.
- `PROMPT_HISTORY` — two pre-canned saved prompts to seed the History column.
- `OUTPUT_GROUPS` — two pre-canned output groups so the Output page isn't
  empty on first load.

---

## Files

```
prototype/
├── Sprite Cutter Tool.html   # Entry point — loads React, Babel, and the JSX modules
├── styles.css                # All CSS (tokens, layout, components, animations)
├── shared.jsx                # Icon set + mock data (SHEETS, HINTS, PRESETS, etc.)
├── app.jsx                   # <App/> shell — sidebar, top bar, page router, toasts
├── pages-cut.jsx             # <InputGallery>, <CutMode>, <CutSettings>, <BBoxOverlay>
├── pages-rest.jsx            # <PromptMode>, <TilesetMode>, <OutputGallery>
├── tweaks-panel.jsx          # Floating "Tweaks" panel (designer affordance — not part of the product)
└── assets/
    ├── sheet_items.png
    ├── sheet_buildings.png
    └── sheet_interior.png

briefs/
└── 01_UI_Design_Brief.md     # Original product brief (Thai) — the authoritative requirements doc
```

**`tweaks-panel.jsx` is a designer affordance**, not a real product feature.
The prototype lets the reviewer cycle between the four bounding-box styles
(Clean / Ants / Corners / Tinted) and toggle dark mode without rebuilding.
**Don't port the Tweaks panel into the real app.** Pick one bounding-box
style (the prototype defaults to `clean`) and ship it; the user can
demo-switch styles directly in the prototype HTML before you commit.

---

## Build checklist (suggested order)

1. App shell: sidebar + top bar + page router. Hard-code the three pages
   first; route via state.
2. Design tokens: copy the CSS variables into your theme layer. Wire light /
   dark.
3. Input Gallery with mock data. Lightbox modal.
4. Cut mode shell: two-column layout, preview canvas with checkerboard, mock
   bounding-box overlay (static at first).
5. Wire the four sliders to live-update the overlay.
6. Auto-suggest banner.
7. Manual edit: click-to-select, selection state, action bar (merge/exclude).
8. Marquee select.
9. Presets row + save-as flow.
10. Prompt mode + Tileset mode (less critical — the Cut mode is the star).
11. Output Gallery with multi-select, send-to-tileset, and delete-with-undo.
12. Toasts + progress overlay.
13. Real backend wiring (replace the mocks).

Good luck — the prototype is a thorough visual spec; lean on it. If a
detail isn't in this README, open the prototype in a browser and inspect.
