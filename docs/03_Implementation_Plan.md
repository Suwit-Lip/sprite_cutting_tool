# Implementation Plan — Sprite Cutter Tool

เอกสารนี้แตก spec ใน [`02_Claude_Code_Spec.md`](02_Claude_Code_Spec.md) ออกเป็น
phase + tasks ที่ทำตามได้ตรงๆ พร้อม acceptance criteria สำหรับแต่ละ phase

อ่านคู่กับ [design_handoff_sprite_cutter/README.md](design_handoff_sprite_cutter/README.md)
(visual spec) และ [briefs/01_UI_Design_Brief.md](design_handoff_sprite_cutter/briefs/01_UI_Design_Brief.md)
(product spec)

---

## สรุปสถาปัตยกรรม

```
┌───────────────────────┐
│ Vue 3 SPA (TS + TW)   │  เสิร์ฟโดย Go ผ่าน go:embed
└──────────┬────────────┘
           │ /api/* (JSON)
┌──────────▼────────────┐
│ Go (Fiber)            │
│  - REST API           │
│  - static SPA         │
│  - LLM client         │
└────┬───────────┬──────┘
     │ os/exec   │ HTTPS
┌────▼────┐  ┌───▼────────┐
│ Python  │  │ OpenAI /    │
│ engine  │  │ Gemini      │
└────┬────┘  └─────────────┘
     │ read/write
┌────▼─────────────────────┐
│ INPUT_DIR / OUTPUT_DIR   │
│ prompts.json presets.json│
└──────────────────────────┘
```

ตัวเลือกที่ตัดสินไว้แล้ว:
- **Frontend**: Vue 3 + Vite + TypeScript + Pinia + Vue Router + Tailwind CSS
- **Backend**: Go 1.23 + Fiber v2 (idiomatic layout: `cmd/` + `internal/`)
- **Python**: 3.10+ (Pillow / numpy / scipy)
- **Path**: ใช้ repo root เป็น project root (ไม่มีโฟลเดอร์ `sprite-cutter/` ครอบ)
- **Design tokens**: คัดลอกจาก `prototype/styles.css` มาเป็น CSS variables ตรงๆ,
  Tailwind อ้างอิงผ่าน `var(--token)` ใน `tailwind.config.ts`

---

## โครงสร้างโปรเจกต์ (สถานะ Phase 0 — มีโฟลเดอร์ + skeleton แล้ว)

```
sprite_cutting_tool/
├── .env.example, .gitignore, docker-compose.yml, Dockerfile, README.md, CLAUDE.md
├── docs/
│   ├── 02_Claude_Code_Spec.md           # spec (มีอยู่แล้ว)
│   ├── 03_Implementation_Plan.md        # ไฟล์นี้
│   └── design_handoff_sprite_cutter/    # UI handoff (มีอยู่แล้ว)
├── backend/
│   ├── go.mod
│   ├── cmd/server/main.go               # entry: Fiber bootstrap + graceful shutdown
│   └── internal/
│       ├── config/config.go             # env loader (filepath.Clean ทุก path)
│       ├── models/types.go              # struct shared กับ frontend
│       ├── handlers/                    # route handlers (one file ต่อ resource)
│       │   ├── handlers.go              # Register() + ErrorHandler
│       │   ├── paths.go                 # safeJoin() — กัน path traversal
│       │   ├── input.go cut.go preset.go output.go prompt.go tileset.go
│       ├── services/
│       │   ├── python/python.go         # subprocess runner (stdout=JSON)
│       │   └── llm/                     # Provider interface + openai/gemini
│       └── static/static.go             # go:embed SPA + SPA fallback
├── engine/
│   ├── requirements.txt
│   ├── _common.py                       # emit(json)/fail(msg) helpers
│   └── analyze.py preview.py cut.py tileset.py
└── frontend/
    ├── package.json vite.config.ts tsconfig.json
    ├── tailwind.config.ts postcss.config.js
    ├── index.html
    └── src/
        ├── main.ts App.vue
        ├── router/index.ts              # /input /workspace/:mode /output
        ├── api/client.ts                # axios + /api proxy
        ├── types/index.ts               # mirror backend models
        ├── stores/{app,cut}.ts          # Pinia
        ├── styles/{tokens,main}.css     # design tokens + Tailwind base
        ├── components/shell/{AppShell,AppSidebar,AppTopBar}.vue
        └── views/{InputGallery,Workspace,OutputGallery}.vue
```

