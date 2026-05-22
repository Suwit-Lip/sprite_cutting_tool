// ============== Prompt Mode ==============
const DEFAULT_BASE_PROMPT = "Top-down 2D game asset sprite sheet on a pure white background. Hand-painted painterly style, consistent perspective, crisp silhouettes, no text or watermark, high-detail props arranged in a tidy grid.";

const PromptMode = ({ sheet, history, setHistory, onToast }) => {
  const [extra, setExtra] = React.useState("");
  const [basePrompt, setBasePrompt] = React.useState(DEFAULT_BASE_PROMPT);
  const [result, setResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const generate = () => {
    if (loading) return;
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      const flavor = extra.trim() || "medieval fantasy props";
      const out = `${basePrompt}\n\nTheme: ${flavor}. Style: painterly hand-illustrated, warm lighting, soft shadows, ~64–128px per item. Asset count: 20–40 items in a tidy grid. Background: pure white #FFFFFF, no environmental elements. Camera: clean top-down ¾, consistent for every item. Negative prompt: text, signatures, frames, photo realism, blurry, low resolution.`;
      setResult(out);
      setLoading(false);
    }, 900);
  };

  const save = () => {
    if (!result) return;
    setHistory(h => [{id: Date.now(), sheetId: sheet.id, text: result, when: "เมื่อกี้"}, ...h]);
    onToast({ title: "บันทึก prompt แล้ว", desc: "ดูได้ที่ history ด้านขวา", kind: "success" });
  };

  const copy = (text) => {
    navigator.clipboard?.writeText(text);
    onToast({ title: "Copied", desc: "Prompt อยู่ใน clipboard แล้ว", kind: "success" });
  };

  return (
    <div className="prompt-wrap">
      <div className="prompt-main">
        <div className="prompt-source">
          <div className="prompt-source-thumb" style={{backgroundImage: `url(${sheet.src})`}}></div>
          <div className="prompt-source-meta">
            <div className="prompt-source-name">{sheet.name}</div>
            <div className="prompt-source-sub">{sheet.width}×{sheet.height} · {(sheet.bytes / 1048576).toFixed(1)}MB</div>
          </div>
          <button className="btn btn-ghost">
            <Icon name="refresh" size={14} />
            เปลี่ยนภาพ
          </button>
        </div>

        <div>
          <div className="field-label">
            <span>Prompt เสริม</span>
            <span className="faint mono" style={{fontSize: 11}}>{extra.length} chars</span>
          </div>
          <textarea
            className="textarea"
            value={extra}
            onChange={e => setExtra(e.target.value)}
            placeholder="เช่น &quot;บ้านจอมเวทย์ theme fantasy ดึกๆ มีแสงเทียน&quot;"
            rows={3}
          />
        </div>

        <details>
          <summary style={{
            cursor: "pointer", fontSize: 12, color: "var(--text-muted)",
            padding: "4px 0", userSelect: "none",
          }}>
            ▸ Base prompt (advanced)
          </summary>
          <textarea
            className="textarea"
            value={basePrompt}
            onChange={e => setBasePrompt(e.target.value)}
            rows={3}
            style={{marginTop: 8, fontSize: 12.5, fontFamily: "var(--font-mono)"}}
          />
        </details>

        <div style={{display: "flex", gap: 8}}>
          <button className="btn btn-primary btn-lg" onClick={generate} disabled={loading}>
            <Icon name="sparkles" size={15} />
            {loading ? "กำลังสร้าง…" : "สร้าง Prompt"}
          </button>
          <span className="spacer"></span>
          {result && (
            <>
              <button className="btn" onClick={() => copy(result)}>
                <Icon name="copy" size={14} />
                Copy
              </button>
              <button className="btn btn-primary" onClick={save}>
                <Icon name="check" size={14} />
                บันทึก
              </button>
            </>
          )}
        </div>

        {loading && (
          <div className="prompt-result">
            <div className="prompt-result-h">
              <div className="prompt-result-title">
                <Icon name="sparkles" size={14} />
                <span style={{color: "var(--text-muted)"}}>AI กำลังคิด…</span>
              </div>
            </div>
            <div style={{display: "flex", flexDirection: "column", gap: 8}}>
              {[100, 90, 95, 75].map((w, i) => (
                <div key={i} style={{
                  height: 12, width: w + "%",
                  background: "var(--surface-active)",
                  borderRadius: 4,
                  opacity: 0.4 + i * 0.1,
                  animation: `pulse 1.2s ${i * 0.1}s ease-in-out infinite`,
                }}></div>
              ))}
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="prompt-result">
            <div className="prompt-result-h">
              <div className="prompt-result-title">
                <Icon name="sparkles" size={14} style={{color: "var(--accent)"}} />
                <span>ผลลัพธ์</span>
                <span className="faint mono" style={{fontSize: 11, fontWeight: 400, marginLeft: 6}}>{result.length} chars</span>
              </div>
            </div>
            <div className="prompt-result-body">{result}</div>
          </div>
        )}
      </div>

      <div className="prompt-history">
        <div className="history-h">
          <span>History</span>
          <span className="mono">{history.length}</span>
        </div>
        {history.length === 0 ? (
          <div className="muted" style={{padding: 12, fontSize: 12.5, textAlign: "center"}}>
            ยังไม่มี prompt ที่บันทึกไว้
          </div>
        ) : history.map(h => {
          const src = (SHEETS.find(s => s.id === h.sheetId) || sheet).src;
          return (
            <div key={h.id} className="history-card" onClick={() => copy(h.text)}>
              <div className="history-thumb" style={{backgroundImage: `url(${src})`}}></div>
              <div className="history-body">
                <div className="history-text">{h.text}</div>
                <div className="history-meta">
                  <span>{h.when}</span>
                  <span style={{display: "flex", gap: 6}}>
                    <Icon name="copy" size={11} />
                    <Icon name="trash" size={11} />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============== Tileset Mode ==============
const TilesetMode = ({ sheet, onToast }) => {
  const [mode, setMode] = React.useState("floor");
  const [cellSize, setCellSize] = React.useState(64);
  const [selected, setSelected] = React.useState(() => sheet.boxes.slice(0, 8).map(b => b.id));
  const [activeAdjust, setActiveAdjust] = React.useState(selected[0] || null);
  const [adjusts, setAdjusts] = React.useState({});

  const items = sheet.boxes.slice(0, 24);
  const selectedItems = items.filter(b => selected.includes(b.id));

  const toggle = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const cols = mode === "floor" ? Math.ceil(Math.sqrt(Math.max(1, selectedItems.length))) : selectedItems.length;
  const rows = mode === "floor" ? Math.ceil(selectedItems.length / Math.max(1, cols)) : 1;
  const totalCells = cols * rows;
  const filledCount = selectedItems.length;
  const cellsArr = Array(Math.max(filledCount, totalCells)).fill(null);

  const adjust = adjusts[activeAdjust] || { skewX: 0, skewY: 0, rotate: 0, scale: 1 };
  const updateAdjust = (k, v) => {
    setAdjusts(a => ({ ...a, [activeAdjust]: { ...adjust, [k]: v } }));
  };

  return (
    <div className="tileset-wrap">
      <div className="tileset-source">
        <h4>เลือกจาก {sheet.name}</h4>
        {items.map(b => {
          const sel = selected.includes(b.id);
          // bg-pos to crop the right region
          const scaleX = 36 / b.w;
          const scaleY = 36 / b.h;
          const scale = Math.min(scaleX, scaleY);
          const bgW = sheet.width * scale;
          const bgH = sheet.height * scale;
          const bgX = -b.x * scale + (36 - b.w * scale) / 2;
          const bgY = -b.y * scale + (36 - b.h * scale) / 2;
          return (
            <div
              key={b.id}
              className={"tile-source-item" + (sel ? " selected" : "")}
              onClick={() => toggle(b.id)}
            >
              <div className="tile-thumb" style={{
                backgroundImage: `url(${sheet.src})`,
                backgroundSize: `${bgW}px ${bgH}px`,
                backgroundPosition: `${bgX}px ${bgY}px`,
                backgroundRepeat: "no-repeat",
              }}></div>
              <div className="tile-source-name">
                {sheet.id}_{String(b.id).padStart(3, "0")}.png
              </div>
              {sel && <Icon name="check" size={12} style={{color: "var(--accent)"}} />}
            </div>
          );
        })}
      </div>

      <div className="tileset-canvas">
        <div className="tileset-grid" style={{
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridAutoRows: `${cellSize}px`,
        }}>
          {Array.from({length: totalCells}).map((_, i) => {
            const item = selectedItems[i];
            if (!item) return <div key={i} className="tileset-cell empty"></div>;
            const adj = adjusts[item.id] || { skewX: 0, skewY: 0, rotate: 0, scale: 1 };
            const isActive = activeAdjust === item.id;
            // crop transform
            const scaleX = (cellSize * 0.9) / item.w;
            const scaleY = (cellSize * 0.9) / item.h;
            const fit = Math.min(scaleX, scaleY) * adj.scale;
            const bgW = sheet.width * fit;
            const bgH = sheet.height * fit;
            const bgX = -item.x * fit + (cellSize - item.w * fit) / 2;
            const bgY = -item.y * fit + (cellSize - item.h * fit) / 2;
            return (
              <div
                key={i}
                className="tileset-cell"
                onClick={() => setActiveAdjust(item.id)}
                style={{
                  cursor: "pointer",
                  outline: isActive ? "2px solid var(--accent)" : "none",
                  outlineOffset: -2,
                  zIndex: isActive ? 2 : 1,
                }}
              >
                <div style={{
                  width: "100%", height: "100%",
                  backgroundImage: `url(${sheet.src})`,
                  backgroundSize: `${bgW}px ${bgH}px`,
                  backgroundPosition: `${bgX}px ${bgY}px`,
                  backgroundRepeat: "no-repeat",
                  transform: `skewX(${adj.skewX}deg) skewY(${adj.skewY}deg) rotate(${adj.rotate}deg)`,
                  transformOrigin: "center",
                }}></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="settings">
        <div className="settings-scroll">
          <div className="s-group">
            <div className="s-group-h"><span>Layout</span></div>
            <div className="s-row">
              <div className="s-row-h" style={{marginBottom: 8}}>
                <span className="label">โหมด</span>
              </div>
              <div className="seg-sm">
                <button className={mode === "floor" ? "active" : ""} onClick={() => setMode("floor")}>
                  Floor
                </button>
                <button className={mode === "wall" ? "active" : ""} onClick={() => setMode("wall")}>
                  Wall
                </button>
              </div>
            </div>
            <SliderRow
              label="Cell size"
              unit="px"
              value={cellSize} min={32} max={128} step={16}
              onChange={setCellSize}
            />
            <div className="hint mono" style={{fontSize: 11, color: "var(--text-faint)"}}>
              {cols} × {rows} grid · {filledCount} ชิ้น
            </div>
          </div>

          <div className="s-group">
            <div className="s-group-h">
              <span>ดัดมุมต่อชิ้น</span>
              {activeAdjust && <span className="mono faint" style={{fontSize: 11}}>#{String(activeAdjust).padStart(3, "0")}</span>}
            </div>
            {activeAdjust ? (
              <>
                <SliderRow
                  label="Skew X" unit="°"
                  value={adjust.skewX} min={-30} max={30} step={1}
                  onChange={v => updateAdjust("skewX", v)}
                />
                <SliderRow
                  label="Skew Y" unit="°"
                  value={adjust.skewY} min={-30} max={30} step={1}
                  onChange={v => updateAdjust("skewY", v)}
                />
                <SliderRow
                  label="Rotate" unit="°"
                  value={adjust.rotate} min={-45} max={45} step={1}
                  onChange={v => updateAdjust("rotate", v)}
                />
                <SliderRow
                  label="Scale"
                  value={adjust.scale} min={0.5} max={1.5} step={0.05}
                  onChange={v => updateAdjust("scale", v)}
                />
                <div className="hint mono" style={{fontSize: 11, color: "var(--text-faint)", marginTop: 4}}>
                  ระบบไม่เปลี่ยนมุมมองอัตโนมัติ — ปรับแก้มุมที่เพี้ยนเล็กน้อยเท่านั้น
                </div>
              </>
            ) : (
              <div className="muted" style={{fontSize: 12, padding: "8px 0"}}>
                คลิกชิ้นใน preview เพื่อเริ่มดัดมุม
              </div>
            )}
          </div>
        </div>

        <div className="s-footer">
          <div className="summary">
            <span>Tileset: <span className="v">{cols * cellSize}×{rows * cellSize}px</span></span>
            <span className="spacer"></span>
            <span className="mono">{mode}</span>
          </div>
          <div className="row">
            <button className="btn">
              <Icon name="download" size={14} />
              Preview
            </button>
            <button className="btn btn-primary" onClick={() => onToast({title: "บันทึก Tileset แล้ว", desc: `${filledCount} ชิ้น → tilesets/${mode}_${cellSize}.png`, kind: "success"})}>
              <Icon name="check" size={14} />
              สร้าง Tileset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============== Output Gallery ==============
const OutputGallery = ({ onPiecesSelect, onSendToTileset, onToast }) => {
  const [selectedPieces, setSelectedPieces] = React.useState(new Set());
  const [deletedPieces, setDeletedPieces] = React.useState(new Set());

  const toggle = (key) => {
    setSelectedPieces(s => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };
  const selectedCount = selectedPieces.size;

  const deleteSelected = () => {
    setDeletedPieces(d => {
      const n = new Set(d);
      selectedPieces.forEach(k => n.add(k));
      return n;
    });
    onToast && onToast({title: "ลบ " + selectedCount + " ชิ้นแล้ว", desc: "ย้ายไปถังขยะ (ยังกู้คืนได้)", kind: "success"});
    setSelectedPieces(new Set());
  };

  const totalRemaining = OUTPUT_GROUPS.reduce((s, g) => {
    let count = 0;
    for (let i = 1; i <= g.count; i++) {
      if (!deletedPieces.has(`${g.sheetId}_${i}`)) count++;
    }
    return s + count;
  }, 0);

  return (
    <div className="output-page">
      <div className="output-toolbar">
        <div className="crumb">
          <Icon name="folder" size={14} />
          <span className="mono faint" style={{fontSize: 12}}>~/sprite-cutter/</span>
          <span className="cur mono" style={{fontSize: 12}}>output/</span>
        </div>
        <span className="mono faint" style={{fontSize: 12}}>
          {totalRemaining} ชิ้น ใน {OUTPUT_GROUPS.length} ชุด
          {deletedPieces.size > 0 && <span style={{color: "var(--text-faint)", marginLeft: 8}}>(ลบไป {deletedPieces.size})</span>}
        </span>
        <div className="right">
          {selectedCount > 0 && (
            <>
              <span className="mono" style={{fontSize: 12, color: "var(--accent)"}}>
                {selectedCount} ชิ้นถูกเลือก
              </span>
              <button className="btn" onClick={() => onSendToTileset && onSendToTileset()}>
                <Icon name="stack" size={14} />
                ส่งไป Tileset
              </button>
              <button className="btn" onClick={deleteSelected}>
                <Icon name="trash" size={14} />
                ลบ
              </button>
              <button className="btn btn-primary" onClick={() => onToast({title: "ดาวน์โหลด zip แล้ว", desc: `${selectedCount} ชิ้น`, kind: "success"})}>
                <Icon name="download" size={14} />
                Download zip
              </button>
              <button className="btn btn-ghost icon-btn" onClick={() => setSelectedPieces(new Set())}>
                <Icon name="x" size={14} />
              </button>
            </>
          )}
          {selectedCount === 0 && (
            <>
              {deletedPieces.size > 0 && (
                <button className="btn btn-ghost" onClick={() => setDeletedPieces(new Set())}>
                  <Icon name="refresh" size={14} />
                  คืนค่าที่ลบ ({deletedPieces.size})
                </button>
              )}
              <button className="btn btn-ghost">
                <Icon name="folder" size={14} />
                เปลี่ยน folder
              </button>
              <button className="btn">
                <Icon name="download" size={14} />
                ดาวน์โหลดทั้งหมด
              </button>
            </>
          )}
        </div>
      </div>

      <div className="output-scroll">
        {OUTPUT_GROUPS.map(g => {
          const sheet = SHEETS.find(s => s.id === g.sheetId);
          if (!sheet) return null;
          const boxes = sheet.boxes.slice(0, g.count).filter(b => !deletedPieces.has(`${g.sheetId}_${b.id}`));
          const groupSelectedCount = boxes.filter(b => selectedPieces.has(`${g.sheetId}_${b.id}`)).length;
          return (
            <div key={g.sheetId} className="output-group">
              <div className="output-group-h">
                <Icon name="folder" size={14} style={{color: "var(--accent)"}} />
                <span className="name">{g.title}/</span>
                <span className="sub">{boxes.length} ชิ้น · ตัดเมื่อ {g.when}</span>
                <div className="actions">
                  <button className="btn btn-ghost" style={{padding: "4px 8px", fontSize: 12}}>
                    <Icon name="download" size={12} /> ดาวน์โหลด
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{padding: "4px 8px", fontSize: 12}}
                    onClick={() => {
                      const keys = boxes.map(b => `${g.sheetId}_${b.id}`);
                      const allSelected = keys.every(k => selectedPieces.has(k));
                      setSelectedPieces(s => {
                        const n = new Set(s);
                        if (allSelected) keys.forEach(k => n.delete(k));
                        else keys.forEach(k => n.add(k));
                        return n;
                      });
                    }}
                  >
                    <Icon name="check" size={12} />
                    {groupSelectedCount === boxes.length ? "ยกเลิก" : "เลือกทั้งหมด"}
                  </button>
                </div>
              </div>
              <div className="output-grid">
                {boxes.map(b => {
                  const key = `${g.sheetId}_${b.id}`;
                  const sel = selectedPieces.has(key);
                  const cell = 90;
                  const fit = Math.min((cell - 8) / b.w, (cell - 8) / b.h);
                  const bgW = sheet.width * fit;
                  const bgH = sheet.height * fit;
                  const bgX = -b.x * fit + (cell - 8 - b.w * fit) / 2;
                  const bgY = -b.y * fit + (cell - 8 - b.h * fit) / 2;
                  return (
                    <div
                      key={key}
                      className={"piece" + (sel ? " selected" : "")}
                      onClick={() => toggle(key)}
                      title={`${g.sheetId}_${String(b.id).padStart(3, "0")}.png · ${b.w}×${b.h}`}
                    >
                      <div className="piece-img-clip" style={{
                        backgroundImage: `url(${sheet.src})`,
                        backgroundSize: `${bgW}px ${bgH}px`,
                        backgroundPosition: `${bgX}px ${bgY}px`,
                        backgroundRepeat: "no-repeat",
                      }}></div>
                      <span className="piece-num">{String(b.id).padStart(3, "0")}</span>
                      <div className="piece-check">
                        {sel && <Icon name="check" size={11} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

Object.assign(window, { PromptMode, TilesetMode, OutputGallery, SliderRow, ToggleRow });
