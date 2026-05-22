# Sprite Cutter Tool — Technical Specification (for Claude Code)

เอกสารนี้เป็น spec ทางเทคนิคฉบับสมบูรณ์สำหรับให้ Claude Code สร้างโปรเจกต์
อ่านทั้งหมดก่อนเริ่ม แล้วทำตาม phase ตามลำดับ

---

## 0. สรุปโปรเจกต์

เครื่องมือ **local web application** สำหรับงาน game asset ทำงานหลักคือ
ตัด sprite sheet (ภาพรวมวัตถุหลายชิ้นบนพื้นขาว/โปร่งใส) ออกเป็นไฟล์ภาพย่อย
อัตโนมัติด้วยวิธี connected-components detection พร้อมฟังก์ชันเสริม:
สร้าง prompt ด้วย AI และจัดทำ tileset

ใช้งานคนเดียวบนเครื่องตัวเอง — ไม่มีระบบ auth/multi-user

### ขอบเขต (ทำ / ไม่ทำ)

ทำ:
- ตัด sprite sheet อัตโนมัติ ด้วยระบบที่ผู้ใช้ไม่ต้องเดาค่าเอง:
  - auto-suggest ค่าพารามิเตอร์จากการวิเคราะห์ภาพ (ขนาด/ระยะห่างวัตถุ)
  - live preview กรอบทับภาพ เปลี่ยนสดตอนลาก slider
  - manual edit: คลิกเขี่ยชิ้นที่ไม่เอา / รวมชิ้นที่ควรเป็นชิ้นเดียว
  - preset บันทึกชุดค่าไว้ใช้ซ้ำ
- อ่านภาพจาก input folder, บันทึกผลไป output folder (default: `D:\Game Asset\input` / `D:\Game Asset\output`)
- จัดการไฟล์: อัปโหลด/ลบภาพ input, ลบผล output — รองรับ multi-select สำหรับลบ
- สร้าง prompt ด้วย LLM แล้วเก็บคู่ (ภาพ + prompt) ไว้ให้ผู้ใช้ใช้เอง
- ทำ tileset (resize เท่ากัน + เรียง sheet, แยกโหมดพื้น/ผนัง, ดัดมุมแบบ manual)

ไม่ทำ:
- ไม่ตั้งชื่อไฟล์อัตโนมัติด้วย AI (ผู้ใช้จัดการเอง)
- ไม่ generate ภาพเอง (โหมด prompt แค่สร้าง+เก็บ prompt)
- ไม่เปลี่ยนมุมมองภาพ (front → isometric) อัตโนมัติ — ทำไม่ได้ ใช้ดัดมุมแบบ manual แทน

---

## 1. Tech Stack (บังคับ)

| ชั้น | เทคโนโลยี | หมายเหตุ |
|------|-----------|----------|
| Frontend | **Vue 3** (Composition API, `<script setup>`) | + Vite, Pinia สำหรับ state |
| Backend | **Go** (Fiber framework) | เสิร์ฟ static + REST API + เรียก Python + ยิง LLM |
| Image engine | **Python 3** (Pillow, numpy, scipy) | เรียกผ่าน subprocess จาก Go |
| Container | **Docker** + docker-compose | mount input/output folder จากเครื่อง |

> เหตุผลที่ตัดภาพใช้ Python: connected-components ทำได้ในไม่กี่บรรทัดด้วย scipy
> ถ้าเขียนใน Go ต้องลง OpenCV binding ซึ่งหนักกว่ามาก จึงให้ Go เรียก Python
> เป็น subprocess (`os/exec`)

> Python ทำงานเป็น "function/script" ไม่ใช่ backend server แยก — Go คือ
> backend server เดียว

---

## 2. สถาปัตยกรรม

```
┌──────────────────────────────────────────────┐
│  Vue 3 Frontend (เสิร์ฟโดย Go เป็น static)      │
│  - Input Gallery / Workspace / Output Gallery  │
└───────────────────┬────────────────────────────┘
                    │ REST API (JSON)
┌───────────────────▼────────────────────────────┐
│  Go Backend (Fiber)                             │
│  - serve static (Vue build)                     │
│  - REST API endpoints                           │
│  - เรียก Python script (os/exec) สำหรับงานภาพ    │
│  - ยิง LLM API (OpenAI / Gemini) สำหรับ prompt   │
└──────┬──────────────────────────┬───────────────┘
       │ subprocess               │ HTTPS
┌──────▼─────────────┐   ┌────────▼──────────────┐
│ Python engine      │   │ External LLM API      │
│ cut / tileset      │   │ OpenAI (default)      │
│ (Pillow/numpy/scipy)│   │ Gemini (fallback ฟรี) │
└──────┬─────────────┘   └───────────────────────┘
       │ read/write
┌──────▼──────────────────────────────────────────┐
│ Filesystem (mount เข้า container)                 │
│  input/  output/  prompts.json                   │
└──────────────────────────────────────────────────┘
```