---

## Phase 0 — Scaffolding ✓ (เสร็จแล้ว)

ตั้ง repo, dockerize, layout 3 ภาษา, design tokens + Tailwind, route stubs,
handler stubs, engine stubs — ดูรายละเอียดสถานะใน `backend/`, `engine/`, `frontend/`

**Sanity check (ทำก่อนเริ่ม Phase 1):**
- [ ] `cd backend && go mod tidy && go build ./...`
- [ ] `cd frontend && npm install && npm run build`
- [ ] `cd engine && python -m pip install -r requirements.txt && python analyze.py /dev/null` (ได้ JSON default กลับมา)
- [ ] `docker compose up --build` boot ได้ (route จะคืน 501 ก็ปกติ)

---

## Phase 1 — Core cut flow (หัวใจของโปรเจกต์)

**เป้าหมาย:** ผู้ใช้เปิดเว็บ → upload ภาพ → ระบบเดาค่าให้ → ลาก slider เห็นกรอบสด →
คลิก exclude/merge → ตัด → ดาวน์โหลด/ลบ ได้ครบ — โดยไม่ต้องใช้ LLM

### 1.1 Engine (Python) — port code อ้างอิงจาก spec §6

- [ ] `engine/analyze.py` — port `auto_suggest()` (median, ratio, merge_rate
      ดิเลต 0 vs 3, return profile dense_icons / spaced / mixed_size / normal)
- [ ] `engine/preview.py` — `detect_components()` → bbox + label-as-id (ต้อง
      reproducible: id เดิมตราบใดที่ params ไม่เปลี่ยน) — รองรับ downscale
      arg สำหรับภาพใหญ่
- [ ] `engine/cut.py` — full pipeline: detect → apply `exclude` → apply
      `merge` (รวม bbox + รวม mask) → crop + padding → make_alpha + จำกัด
      alpha ใน component → keep_shadow logic → จัดแถว row/col → save PNG +
      `manifest.json`
- [ ] เพิ่ม unit tests แบบ smoke: รัน script บนภาพ fixture แล้วเช็คว่า JSON
      ออกถูก schema (ไม่ต้อง deep — แค่กันโดน regression)

### 1.2 Backend (Go) — handlers จริง

ตามลำดับ dependency:
- [ ] `handlers/input.go`
  - `GET /api/input/images` — `os.ReadDir(INPUT_DIR)`, filter PNG/JPG/JPEG/WEBP,
        เรียก `image.DecodeConfig` หา dimensions
  - `GET /api/input/file/:name` — `safeJoin` + `c.SendFile`
  - `POST /api/input/upload` — multipart, validate content-type **จาก bytes**
        (`http.DetectContentType`), `MAX_UPLOAD_MB`, กันชื่อซ้ำเติม `_N`
  - `POST /api/input/delete` — array names, partial success
  - `POST /api/input/folder` — เปลี่ยน `cfg.InputDir` runtime (sync.Mutex
        ป้องกัน race ถ้าจำเป็น)
- [ ] `handlers/cut.go` — analyze/preview/execute, ทุก endpoint เรียก
      `python.Runner.Run(ctx, ...)` แล้ว decode เข้า models
- [ ] `handlers/preset.go` — อ่าน/เขียน `presets.json` (lock file ด้วย mutex
      ระดับ handler struct ก็พอ)
- [ ] `handlers/output.go`
  - `GET /api/output/list` — group ตามชื่อโฟลเดอร์, แต่ละชิ้นโหลด dimensions
  - `POST /api/output/zip` — stream `archive/zip` ไป response
  - `POST /api/output/delete` — `{group,file}` array, partial success, ถ้า
        ลบจน group ว่างให้ลบโฟลเดอร์ + manifest ทิ้ง
- [ ] Tests: table-driven ของ `safeJoin` (ครอบคลุม `..`, absolute, separator,
      ภาษาไทยในชื่อไฟล์), happy-path test ของ upload + delete + list

### 1.3 Frontend (Vue) — recreate design

