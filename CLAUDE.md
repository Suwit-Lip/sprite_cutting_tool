# CLAUDE.md

แนวทางการทำงานในโปรเจกต์นี้สำหรับ Claude Code อ่านก่อนเริ่มแก้โค้ดเสมอ

## เริ่มที่ไหน

- **Spec ผลิตภัณฑ์**: [docs/02_Claude_Code_Spec.md](docs/02_Claude_Code_Spec.md)
- **แผน implement (phase + acceptance)**: [docs/03_Implementation_Plan.md](docs/03_Implementation_Plan.md)
- **UI design handoff**: [docs/design_handoff_sprite_cutter/README.md](docs/design_handoff_sprite_cutter/README.md)
  พร้อม prototype HTML/JSX ที่ใช้เป็น visual source of truth
- **Product brief (ภาษาไทย)**: [docs/design_handoff_sprite_cutter/briefs/01_UI_Design_Brief.md](docs/design_handoff_sprite_cutter/briefs/01_UI_Design_Brief.md)

ถ้าคำสั่งของ user คลุมเครือ ให้กลับมาตรวจเอกสารพวกนี้ก่อนเดา

## Stack

| Layer | Tech | Path |
|-------|------|------|
| Frontend | Vue 3 + Vite + TypeScript + Pinia + Vue Router + Tailwind | [frontend/](frontend/) |
| Backend | Go 1.23 + Fiber v2 | [backend/](backend/) |
| Engine | Python 3.10+ (Pillow / numpy / scipy) เรียกผ่าน `os/exec` | [engine/](engine/) |
| Deploy | Docker multi-stage (frontend → embed in Go → runtime กับ Python) | [Dockerfile](Dockerfile), [docker-compose.yml](docker-compose.yml) |

## Conventions

### โครงสร้าง
- Repo root **คือ** project root (ไม่มีโฟลเดอร์ `sprite-cutter/` ครอบอีกชั้น)
- Go ใช้ layout `cmd/server/` + `internal/{config,handlers,services,models,static}/`
  ตามแบบ idiomatic — spec §3 แสดง layout ที่ flatter (เช่น `backend/handlers/`)
  แต่เราเลือกใช้ `internal/` ตามหลัก Go community
- Frontend ใช้ alias `@/` → `src/`
- Python scripts ทุกตัวคุย stdout = JSON, stderr = log (ดู [engine/_common.py](engine/_common.py))

### Go
- ทุก I/O รับ `context.Context` เป็น param แรก
- Error wrap ด้วย `fmt.Errorf("…: %w", err)`
- `log/slog` ไม่ใช่ `log.Printf`
- ใช้ `filepath.Clean` + `safeJoin()` ([backend/internal/handlers/paths.go](backend/internal/handlers/paths.go))
  ทุก file op ที่รับชื่อจาก client — กัน path traversal
- Accept interfaces (เช่น `llm.Provider`), return concrete types
- ดูเพิ่ม: [.claude/skills/go-style](.claude/skills/go-style/SKILL.md),
  [.claude/skills/golang-patterns](.claude/skills/golang-patterns/SKILL.md)

### Python
- `from __future__ import annotations` + type hints บนทุก function
- ไม่มี global mutable state; ทุก input มาจาก argv
- ใช้ numpy/scipy vectorized operation แทน loop ตามแบบใน spec §6

### Vue 3
- `<script setup lang="ts">` ทุก SFC
- Pinia stores แยกตาม domain (app / cut / prompts / …)
- Logic อยู่ใน composables (`useDebouncedFn`, `useCutPreview`, …) component
  เก็บเฉพาะ template + binding
- ใช้ design tokens (`bg-surface`, `text-faint`, `border-border` ฯลฯ) จาก
  [tailwind.config.ts](frontend/tailwind.config.ts) — **อย่า hardcode hex / oklch**
  ใน component
- ดูเพิ่ม: [.claude/skills/vue-best-practices](.claude/skills/vue-best-practices/SKILL.md)

### Frontend ↔ Backend type sync
[backend/internal/models/types.go](backend/internal/models/types.go) และ
[frontend/src/types/index.ts](frontend/src/types/index.ts) ต้อง mirror กัน
ทุก schema change ให้แก้สองฝั่งในคอมมิตเดียว

### Security (spec §8)
- Path traversal: ใช้ `safeJoin()` ไม่มีข้อยกเว้น
- Upload: validate content type จาก **magic bytes** (`http.DetectContentType`)
  ไม่ใช่จากนามสกุล
- Multi-delete: partial success — คืน `deleted` + `failed` array เสมอ ไม่
  abort ทั้งคำขอเมื่อไฟล์ใดไฟล์หนึ่งล้ม
- UI ต้องมี confirm dialog ก่อน destructive operation พร้อมจำนวนไฟล์

## คำสั่งที่ใช้บ่อย

### Local dev (ไม่ใช้ Docker)
```powershell
# Terminal 1 — backend (รับ /api และ proxy เข้า Vite ผ่าน vite.config.ts)
cd backend
go run ./cmd/server

# Terminal 2 — frontend dev server (HMR)
cd frontend
npm install   # ครั้งแรก
npm run dev   # http://localhost:5173 → proxy /api → :8080
```

### Build production
```powershell
cd frontend; npm run build; cd ..              # outputs frontend/dist/
cp -r frontend/dist backend/internal/static/   # หรือให้ Dockerfile ทำให้
cd backend; go build -o ../sprite-cutter.exe ./cmd/server
```

### Docker
```powershell
docker compose up --build
```

### Tests
```powershell
cd backend; go test ./...
cd frontend; npm run type-check
```

## เรื่องที่ควรหลีกเลี่ยง

- ❌ Hardcode path ใดๆ — ใช้ค่าจาก env เสมอ (รวม Windows paths)
- ❌ ต่อ string path เอง — ใช้ `filepath.Join` / `path.posix.join`
- ❌ Comment ที่อธิบายว่าโค้ดทำอะไร (อ่านโค้ดเอาเอง) — comment เฉพาะ "ทำไม"
- ❌ Auto-generate ภาพหรือเปลี่ยนมุมมอง (front → isometric) — ตัด/transform
  ทำ manual เท่านั้น
- ❌ เพิ่ม auth / user system — โปรเจกต์นี้ single-user local

## เมื่อแก้ไขเสร็จ

- Backend → `go build ./...` + `go vet ./...` ผ่าน
- Frontend → `npm run type-check` ผ่าน
- ถ้าแก้ schema → mirror ทั้ง `types.go` + `types/index.ts`
- อย่าสร้างไฟล์ใหม่ถ้าแก้ของเดิมได้ อย่าเขียนเอกสารใหม่ถ้าไม่ได้ขอ