### Data flow หลัก (ตัดภาพ)
1. Vue ขอรายการภาพ → `GET /api/input/images`
2. ผู้ใช้เลือกภาพ + ตั้งค่า → `POST /api/cut/preview` (ได้ bounding box กลับมา)
3. ผู้ใช้กดตัด → `POST /api/cut/execute` → Go เรียก Python → เซฟไป output
4. Vue ดูผล → `GET /api/output/list`

---

## 3. โครงสร้างไฟล์โปรเจกต์

```
sprite-cutter/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── README.md
│
├── backend/                      # Go (Fiber)
│   ├── go.mod
│   ├── main.go                   # entry point, route setup, serve static
│   ├── config/
│   │   └── config.go             # อ่าน env: PORT, INPUT_DIR, OUTPUT_DIR, LLM config
│   ├── handlers/
│   │   ├── input.go              # list/serve/upload/delete ภาพ input
│   │   ├── output.go             # list/serve/zip/delete ผล output
│   │   ├── cut.go                # analyze + preview + execute การตัด (เรียก python)
│   │   ├── prompt.go             # ยิง LLM + จัดการ prompts.json
│   │   ├── preset.go             # จัดการ preset (presets.json)
│   │   └── tileset.go            # สร้าง tileset (เรียก python)
│   ├── services/
│   │   ├── python.go             # ตัวกลางเรียก python script (os/exec)
│   │   └── llm/
│   │       ├── llm.go            # interface Provider (pluggable)
│   │       ├── openai.go         # OpenAI implementation
│   │       └── gemini.go         # Gemini implementation
│   └── models/
│       └── types.go              # struct ของ request/response
│
├── engine/                       # Python scripts (เรียกจาก Go)
│   ├── requirements.txt          # pillow, numpy, scipy
│   ├── analyze.py                # วิเคราะห์ภาพ → เดาค่าพารามิเตอร์ (auto-suggest)
│   ├── cut.py                    # ตัดภาพ (รับ args + exclude/merge, คืน JSON)
│   ├── preview.py                # detect + คืน bounding boxes พร้อม id (ไม่เซฟไฟล์)
│   └── tileset.py                # resize + เรียง tileset
│
└── frontend/                     # Vue 3 + Vite
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.js
        ├── App.vue
        ├── router/index.js       # 3 routes: input / workspace / output
        ├── stores/               # Pinia
        │   ├── app.js            # global: folder paths, theme
        │   ├── images.js         # input/output image lists
        │   ├── cut.js            # state โหมดตัด: params, boxes, exclude, merge, presets
        │   └── prompts.js        # prompt history
        ├── api/index.js          # axios wrapper เรียก backend
        ├── components/
        │   ├── CutCanvas.vue     # แสดงภาพ + วาดกรอบ + คลิกเลือก/รวมชิ้น (live)
        │   ├── ParamPanel.vue    # slider + auto-suggest badge + preset
        │   └── ...               # thumbnail card, slider group, ฯลฯ
        └── views/
            ├── InputGallery.vue
            ├── Workspace.vue     # มี 3 โหมด: Cut / Prompt / Tileset
            └── OutputGallery.vue
```

---

## 4. การตั้งค่า (Environment Variables)

```
# .env.example
PORT=8080

# Default folders — Windows path (ใช้กับการรัน binary ตรงๆ บน Windows)
INPUT_DIR=D:\Game Asset\input
OUTPUT_DIR=D:\Game Asset\output
PROMPTS_FILE=D:\Game Asset\prompts.json

# LLM (pluggable — เลือก provider เดียว)
LLM_PROVIDER=openai             # openai | gemini
LLM_API_KEY=                    # ใส่ key ของ provider ที่เลือก
LLM_MODEL=gpt-4.1-nano          # openai: gpt-4.1-nano | gemini: gemini-2.5-flash
LLM_DEFAULT_PROMPT=             # default prompt ฐานสำหรับโหมด Prompt

# Upload limit
MAX_UPLOAD_MB=50                # ขนาดไฟล์อัปโหลดสูงสุดต่อภาพ
```