ตามลำดับ design handoff "Build checklist":
- [ ] **AppShell ของจริง**: sidebar (brand block, nav with count pills, recent
      files, footer with folder path + theme toggle), top bar (breadcrumb +
      tabs ตอนอยู่ workspace + ⌘K hint + settings icon)
- [ ] **Input Gallery**: grid `repeat(auto-fill, minmax(220px, 1fr))`,
      thumbnail 4:3 + checkerboard, WxH badge, "เปิดใน Workspace" CTA, lightbox
      modal, upload (drag & drop + button), multi-select + delete with confirm
- [ ] **Workspace · Cut** (หัวใจ):
  - Layout 2 คอลัมน์ (preview + 320px settings panel)
  - **Preview canvas**: checkerboard bg, `<img>` wrapper, SVG overlay
        (`viewBox` = image space, `preserveAspectRatio="none"`)
  - **BBox states**: default/hover/`.selected`/`.excluded`/`.merged` (CSS class
        บน `<g>`); ใช้ `bboxStyle="clean"` ตาม default ของ prototype
  - **Status chips** top-left, **zoom pill** bottom-center
  - **Auto-suggest banner** (gradient card, confidence %, note, "เดาค่าใหม่")
  - **Auto/Manual mode segmented control**
  - **Sliders × 4**: live preview (debounce 150ms) → ยิง `/api/cut/preview`
  - **Manual edit**: click/shift-click/alt-click + marquee select drag rect
        (compute ใน image space) + floating action bar (merge / exclude)
  - **Presets**: 4 built-ins (chip), "+ บันทึกชุดนี้" dashed chip
  - **Background section** + **Output naming**
  - **Sticky footer** "ตัด & บันทึก" → progress overlay → success toast
- [ ] **Output Gallery**: group per sheet, multi-select checkbox (fade in
      on hover/visible when selected), selection toolbar, "ส่งไป Tileset",
      delete-with-undo (`deletedPieces` set + "คืนค่าที่ลบ"), zip download
- [ ] **Toast system**: bottom-right stack, 4s auto-dismiss, border-left
      color = type, optional action button
- [ ] Composables ที่ควรแยก:
  - `useDebouncedFn(fn, ms)`
  - `useBoxSelection()` — encapsulate click/shift/alt/marquee logic
  - `useTheme()` — sync `[data-theme]` กับ Pinia + `prefers-color-scheme`
  - `useCutPreview(sheetId)` — รวม watch(params) → debounce → call API

### 1.4 Acceptance — Phase 1 ผ่านเมื่อ
- เปิด `http://localhost:8080` → เห็น 3 หน้าตามดีไซน์
- Upload ภาพ → เห็นใน Input Gallery
- คลิกภาพ → ไป Workspace → analyze ทำงาน → slider เริ่มที่ค่าที่เดาให้
- ลาก slider → กรอบเปลี่ยนสด (no Preview button)
- Manual mode → คลิก exclude / shift+click merge ได้
- "ตัด & บันทึก" → ได้ไฟล์ใน OUTPUT_DIR/<sheet>/ + manifest
- Output Gallery → ลบหลายชิ้น + ลบทั้ง group + ดาวน์โหลด zip + undo delete

---

## Phase 2 — Prompt Generator

### 2.1 Backend
- [ ] `services/llm/openai.go` — POST `/v1/chat/completions`, JSON body
      `{model, messages, temperature}`, รับ key จาก `cfg.APIKey`, propagate
      `ctx` ด้วย `http.NewRequestWithContext` (timeout)
- [ ] `services/llm/gemini.go` — POST `/v1beta/models/<model>:generateContent`
      (key เป็น query string `?key=…`)
- [ ] `handlers/prompt.go`
  - `POST /api/prompt/generate` — compose `"ช่วยคิด prompt สำหรับ ChatGPT
        โดยใช้ " + LLM_DEFAULT_PROMPT + " โดยที่ " + inputPrompt` แล้วยิง
        provider
  - `POST/GET/DELETE` ของ `prompts.json` (lock ด้วย mutex)

### 2.2 Frontend
- [ ] Workspace mode `prompt`: source card + "Prompt เสริม" textarea +
      `<details>` Base prompt + result card (shimmer ตอน loading) + copy/save
