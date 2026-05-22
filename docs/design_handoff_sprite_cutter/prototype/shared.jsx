// ============== Shared: icons, data, helpers ==============

// Stroke icons — single style throughout
const Icon = ({ name, size = 16, ...rest }) => {
  const s = size, sw = 1.6;
  const p = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", ...rest };
  switch (name) {
    case "gallery": return (
      <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
    );
    case "scissors": return (
      <svg {...p}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"/></svg>
    );
    case "output": return (
      <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    );
    case "sparkles": return (
      <svg {...p}><path d="M12 3l1.8 4.5L18 9l-4.2 1.5L12 15l-1.8-4.5L6 9l4.2-1.5L12 3z"/><path d="M19 14l.9 2.2L22 17l-2.1.8L19 20l-.9-2.2L16 17l2.1-.8L19 14z"/></svg>
    );
    case "grid": return (
      <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
    );
    case "folder": return (
      <svg {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>
    );
    case "refresh": return (
      <svg {...p}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
    );
    case "sun": return (
      <svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
    );
    case "moon": return (
      <svg {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    );
    case "search": return (
      <svg {...p}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    );
    case "download": return (
      <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    );
    case "copy": return (
      <svg {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
    );
    case "trash": return (
      <svg {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
    );
    case "check": return (
      <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>
    );
    case "x": return (
      <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    );
    case "play": return (
      <svg {...p}><polygon points="5 3 19 12 5 21 5 3"/></svg>
    );
    case "eye": return (
      <svg {...p}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
    );
    case "zoomin": return (
      <svg {...p}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
    );
    case "zoomout": return (
      <svg {...p}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
    );
    case "fit": return (
      <svg {...p}><path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"/></svg>
    );
    case "chevron": return (
      <svg {...p}><polyline points="9 18 15 12 9 6"/></svg>
    );
    case "info": return (
      <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
    );
    case "layers": return (
      <svg {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
    );
    case "settings": return (
      <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    );
    case "stack": return (
      <svg {...p}><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
    );
    case "upload": return (
      <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
    );
    case "cursor": return (
      <svg {...p}><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><line x1="13" y1="13" x2="19" y2="19"/></svg>
    );
    case "plus": return (
      <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    );
    case "wall": return (
      <svg {...p}><rect x="3" y="4" width="18" height="16" rx="1"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="16" x2="21" y2="16"/><line x1="9" y1="4" x2="9" y2="10"/><line x1="15" y1="10" x2="15" y2="16"/><line x1="9" y1="16" x2="9" y2="20"/></svg>
    );
    case "floor": return (
      <svg {...p}><path d="M12 2L2 8l10 6 10-6-10-6z"/><line x1="2" y1="8" x2="12" y2="14"/><line x1="22" y1="8" x2="12" y2="14"/><line x1="12" y1="14" x2="12" y2="22"/></svg>
    );
    default: return null;
  }
};

// ============== Sample data ==============
// All sheets are 1448 x 1086. Bounding boxes are in image-space and rendered
// as percentage in SVG overlay (viewBox preserveAspectRatio).
const IMG_W = 1448, IMG_H = 1086;

// Build boxes for the items sheet (~110 items across rough rows)
function buildItemBoxes() {
  // Approximate row centers (y) and counts per row, fit by eye
  const rows = [
    { y: 70, h: 110, n: 14, x0: 24, gap: 0 },       // lanterns, candles
    { y: 215, h: 100, n: 14, x0: 24, gap: 0 },      // signs row 1
    { y: 335, h: 90,  n: 10, x0: 18, gap: 0 },      // banners + hanging
    { y: 460, h: 110, n: 13, x0: 18, gap: 0 },      // plants, baskets
    { y: 590, h: 110, n: 13, x0: 12, gap: 0 },      // boxes barrels bottles mugs
    { y: 720, h: 100, n: 12, x0: 24, gap: 0 },      // food, jars
    { y: 838, h: 90,  n: 14, x0: 24, gap: 0 },      // scrolls books chests
    { y: 950, h: 100, n: 14, x0: 12, gap: 0 },      // weapons, helmets
    { y: 1040, h: 50, n: 12, x0: 12, gap: 0 },      // small bottom row (partial)
  ];
  const boxes = [];
  let id = 1;
  for (const r of rows) {
    const cellW = (IMG_W - 2 * r.x0) / r.n;
    for (let i = 0; i < r.n; i++) {
      // Slight randomness to feel "detected"
      const padX = cellW * 0.08 + (i % 3) * 1.5;
      const padY = r.h * 0.06 + (i % 2) * 2;
      const x = r.x0 + i * cellW + padX;
      const y = r.y - r.h / 2 + padY;
      const w = cellW - padX * 2;
      const h = r.h - padY * 2;
      if (y + h > IMG_H - 4) continue;
      boxes.push({ id: id++, x, y, w, h });
    }
  }
  return boxes;
}
function buildBuildingBoxes() {
  // hand-tuned for 3 rough rows
  return [
    { id: 1,  x: 30,   y: 30,  w: 540, h: 360 },  // big plaza
    { id: 2,  x: 600,  y: 60,  w: 200, h: 320 },  // bldg
    { id: 3,  x: 820,  y: 60,  w: 200, h: 320 },
    { id: 4,  x: 1040, y: 60,  w: 200, h: 320 },
    { id: 5,  x: 1260, y: 70,  w: 160, h: 300 },  // wall
    { id: 6,  x: 600,  y: 400, w: 210, h: 280 },
    { id: 7,  x: 830,  y: 400, w: 230, h: 280 },
    { id: 8,  x: 1080, y: 400, w: 200, h: 280 },
    { id: 9,  x: 1300, y: 400, w: 130, h: 280 },
    // small items strip
    { id: 10, x: 20,   y: 690, w: 100, h: 130 },
    { id: 11, x: 140,  y: 690, w: 100, h: 130 },
    { id: 12, x: 260,  y: 690, w: 100, h: 130 },
    { id: 13, x: 380,  y: 700, w: 80,  h: 110 },
    { id: 14, x: 480,  y: 700, w: 90,  h: 110 },
    { id: 15, x: 590,  y: 700, w: 90,  h: 110 },
    { id: 16, x: 700,  y: 690, w: 100, h: 110 },
    { id: 17, x: 820,  y: 690, w: 130, h: 110 },
    { id: 18, x: 980,  y: 690, w: 130, h: 110 },
    { id: 19, x: 1140, y: 690, w: 110, h: 110 },
    { id: 20, x: 1280, y: 700, w: 130, h: 110 },
    // bottom row
    { id: 21, x: 30,   y: 850, w: 130, h: 120 },
    { id: 22, x: 170,  y: 850, w: 110, h: 120 },
    { id: 23, x: 290,  y: 870, w: 130, h: 100 },
    { id: 24, x: 430,  y: 850, w: 140, h: 110 },
    { id: 25, x: 580,  y: 860, w: 130, h: 100 },
    { id: 26, x: 720,  y: 860, w: 80,  h: 90 },
    { id: 27, x: 810,  y: 860, w: 80,  h: 90 },
  ];
}
function buildInteriorBoxes() {
  return [
    { id: 1,  x: 30,   y: 30,   w: 540, h: 380 },  // big room
    { id: 2,  x: 600,  y: 90,   w: 230, h: 280 },  // wall
    { id: 3,  x: 840,  y: 100,  w: 130, h: 270 },
    { id: 4,  x: 980,  y: 100,  w: 230, h: 270 },
    { id: 5,  x: 1220, y: 120,  w: 200, h: 250 },
    // furniture row
    { id: 6,  x: 30,   y: 420,  w: 130, h: 140 },
    { id: 7,  x: 170,  y: 420,  w: 110, h: 130 },
    { id: 8,  x: 290,  y: 460,  w: 160, h: 100 },
    { id: 9,  x: 460,  y: 480,  w: 80,  h: 80 },
    { id: 10, x: 550,  y: 430,  w: 140, h: 140 },
    // small items
    { id: 11, x: 30,   y: 600,  w: 80,  h: 90 },
    { id: 12, x: 120,  y: 600,  w: 80,  h: 90 },
    { id: 13, x: 210,  y: 600,  w: 80,  h: 90 },
    { id: 14, x: 300,  y: 600,  w: 80,  h: 90 },
    { id: 15, x: 390,  y: 600,  w: 120, h: 90 },
    { id: 16, x: 520,  y: 600,  w: 80,  h: 90 },
    { id: 17, x: 610,  y: 600,  w: 110, h: 90 },
    { id: 18, x: 730,  y: 600,  w: 80,  h: 90 },
    { id: 19, x: 820,  y: 600,  w: 80,  h: 90 },
    { id: 20, x: 910,  y: 600,  w: 100, h: 90 },
    { id: 21, x: 1020, y: 600,  w: 80,  h: 90 },
    { id: 22, x: 1110, y: 600,  w: 80,  h: 90 },
    { id: 23, x: 1200, y: 600,  w: 100, h: 90 },
    { id: 24, x: 1310, y: 600,  w: 110, h: 90 },
    // bottom rugs row
    { id: 25, x: 30,   y: 850,  w: 200, h: 150 },
    { id: 26, x: 240,  y: 870,  w: 180, h: 130 },
    { id: 27, x: 430,  y: 870,  w: 200, h: 120 },
    { id: 28, x: 640,  y: 870,  w: 160, h: 140 },
    { id: 29, x: 810,  y: 850,  w: 130, h: 150 },
    { id: 30, x: 950,  y: 860,  w: 100, h: 130 },
    { id: 31, x: 1060, y: 870,  w: 80,  h: 110 },
    { id: 32, x: 1150, y: 870,  w: 80,  h: 110 },
    { id: 33, x: 1240, y: 870,  w: 80,  h: 110 },
    { id: 34, x: 1330, y: 870,  w: 100, h: 130 },
  ];
}

const SHEETS = [
  {
    id: "items",
    name: "medieval_items_01.png",
    src: "assets/sheet_interior.png",
    width: IMG_W, height: IMG_H, bytes: 2171400,
    boxes: buildItemBoxes(),
    addedAt: "2 hours ago",
  },
  {
    id: "buildings",
    name: "village_buildings.png",
    src: "assets/sheet_buildings.png",
    width: IMG_W, height: IMG_H, bytes: 2352300,
    boxes: buildBuildingBoxes(),
    addedAt: "yesterday",
  },
  {
    id: "interior",
    name: "tavern_interior.png",
    src: "assets/sheet_items.png",
    width: IMG_W, height: IMG_H, bytes: 2148900,
    boxes: buildInteriorBoxes(),
    addedAt: "yesterday",
  },
];

// Auto-analysis hints per sheet (mocked "vision" output)
const SHEET_HINTS = {
  items: {
    label: "วัตถุเรียงเป็นแถว · ขนาดใกล้เคียง",
    note: "ภาพนี้มีของเล็กเรียงเป็นแถวสม่ำเสมอ — ค่ามาตรฐานพอใช้งานได้เลย",
    settings: { threshold: 245, minSize: 28, dilation: 3, padding: 6, keepShadow: true, alphaMode: "remove-white" },
    confidence: 0.92,
  },
  buildings: {
    label: "วัตถุใหญ่ · ขนาดผสม",
    note: "ภาพนี้มีอาคารใหญ่ปนกับ prop เล็ก — แนะนำเช็คชิ้นที่ระบบไม่เจอด้วยตา",
    settings: { threshold: 240, minSize: 70, dilation: 6, padding: 8, keepShadow: true, alphaMode: "remove-white" },
    confidence: 0.78,
  },
  interior: {
    label: "ขนาดของผสมสุดขั้ว",
    note: "ห้องใหญ่ปนกับ prop เล็กมากๆ — แนะนำใช้โหมด Manual แก้ชิ้นที่ติดกัน",
    settings: { threshold: 240, minSize: 40, dilation: 5, padding: 8, keepShadow: true, alphaMode: "remove-white" },
    confidence: 0.65,
  },
};

// Built-in presets
const PRESETS = [
  { id: "icons-tight",   name: "Icons แน่น",   builtin: true, settings: { threshold: 248, minSize: 16, dilation: 2, padding: 4, keepShadow: false, alphaMode: "remove-white" } },
  { id: "items-spaced",  name: "Items ห่าง",   builtin: true, settings: { threshold: 240, minSize: 32, dilation: 4, padding: 8, keepShadow: true,  alphaMode: "remove-white" } },
  { id: "large-objects", name: "Objects ใหญ่", builtin: true, settings: { threshold: 235, minSize: 80, dilation: 8, padding: 12, keepShadow: true, alphaMode: "remove-white" } },
  { id: "fuzzy-bg",      name: "พื้นหลังนวลๆ",  builtin: true, settings: { threshold: 220, minSize: 24, dilation: 6, padding: 6, keepShadow: true,  alphaMode: "fuzzy" } },
];

// Pre-canned prompt history
const PROMPT_HISTORY = [
  {
    id: 1,
    sheetId: "items",
    text: "Top-down 2D game asset sprite sheet on pure white background, medieval fantasy props (lanterns, candles, banners, scrolls, weapons, food crates), hand-painted painterly style with soft warm lighting, consistent perspective, ~64×64 cells, crisp readable silhouettes.",
    when: "10 min ago",
  },
  {
    id: 2,
    sheetId: "buildings",
    text: "Isometric medieval village asset pack, half-timbered cottage facades with colored roofs, stone foundations, hanging shop signs, awnings, painterly textures, 1024×1024 white background sprite sheet, consistent 45° camera angle.",
    when: "yesterday",
  },
];

// Output groups
const OUTPUT_GROUPS = [
  { sheetId: "items", folder: "items/", title: "medieval_items_01", count: 124, when: "2 hours ago" },
  { sheetId: "buildings", folder: "buildings/", title: "village_buildings", count: 27, when: "yesterday" },
];

Object.assign(window, {
  Icon, SHEETS, PROMPT_HISTORY, OUTPUT_GROUPS, SHEET_HINTS, PRESETS, IMG_W, IMG_H,
});
