# Sprite Cutter Tool

เครื่องมือ local web app สำหรับงาน game asset — ตัด sprite sheet อัตโนมัติ,
สร้าง prompt ด้วย LLM, ทำ tileset

> ใช้งานคนเดียวบนเครื่องตัวเอง ไม่มี auth ไม่มี multi-user

## เอกสารหลัก

| ไฟล์ | คืออะไร |
|------|---------|
| [docs/02_Claude_Code_Spec.md](docs/02_Claude_Code_Spec.md) | Spec ทางเทคนิคฉบับเต็ม (API, อัลกอริทึม, env) |
| [docs/03_Implementation_Plan.md](docs/03_Implementation_Plan.md) | แผน implement แตกเป็น phase + acceptance criteria |
| [docs/design_handoff_sprite_cutter/](docs/design_handoff_sprite_cutter/) | UI design handoff (visual spec + prototype HTML/JSX) |
| [CLAUDE.md](CLAUDE.md) | แนวทาง สำหรับ Claude Code (conventions, commands) |

## Tech stack

- **Frontend**: Vue 3 + Vite + TypeScript + Pinia + Vue Router + Tailwind CSS
- **Backend**: Go 1.23 + Fiber v2 (serve static, REST API, เรียก Python, ยิง LLM)
- **Image engine**: Python 3.10+ (Pillow / numpy / scipy) เรียกผ่าน `os/exec`
- **Deploy**: Docker multi-stage หรือ Go binary ตรงๆ บน Windows

## โครงสร้างโปรเจกต์

```
sprite_cutting_tool/
├── backend/         # Go (Fiber) — cmd/server + internal/{config,handlers,services,models,static}
├── engine/          # Python scripts (analyze / preview / cut / tileset)
├── frontend/        # Vue 3 + Vite + TS + Tailwind
├── docs/            # Spec + implementation plan + design handoff
├── .claude/skills/  # Project-local skills (Go, Vue, Nuxt — Claude Code อ้างอิง)
├── docker-compose.yml, Dockerfile, .env.example, CLAUDE.md
```

## เริ่มใช้งาน

### ตัวเลือก A — Docker (แนะนำ)

1. คัดลอก `.env.example` เป็น `.env` แล้วปรับค่า
2. แก้ `docker-compose.yml` ให้ volume ชี้ไป asset folder ของคุณ
   (default `D:\Game Asset` → `/data`)
3. `docker compose up --build`
4. เปิด <http://localhost:8080>

### ตัวเลือก B — รัน binary ตรงๆ บน Windows

```powershell
# ครั้งแรก
cd engine; pip install -r requirements.txt; cd ..
cd frontend; npm install; npm run build; cd ..
cd backend; go build -o ../sprite-cutter.exe ./cmd/server; cd ..

# รัน
.\sprite-cutter.exe
```

### ตัวเลือก C — Dev mode (HMR)

```powershell
# Terminal 1
cd backend; go run ./cmd/server

# Terminal 2
cd frontend; npm run dev   # http://localhost:5173 → proxy /api → :8080
```

## Environment

ดู [.env.example](.env.example) สำหรับรายการเต็ม ตัวที่ต้องตั้งเป็นพิเศษ:

| ตัวแปร | คืออะไร |
|--------|---------|
| `INPUT_DIR` / `OUTPUT_DIR` | path บนเครื่องที่ใช้เก็บภาพ default `D:\Game Asset\input` / `…\output` |
| `LLM_PROVIDER` | `openai` (default) หรือ `gemini` |
| `LLM_API_KEY` | key ของ provider ที่เลือก |
| `MAX_UPLOAD_MB` | จำกัดขนาดต่อภาพอัปโหลด (default 50) |

**LLM cost note**: OpenAI ต้องเติมเครดิต (รุ่นเล็ก gpt-4.1-nano ราคาเศษสตางค์ต่อครั้ง),
Gemini มี free tier (จำกัด ~5–15 req/min) ใช้ฟรีได้ สลับ provider ผ่าน env เท่านั้น

## สถานะการ implement

| Phase | ขอบเขต | สถานะ |
|-------|--------|-------|
| 0 | Scaffolding (folder + skeleton + Docker + design tokens) | ✓ เสร็จ |
| 1 | Core cut flow (engine + handlers + Vue cut workspace) | ✓ เสร็จ |
| 2 | Prompt Generator (Gemini/OpenAI client + Vue prompt mode) | ✓ เสร็จ |
| 3 | Tileset Maker (engine + Vue tileset mode) | ✓ เสร็จ |

> รอ user ตั้ง `LLM_API_KEY` ใน `.env` (default = Gemini) แล้วทดลองใช้งานจริง

ดูรายละเอียดทั้งหมดใน [docs/03_Implementation_Plan.md](docs/03_Implementation_Plan.md)

## ข้อจำกัด (ตั้งใจ)

- ไม่ตั้งชื่อไฟล์อัตโนมัติด้วย AI
- ไม่ generate ภาพเอง (โหมด prompt แค่สร้าง+เก็บ prompt)
- ไม่เปลี่ยนมุมมอง front → isometric อัตโนมัติ (manual transform เท่านั้น)
- ไม่มีระบบ auth / multi-user