- [ ] Right column history: thumbnail + clamp 2 lines + copy/trash

### 2.3 Acceptance
- ใส่ prompt เสริม → กดสร้าง → ได้ผลกลับ → copy + save → เห็นใน history

---

## Phase 3 — Tileset Maker

### 3.1 Engine
- [ ] `engine/tileset.py` — resize ทุกชิ้นให้พอดี `cellSize` (รักษา aspect,
      center, alpha bg), apply per-piece transform ผ่าน `Image.transform`
      affine, layout grid (floor) หรือ column (wall), save PNG + JSON metadata

### 3.2 Backend + Frontend
- [ ] `handlers/tileset.go` — `POST /api/tileset/create`
- [ ] Workspace mode `tileset`: 3-column (piece list / canvas / settings),
      mode pill (Floor/Wall), cellSize slider, per-piece skew/rotate/scale
      sliders applied via CSS transform on click

### 3.3 Acceptance
- เลือกชิ้นจาก output → ตั้ง mode + cellSize → ปรับมุมทีละชิ้น → preview
- กด "สร้าง Tileset" → ได้ไฟล์ใน OUTPUT_DIR + metadata

---

## Best practices ที่ยึดตลอดทั้งโปรเจกต์

### Go
- ทุก I/O รับ `context.Context` เป็น parameter แรก
- Error wrapping ด้วย `fmt.Errorf("... %w", err)`; sentinel errors ใน package
  ระดับล่างเท่านั้น
- ใช้ `internal/` กันการ import จากภายนอก
- `filepath.Clean` + `filepath.Rel` ตรวจ prefix ก่อนทุก file op (`safeJoin`)
- `log/slog` structured logging, ไม่ใช่ `log.Printf`
- Accept interfaces (เช่น `llm.Provider`), return concrete types
- gofmt + goimports + golangci-lint (`govet`, `staticcheck`, `errcheck`,
  `ineffassign`, `unused`)

### Python
- Type hints บนทุก function สาธารณะ; `from __future__ import annotations`
- stdout = JSON only (`_common.emit`); stderr = log (`_common.fail`)
- ไม่มี global mutable state; รับ args ผ่าน argv ทั้งหมด
- ใช้ `numpy`/`scipy` แทน loop Python ตรงๆ ตามที่ spec §6 แสดงไว้

### Vue 3
- `<script setup lang="ts">` ทุก SFC
- Pinia stores + composables สำหรับ logic; component เน้น declarative template
- `defineProps<T>()` / `defineEmits<{ ... }>()` / `defineModel()` มี type
- Debounce live preview (~150ms) แล้ว yield จาก `watch(params, …)`
- ใช้ design tokens (`bg-surface`, `text-faint`, …) แทน hex code ตรงๆ
- ระวัง hydration: ใช้ `import.meta.client` guard ถ้าจำเป็น (เราใช้ SPA ล้วน
  ไม่ใช่ SSR — ปกติไม่มีปัญหา)

### Security (spec §8)
- Path traversal: `safeJoin()` ทุก endpoint ที่รับชื่อไฟล์
- Upload: validate magic bytes (ไม่ใช่นามสกุล), `MAX_UPLOAD_MB`, กันชื่อซ้ำ
- Multi-delete: partial success (`deleted`/`failed` arrays)
- UI confirm dialog ก่อน destructive op พร้อมจำนวนไฟล์

### Frontend ↔ Backend type sync
- `backend/internal/models/types.go` ↔ `frontend/src/types/index.ts` —
  มี comment "Mirror of …. Keep in sync." ทั้งสองฝั่ง เปลี่ยน schema → แก้
  ทั้งสองไฟล์ในคอมมิตเดียว

---

## Out of scope (ตาม spec §0)

- ❌ ไม่ auto-name ไฟล์ด้วย AI
- ❌ ไม่ generate ภาพเอง (โหมด Prompt แค่สร้าง/เก็บ prompt)
- ❌ ไม่เปลี่ยนมุมมอง front → isometric อัตโนมัติ (manual transform เท่านั้น)
- ❌ ไม่ใส่ auth / multi-user (ของคนเดียวบนเครื่องตัวเอง)