> **สำคัญ — เรื่อง path กับวิธีรัน:**
> - **รัน binary ตรงๆ บน Windows (แนะนำสำหรับใช้ในเครื่อง):** ใช้ Windows path
>   ได้เลยตามด้านบน (`D:\Game Asset\input`) ใน Go ต้องใช้ `filepath` package
>   จัดการ path เพื่อรองรับทั้ง `\` และ `/` อย่าต่อ string path เอง
> - **รันแบบ Docker:** path ใน container เป็น Linux ต้อง map ใน docker-compose
>   ผ่าน volume: `"D:\\Game Asset:/data"` แล้วตั้ง `INPUT_DIR=/data/input`,
>   `OUTPUT_DIR=/data/output` ภายใน container (ดู docker-compose ในข้อ 10)
> - ค่าทั้งหมดมาจาก env เปลี่ยน input/output folder จาก UI ได้ (เขียนทับ env
>   ตอน runtime) — ห้าม hardcode

> หมายเหตุค่าใช้จ่าย LLM: OpenAI ไม่มี free tier ต้องเติมเครดิต+ผูกบัตร แต่รุ่นเล็ก
> (เช่น gpt-4.1-nano) ถูกมากระดับเศษสตางค์ต่อครั้ง / Gemini มี free tier
> (จำกัด ~5–15 req/นาที) ใช้แทนได้ฟรี โครงสร้าง LLM ออกแบบให้สลับได้ด้วยการ
> เปลี่ยน env เท่านั้น

---

## 5. REST API Contract

ทุก endpoint คืน JSON. error คืน `{ "error": "ข้อความ" }` พร้อม HTTP status ที่เหมาะสม

### Input
- `GET /api/input/images`
  คืนรายการภาพใน INPUT_DIR
  ```json
  { "images": [ { "name": "sheet1.png", "width": 1448, "height": 1086, "size": 2419159, "url": "/api/input/file/sheet1.png" } ] }
  ```
- `GET /api/input/file/:name` — เสิร์ฟไฟล์ภาพ (สำหรับ <img>)
- `POST /api/input/folder` — เปลี่ยน input folder `{ "path": "..." }`
- `POST /api/input/upload` — อัปโหลดภาพเข้า INPUT_DIR
  - รับ `multipart/form-data` field ชื่อ `files` (รองรับหลายไฟล์พร้อมกัน)
  - รับเฉพาะไฟล์ภาพ (png/jpg/jpeg/webp); จำกัดขนาดตาม MAX_UPLOAD_MB
  - กันชื่อซ้ำ: ถ้ามีไฟล์ชื่อเดิมอยู่แล้ว ให้เติมเลขท้าย (เช่น `sheet1_1.png`)
  ```json
  // response
  { "uploaded": [ { "name": "sheet1.png", "width": 1448, "height": 1086, "size": 2419159 } ], "skipped": [] }
  ```
- `POST /api/input/delete` — ลบภาพ input (รองรับ multi-select)
  ```json
  // request — ส่งเป็น array เสมอ (ลบ 1 ไฟล์ก็ส่ง array ความยาว 1)
  { "names": ["sheet1.png", "sheet2.png"] }
  // response
  { "deleted": ["sheet1.png", "sheet2.png"], "failed": [] }
  ```

### Cut (ตัดภาพ)
- `POST /api/cut/analyze` ★ ใหม่ — auto-suggest ค่าจากตัวภาพ
  เรียก `engine/analyze.py` — วิเคราะห์ภาพแล้วเดาค่าพารามิเตอร์ที่เหมาะ
  เรียกครั้งเดียวตอนเปิดภาพ เพื่อให้ frontend ตั้งค่าเริ่มต้นที่ดี
  ```json
  // request
  { "image": "sheet1.png" }
  // response
  { "suggested": { "bgThreshold": 245, "minSize": 890, "groupDilate": 1, "padding": 4, "keepShadow": true },
    "profile": "dense_icons",        // dense_icons | spaced | mixed_size | normal
    "note": "ภาพนี้วัตถุชิดกัน — ตั้งค่าระวังการรวมชิ้นให้แล้ว",
    "mixedSizeWarning": false }       // true = แนะนำให้ใช้โหมดเลือกชิ้นเอง
  ```
- `POST /api/cut/preview`
  เรียก `engine/preview.py` — detect แต่ไม่เซฟ คืนกรอบ + จำนวน
  ออกแบบให้เร็วพอสำหรับ live preview (เรียกซ้ำตอนผู้ใช้ลาก slider)
  **box แต่ละอันต้องมี `id` คงที่** (อ้างอิงจาก label) เพื่อให้ frontend
  ใช้เลือก/ลบ/รวมชิ้นได้
  ```json
  // request
  { "image": "sheet1.png", "params": { "bgThreshold": 245, "minSize": 400, "groupDilate": 2, "padding": 4, "keepShadow": true } }
  // response
  { "count": 126, "boxes": [ { "id": 12, "x": 40, "y": 40, "w": 80, "h": 110 } ], "rows": 9 }
  ```
  > หมายเหตุ performance: ถ้าภาพใหญ่มากจน preview ช้า ให้ engine คืน
  > downscale factor ได้ หรือ frontend debounce การลาก slider (~150ms)
- `POST /api/cut/execute`
  เรียก `engine/cut.py` — ตัดจริง เซฟลง OUTPUT_DIR/<ชื่อ sheet>/
  รองรับ manual edit: `exclude` (id ที่ไม่เอา) และ `merge` (กลุ่ม id ที่รวมเป็นชิ้นเดียว)
  ```json
  // request
  { "image": "sheet1.png", "params": { ... },
    "exclude": [5, 9],                       // ลบกรอบ id เหล่านี้ทิ้ง
    "merge": [ [22, 23] ] }                  // รวม id 22+23 เป็นชิ้นเดียว (เช่น เทียน+เปลวไฟ)
  // response
  { "count": 124, "outputDir": "sheet1", "manifest": "output/sheet1/manifest.json" }
  ```

### Preset (ชุดค่าที่บันทึกไว้ใช้ซ้ำ)
- `GET /api/preset/list` — คืน preset ทั้งหมด `{ "presets": [ { "id": "...", "name": "icons แน่น", "params": {...} } ] }`
- `POST /api/preset/save` — `{ "name": "icons แน่น", "params": {...} }`
- `DELETE /api/preset/:id` — ลบ preset
  > เก็บใน `presets.json` ข้างๆ prompts.json (ใน D:\Game Asset)

### Output
- `GET /api/output/list` — คืน group ตามภาพต้นฉบับ
  ```json
  { "groups": [ { "name": "sheet1", "count": 126, "items": [ { "file": "sprite_r01_c01.png", "url": "...", "w": 80, "h": 110 } ] } ] }
  ```
- `GET /api/output/file/:group/:name` — เสิร์ฟไฟล์ผล
- `POST /api/output/zip` — `{ "group": "sheet1", "files": [...] }` คืนไฟล์ zip (stream)
- `POST /api/output/folder` — เปลี่ยน output folder
- `POST /api/output/delete` — ลบผล output (รองรับ multi-select)
  - ลบได้ทั้งระดับ "ชิ้นย่อย" และระดับ "ทั้ง group"
  - ส่ง `items` แต่ละตัวเป็น `{ group, file }`; ถ้า `file` ว่าง = ลบทั้ง group
  - ถ้าลบชิ้นย่อยจนกลุ่มว่าง ให้ลบโฟลเดอร์กลุ่มทิ้งด้วย (รวม manifest.json)
  ```json
  // request — array เสมอ
  { "items": [ { "group": "sheet1", "file": "sprite_r01_c01.png" }, { "group": "sheet2", "file": "" } ] }
  // response
  { "deleted": [ { "group": "sheet1", "file": "sprite_r01_c01.png" } ], "failed": [] }
  ```

### Prompt
- `POST /api/prompt/generate`
  ยิง LLM ด้วยสูตร: `"ช่วยคิด prompt สำหรับ ChatGPT โดยใช้ " + LLM_DEFAULT_PROMPT + " โดยที่ " + inputPrompt`
  ```json
  // request
  { "image": "sheet1.png", "inputPrompt": "บ้านจอมเวทย์ theme fantasy" }
  // response
  { "prompt": "<prompt พร้อมใช้ที่ AI สร้าง>" }
  ```
- `POST /api/prompt/save` — เก็บลง prompts.json
  ```json
  { "image": "sheet1.png", "inputPrompt": "...", "prompt": "...", "createdAt": "ISO8601" }
  ```
- `GET /api/prompt/list` — คืนรายการ prompt ที่เก็บไว้
- `DELETE /api/prompt/:id` — ลบรายการ

### Tileset
- `POST /api/tileset/create`
  เรียก `engine/tileset.py`
  ```json
  // request
  { "files": ["sheet1/sprite_r01_c01.png", ...], "mode": "floor", "cellSize": 64,
    "transforms": { "sheet1/sprite_r01_c01.png": { "skewX": 0, "skewY": 0, "rotate": 0 } } }
  // response
  { "file": "tileset_floor_001.png", "url": "...", "meta": "tileset_floor_001.json" }
  ```

---

## 6. Python Engine — รายละเอียดอัลกอริทึมการตัด (ทดสอบแล้ว ใช้ได้จริง)

อัลกอริทึมนี้ผ่านการทดสอบกับภาพจริงแล้ว ได้ผลแม่นยำ ให้ใช้เป็นฐาน

หลักการ: connected-components detection
1. แปลงเป็น RGBA, คำนวณ brightness = ค่าเฉลี่ย RGB
2. foreground = pixel ที่ brightness < bgThreshold (เงานับเป็น foreground เมื่อ keepShadow=true)
3. ทำ binary_opening กำจัด noise เล็ก แล้ว binary_dilation (groupDilate รอบ) เชื่อมรอยขาด
4. label หากลุ่ม pixel ที่เชื่อมกัน → แต่ละกลุ่ม = 1 วัตถุ
5. กรองกลุ่มที่ขนาด < minSize ทิ้ง (noise)
6. หา bounding box แต่ละกลุ่ม, crop + padding
7. ทำ alpha: pixel ที่ brightness >= bgThreshold → โปร่งใส (และจำกัด alpha
   ให้อยู่ใน component นั้นด้วย mask กันวัตถุข้างเคียงปน)
8. (ถ้า keepShadow=false) ตัดเงาเพิ่ม: pixel โทนเทาอ่อน (brightness 200–245
   และ saturation ต่ำ < 25) → โปร่งใส
9. จัดกลุ่มเป็นแถว (cluster ตามแกน y, ห่าง > 60px = แถวใหม่) เพื่อตั้งชื่อ
   `sprite_r{row:02d}_c{col:02d}.png` (เรียงบนลงล่าง ซ้ายไปขวา)
10. เขียน manifest.json: ไฟล์ + row/col + พิกัด x/y/w/h เดิมบน sheet

โค้ดอ้างอิงที่ทดสอบแล้ว (ปรับเป็น cut.py / preview.py ที่รับ args + คืน JSON):

```python
from PIL import Image
import numpy as np
from scipy import ndimage

def detect_components(arr, bg_threshold, min_size, group_dilate):
    rgb = arr[:, :, :3].astype(float)
    brightness = rgb.mean(axis=2)
    mask = brightness < bg_threshold
    mask = ndimage.binary_opening(mask, structure=np.ones((2, 2)))
    mask = ndimage.binary_dilation(mask, iterations=group_dilate)
    labels, n = ndimage.label(mask)
    sizes = ndimage.sum(np.ones_like(labels), labels, range(1, n + 1))
    valid = [i + 1 for i in range(n) if sizes[i] >= min_size]
    return labels, valid

def make_alpha(sub_rgb, bg_threshold, keep_shadow):
    bri = sub_rgb.mean(axis=2)
    alpha = np.full(bri.shape, 255, dtype=np.uint8)
    alpha[bri >= bg_threshold] = 0
    if not keep_shadow:
        sat = sub_rgb.max(axis=2) - sub_rgb.min(axis=2)
        shadow = (bri >= 200) & (bri < bg_threshold) & (sat < 25)
        alpha[shadow] = 0
    return alpha

# จัดแถว: sort ตาม y, ถ้าห่างเกิน 60px = แถวใหม่; ในแถว sort ตาม x
# crop ด้วย padding, จำกัด alpha ใน component ด้วย:
#   comp = ndimage.binary_dilation(labels[y0:y1, x0:x1] == lab, iterations=2)
#   alpha[~comp] = 0
```

ค่า default พารามิเตอร์ (จุดเริ่มเมื่อยังไม่ได้ auto-suggest):
`bgThreshold=245, minSize=400, groupDilate=2, padding=4, keepShadow=true`

**สำคัญ — เรื่อง padding (อธิบายให้ชัด):** padding คือการขยาย bounding box
ออกข้างละ N px **หลังจาก** หากรอบวัตถุได้แล้ว ก่อน crop เพื่อกันขอบวัตถุโดน
ตัดชิด มัน **ไม่ใช่** ระยะระหว่างวัตถุ และถึงแม้วัตถุอยู่ใกล้กันจน padding ทำให้
กรอบ crop ซ้อนทับวัตถุข้างเคียง **ภาพจริงก็ไม่ปนกัน** เพราะขั้นตอน "จำกัด alpha
ใน component" (โค้ดด้านบน) จะทำให้ pixel ที่ไม่ใช่ของวัตถุตัวนั้นโปร่งใส
→ ปัญหาวัตถุใกล้กันที่ต้องระวังจริงคือ `groupDilate` (ทำให้สองชิ้นถูกนับเป็นชิ้นเดียว)
ไม่ใช่ padding

### preview.py — รองรับ live preview + box id
- ทำเหมือน cut.py แต่หยุดที่ขั้นหา bounding box แล้วคืน JSON (ไม่เซฟไฟล์)
- **box แต่ละอันต้องมี `id` คงที่** = ค่า label ของ component (ใช้ให้ frontend
  อ้างอิงเวลาเลือก/ลบ/รวมชิ้น) — id ต้องคงเดิมตราบใดที่ params ไม่เปลี่ยน
- ออกแบบให้เร็ว: ถูกเรียกซ้ำบ่อยตอนผู้ใช้ลาก slider (live preview)
  ถ้าภาพใหญ่ ให้รองรับ downscale ระหว่าง preview ได้ (แต่ตัดจริงใช้ภาพเต็ม)

### analyze.py — auto-suggest ค่าจากตัวภาพ (พิสูจน์แล้วว่าใช้ได้)
วิเคราะห์ภาพแล้วเดาค่าที่เหมาะ เพื่อให้ผู้ใช้ไม่ต้องเริ่มจากศูนย์ หลักการ:
1. หา components ดิบ (ยังไม่ dilate) → ดูการกระจายขนาด (median, max)
2. คำนวณ `ratio = max / median` — ถ้าสูงมาก (> ~50) = ภาพขนาดผสมสุดขั้ว
   (เช่น พื้น/ผนังใหญ่ปนกับของจิ๋ว) → ตั้ง `mixedSizeWarning=true` แนะนำให้ใช้
   โหมดเลือกชิ้นเอง เพราะ minSize ค่าเดียวเอาไม่อยู่
3. ลอง dilate 0 vs 3 รอบ แล้วดูว่าจำนวนชิ้นลดเร็วไหม (`merge_rate`)
   - ถ้าลดเยอะ = วัตถุชิดกัน → เดา `groupDilate` ต่ำ (1) กันการรวมชิ้น → profile `dense_icons`
   - ถ้าแทบไม่ลด = วัตถุห่าง → `groupDilate` 2 ได้สบาย → profile `spaced`
4. เดา `minSize` ยืดหยุ่นตาม median (เช่น `max(150, median*0.3)`)

โค้ดอ้างอิง (ทดสอบกับภาพจริง 3 แบบแล้ว เดาค่าได้สมเหตุสมผล):
```python
def auto_suggest(arr, bg=245):
    bri = arr[:, :, :3].astype(float).mean(axis=2)
    mask = bri < bg
    mask = ndimage.binary_opening(mask, structure=np.ones((2, 2)))
    labels, n = ndimage.label(mask)
    sizes = ndimage.sum(np.ones_like(labels), labels, range(1, n + 1))
    sizes = sizes[sizes >= 50]
    median = float(np.median(sizes))
    ratio = float(sizes.max() / max(median, 1))

    # ดูอัตราการรวมชิ้นเมื่อ dilate
    l0, n0 = ndimage.label(mask)
    s0 = ndimage.sum(np.ones_like(l0), l0, range(1, n0 + 1)); c0 = int((s0 >= 200).sum())
    m3 = ndimage.binary_dilation(mask, iterations=3)
    l3, n3 = ndimage.label(m3)
    s3 = ndimage.sum(np.ones_like(l3), l3, range(1, n3 + 1)); c3 = int((s3 >= 200).sum())
    merge_rate = (c0 - c3) / max(c0, 1)

    group_dilate = 1 if merge_rate > 0.1 else 2
    min_size = max(150, int(median * 0.3))
    mixed = ratio > 50

    if mixed:        profile, note = "mixed_size", "ภาพนี้ขนาดวัตถุผสมมาก — แนะนำใช้โหมดเลือกชิ้นเอง"
    elif merge_rate > 0.1: profile, note = "dense_icons", "ภาพนี้วัตถุชิดกัน — ตั้งค่าระวังการรวมชิ้นให้แล้ว"
    else:            profile, note = "spaced", "ภาพนี้วัตถุห่างกันดี"
    return {
        "suggested": {"bgThreshold": bg, "minSize": min_size,
                       "groupDilate": group_dilate, "padding": 4, "keepShadow": True},
        "profile": profile, "note": note, "mixedSizeWarning": mixed,
    }
```
ผลทดสอบจริง: icons แน่น → groupDilate=1-2 ตัดได้ 155 ชิ้นแม่น / ห้องขนาดผสม
→ ratio 1117x ตรวจจับเป็น mixed_size ถูกต้อง / อาคาร → ratio 22x วัตถุห่าง

### cut.py — รองรับ exclude / merge (manual edit)
- `exclude`: list ของ box id ที่ผู้ใช้คลิกทิ้ง → ข้าม component เหล่านี้ตอนเซฟ
- `merge`: list ของกลุ่ม id เช่น `[[22,23]]` → รวม component ในกลุ่มเป็นชิ้นเดียว
  (รวม bounding box ครอบทั้งกลุ่ม + รวม mask เป็น component เดียวตอนทำ alpha)
  ใช้กับเคสเช่น เปลวเทียนที่ detect แยกจากตัวเทียน
- การตั้งชื่อ row/col คำนวณ **หลัง** apply exclude/merge แล้ว เพื่อให้ลำดับไม่เพี้ยน

### Tileset (tileset.py)
- รับรายการไฟล์ + mode (floor/wall) + cellSize + transforms ต่อไฟล์
- resize ทุกชิ้นให้พอดี cell (รักษา aspect, วางกึ่งกลาง, พื้นโปร่งใส)
- ใช้ transform ต่อชิ้น (skewX/skewY/rotate) ด้วย PIL affine transform —
  เป็นการดัดมุมเล็กน้อยที่ผู้ใช้สั่งมา ไม่ใช่การเปลี่ยนมุมมองอัตโนมัติ
- mode floor: เรียงแบบ grid/diamond / mode wall: เรียงตามแนวสูง
  (กำหนด layout rule แยกสองโหมด)
- เซฟ tileset PNG + metadata JSON (ตำแหน่ง/ขนาดแต่ละ tile)

---

## 7. ลำดับการพัฒนา (ทำตาม Phase นี้)

### Phase 1 — Main (แกนหลัก ทำให้ใช้งานได้จริงก่อน)
เป้าหมาย: ตัดภาพได้ครบ flow โดยไม่พึ่ง LLM
- [ ] ตั้ง project: backend Go (Fiber) + frontend Vue + Vite + Docker
- [ ] config อ่าน env (PORT, INPUT_DIR, OUTPUT_DIR) — รองรับ Windows path
- [ ] engine: `analyze.py` + `preview.py` + `cut.py` (พอร์ตจากโค้ดอ้างอิงข้อ 6)
- [ ] service `python.go` เรียก subprocess + parse JSON
- [ ] API: input list/serve/**upload/delete**, cut **analyze**/preview/execute,
      output list/serve/zip/**delete**, **preset** list/save/delete
- [ ] Vue: 3 หน้า (Input / Workspace[โหมดตัด] / Output)
- [ ] หน้า Input: **อัปโหลดภาพ (drag & drop หรือเลือกไฟล์), ลบภาพ (multi-select)**
- [ ] หน้าตัด — หัวใจของ phase นี้:
  - [ ] เปิดภาพ → เรียก analyze → ตั้งค่าเริ่มต้นจาก auto-suggest + แสดง note/profile
  - [ ] **live preview**: ลาก slider แล้วกรอบทับภาพเปลี่ยนสด (debounce ~150ms)
  - [ ] **manual edit**: คลิกกรอบเพื่อ exclude / เลือกหลายกรอบแล้วสั่ง merge
  - [ ] **preset**: บันทึก/เลือกชุดค่า
  - [ ] กดตัด (ส่ง params + exclude + merge) → ไปดู output
- [ ] หน้า Output: **ลบผล (multi-select ทั้งชิ้นและทั้ง group)**, ดาวน์โหลด zip
**เกณฑ์ผ่าน:** เปิดเว็บ → อัปโหลด/เลือกภาพ → ระบบเดาค่าให้ → ลาก slider เห็นกรอบ
เปลี่ยนสด → คลิกเขี่ย/รวมชิ้นได้ → ตัด → ดาวน์โหลดชิ้นย่อย → ลบ input/output
ที่ไม่ต้องการได้ (เลือกหลายชิ้นพร้อมกัน)

### Phase 2 — Prompt Generator (เดิม Phase 3)
- [ ] LLM interface (pluggable) + OpenAI + Gemini implementation
- [ ] API: prompt generate/save/list/delete + จัดการ prompts.json
- [ ] Vue โหมด Prompt ใน Workspace: ใส่ prompt เสริม → ยิง → แสดง+copy →
      บันทึก → history
**เกณฑ์ผ่าน:** ใส่ prompt เสริม ได้ prompt กลับมา เก็บแล้ว copy ไปใช้ได้

### Phase 3 — Tileset Maker (เดิม Phase 4)
- [ ] engine: `tileset.py` (resize + transform + เรียงแยกโหมด)
- [ ] API: tileset/create
- [ ] Vue โหมด Tileset: เลือกภาพจาก output → เลือกโหมด → ตั้ง cell →
      ปรับมุมทีละชิ้น (slider) → preview → สร้าง
**เกณฑ์ผ่าน:** เลือกภาพหลายชิ้น จัดเป็น tileset พื้น/ผนัง บันทึกได้

---

## 8. ข้อกำหนดด้านคุณภาพ

- จัดการ error ทุกจุด: folder ไม่มี, ภาพเสีย, python ล้มเหลว, LLM error/timeout
- งานที่ใช้เวลา (ตัด/ยิง AI) ต้องไม่ block UI — มี loading state + ข้อความชัด
- ภาพ output เป็น PNG พื้นโปร่งใส; แสดงผลควรมี checker background
- โค้ด Go ตาม idiomatic Go (gofmt, error wrapping); Vue ใช้ Composition API
- Docker mount input/output ผ่าน volume; เขียน README วิธีรันทั้งแบบ Docker
  และแบบรัน binary ตรงๆ
- path ทั้งหมดมาจาก config — ห้าม hardcode

### ความปลอดภัยของ file operation (upload / delete) — สำคัญ
- **กัน path traversal:** ทุก endpoint ที่รับชื่อไฟล์ (upload/delete/serve) ต้อง
  validate ว่าชื่อไม่มี `..`, ไม่มี path separator, และ resolve แล้วต้องอยู่ภายใน
  INPUT_DIR/OUTPUT_DIR เท่านั้น (ใช้ `filepath.Clean` + ตรวจ prefix) —
  ห้ามให้ลบไฟล์นอกโฟลเดอร์ที่กำหนดได้เด็ดขาด
- **ยืนยันก่อนลบ:** ฝั่ง UI ต้องมี confirm dialog ก่อนลบจริง โดยเฉพาะ multi-select
  และการลบทั้ง group (แสดงจำนวนไฟล์ที่จะลบ)
- **upload:** รับเฉพาะนามสกุลภาพที่อนุญาต, ตรวจว่าเป็นไฟล์ภาพจริง (ไม่ใช่แค่ดู
  นามสกุล), จำกัดขนาดตาม MAX_UPLOAD_MB, กันชื่อซ้ำด้วยการเติมเลขท้าย
- **delete แบบ multi:** ทำทีละไฟล์และเก็บผลแยก สำเร็จ/ล้มเหลว (คืน `deleted`/
  `failed`) เพื่อให้ลบบางไฟล์ไม่สำเร็จแล้วที่เหลือยังลบต่อได้
- **ลบแล้ว refresh:** หลังลบ/อัปโหลด ให้ frontend โหลดรายการใหม่เพื่อให้ตรงสถานะจริง

---

## 9. README ที่ต้องมี (ให้ Claude Code เขียนด้วย)
- วิธี setup (ทั้ง Docker และ local/binary บน Windows)
- การตั้งค่า .env (default path `D:\Game Asset\input` / `D:\Game Asset\output`;
  LLM provider/key — บอกว่า OpenAI ไม่ฟรี, Gemini ฟรีแบบจำกัด)
- ตัวอย่าง docker-compose volume mapping สำหรับ Windows path:
  ```yaml
  services:
    app:
      build: .
      ports: ["8080:8080"]
      volumes:
        - "D:\\Game Asset:/data"
      environment:
        INPUT_DIR: /data/input
        OUTPUT_DIR: /data/output
        PROMPTS_FILE: /data/prompts.json
  ```
- โครงสร้าง 3 หน้า + flow การใช้งาน (รวม upload/delete/multi-select)
- คำเตือน: โหมด tileset ไม่เปลี่ยนมุมมองอัตโนมัติ (manual ดัดมุมเท่านั้น)
