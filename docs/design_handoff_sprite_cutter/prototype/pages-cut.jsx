// ============== Input Gallery ==============
const formatBytes = (b) => (b / (1024 * 1024)).toFixed(1) + " MB";

const InputGallery = ({ onOpen, selectedId }) => {
  const [lightbox, setLightbox] = React.useState(null);

  return (
    <div className="page">
      <div className="output-toolbar" style={{height: 48}}>
        <div className="crumb">
          <Icon name="folder" size={14} />
          <span className="mono faint" style={{fontSize: 12}}>~/sprite-cutter/</span>
          <span className="cur mono" style={{fontSize: 12}}>input/</span>
        </div>
        <span className="mono faint" style={{fontSize: 12}}>{SHEETS.length} ภาพ</span>
        <div className="right">
          <button className="btn btn-ghost">
            <Icon name="refresh" size={14} />
            Refresh
          </button>
          <button className="btn">
            <Icon name="folder" size={14} />
            Change folder
          </button>
          <button className="btn btn-primary">
            <Icon name="upload" size={14} />
            อัปโหลด
          </button>
        </div>
      </div>
      <div className="gallery">
        {SHEETS.map(s => (
          <div
            key={s.id}
            className={"card" + (selectedId === s.id ? " selected" : "")}
          >
            <div className="card-img" onClick={() => setLightbox(s)} title="คลิกเพื่อดูใหญ่">
              <span className="badge">{s.width}×{s.height}</span>
              <img src={s.src} alt={s.name} />
            </div>
            <div className="card-meta">
              <div className="card-name">{s.name}</div>
              <div className="card-sub">
                <span>{formatBytes(s.bytes)}</span>
                <span>{s.addedAt}</span>
              </div>
              <button
                className="btn btn-primary"
                style={{marginTop: 8, justifyContent: "center"}}
                onClick={() => onOpen(s.id)}
              >
                <Icon name="scissors" size={13} />
                เปิดใน Workspace
              </button>
            </div>
          </div>
        ))}
      </div>
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <div className="lightbox-img" onClick={e => e.stopPropagation()}>
            <img src={lightbox.src} alt={lightbox.name} />
          </div>
          <div className="lightbox-bar">
            <button
              className="btn"
              onClick={() => { onOpen(lightbox.id); setLightbox(null); }}
            >
              <Icon name="scissors" size={14} />
              เปิดใน Workspace
            </button>
            <button className="btn btn-ghost icon-btn" onClick={() => setLightbox(null)}>
              <Icon name="x" size={16} />
            </button>
          </div>
          <div className="lightbox-caption">
            {lightbox.name} · {lightbox.width}×{lightbox.height} · {formatBytes(lightbox.bytes)}
          </div>
        </div>
      )}
    </div>
  );
};

// ============== Bounding-box overlay ==============
// `boxes` is the rendered list; each may have a `state` of:
//   undefined | "selected" | "excluded" | "merged"
const BBoxOverlay = ({ boxes, style, onClickBox, showLabels, manualMode, dragRect }) => {
  const cls = "bbox-" + style;
  return (
    <svg className={"preview-overlay " + cls} viewBox={`0 0 ${IMG_W} ${IMG_H}`} preserveAspectRatio="none">
      {boxes.map(b => {
        const groupCls = "bbox-group" + (b.state ? " " + b.state : "");
        return (
          <g
            key={b.id}
            className={groupCls}
            style={{pointerEvents: "auto", cursor: manualMode ? "pointer" : "default"}}
            onClick={(e) => {
              if (onClickBox) {
                e.stopPropagation();
                onClickBox(b, e);
              }
            }}
          >
            {style === "corners" ? (
              <>
                <path className="bbox-corner" d={`M${b.x} ${b.y + 12} L${b.x} ${b.y} L${b.x + 12} ${b.y}`}/>
                <path className="bbox-corner" d={`M${b.x + b.w - 12} ${b.y} L${b.x + b.w} ${b.y} L${b.x + b.w} ${b.y + 12}`}/>
                <path className="bbox-corner" d={`M${b.x + b.w} ${b.y + b.h - 12} L${b.x + b.w} ${b.y + b.h} L${b.x + b.w - 12} ${b.y + b.h}`}/>
                <path className="bbox-corner" d={`M${b.x + 12} ${b.y + b.h} L${b.x} ${b.y + b.h} L${b.x} ${b.y + b.h - 12}`}/>
                <rect className="bbox" x={b.x} y={b.y} width={b.w} height={b.h} stroke="transparent" />
              </>
            ) : (
              <rect className="bbox" x={b.x} y={b.y} width={b.w} height={b.h} />
            )}
            {showLabels && b.state !== "excluded" && (
              <text className="bbox-label" x={b.x + 4} y={b.y + 14}>{String(b.id).padStart(3, "0")}</text>
            )}
          </g>
        );
      })}
      {dragRect && (
        <rect className="drag-rect"
          x={Math.min(dragRect.x1, dragRect.x2)}
          y={Math.min(dragRect.y1, dragRect.y2)}
          width={Math.abs(dragRect.x2 - dragRect.x1)}
          height={Math.abs(dragRect.y2 - dragRect.y1)}
        />
      )}
    </svg>
  );
};

// ============== Cut Mode ==============
const CutMode = ({
  sheet, settings, setSettings, bboxStyle, onCut, status,
  editMode, setEditMode,
  excluded, setExcluded,
  selected, setSelected,
  merges, setMerges,
  hint,
}) => {
  const [zoom, setZoom] = React.useState(1);
  const [showLabels, setShowLabels] = React.useState(true);
  const [drag, setDrag] = React.useState(null); // marquee select

  // Filter boxes by minSize (live preview!)
  const baseVisible = sheet.boxes.filter(b => Math.min(b.w, b.h) >= settings.minSize * 0.6);
  // Build merged box ids → group
  const mergedMap = {};
  merges.forEach(g => g.boxIds.forEach(id => { mergedMap[id] = g; }));

  // Build display list:
  // - originals NOT in any merge group AND not excluded
  // - + one merged box per group (computed bounds)
  const displayed = [];
  const usedInMerge = new Set(Object.keys(mergedMap).map(Number));
  baseVisible.forEach(b => {
    if (usedInMerge.has(b.id)) return;
    const ex = excluded.has(b.id);
    displayed.push({
      ...b,
      state: ex ? "excluded" : (selected.has(b.id) ? "selected" : undefined),
    });
  });
  merges.forEach(g => {
    const members = baseVisible.filter(b => g.boxIds.includes(b.id));
    if (members.length === 0) return;
    const x = Math.min(...members.map(b => b.x));
    const y = Math.min(...members.map(b => b.y));
    const x2 = Math.max(...members.map(b => b.x + b.w));
    const y2 = Math.max(...members.map(b => b.y + b.h));
    displayed.push({
      id: g.id, x, y, w: x2 - x, h: y2 - y,
      state: selected.has(g.id) ? "selected" : "merged",
    });
  });

  const finalCount = displayed.filter(d => d.state !== "excluded").length;
  const excludedCount = excluded.size;

  const manualMode = editMode === "manual";

  // Click box → in manual mode: toggle selected; shift-click for multi-select; with no-shift on already-selected → exclude
  const onClickBox = (b, e) => {
    if (!manualMode) {
      // in auto mode, single-click toggles select for inspection (light highlight)
      setSelected(s => {
        const n = new Set(s); if (n.has(b.id)) n.delete(b.id); else { n.clear(); n.add(b.id); }
        return n;
      });
      return;
    }
    // Manual mode
    if (e.altKey) {
      // alt-click = toggle excluded
      setExcluded(s => {
        const n = new Set(s);
        if (n.has(b.id)) n.delete(b.id); else n.add(b.id);
        return n;
      });
      return;
    }
    // shift = add to selection
    setSelected(s => {
      const n = new Set(s);
      if (e.shiftKey) {
        if (n.has(b.id)) n.delete(b.id); else n.add(b.id);
      } else {
        if (n.has(b.id) && n.size === 1) n.delete(b.id);
        else { n.clear(); n.add(b.id); }
      }
      return n;
    });
  };

  // Marquee drag in manual mode (start on preview-stage)
  const stageRef = React.useRef(null);
  const onStageDown = (e) => {
    if (!manualMode) return;
    // Only start drag if pointer down hit empty stage (not a bbox)
    if (e.target.closest(".bbox-group")) return;
    const r = stageRef.current.getBoundingClientRect();
    const xRatio = IMG_W / r.width;
    const yRatio = IMG_H / r.height;
    const x = (e.clientX - r.left) * xRatio;
    const y = (e.clientY - r.top) * yRatio;
    setDrag({ x1: x, y1: y, x2: x, y2: y, additive: e.shiftKey });
    e.preventDefault();
  };
  React.useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      const r = stageRef.current.getBoundingClientRect();
      const xRatio = IMG_W / r.width;
      const yRatio = IMG_H / r.height;
      const x = (e.clientX - r.left) * xRatio;
      const y = (e.clientY - r.top) * yRatio;
      setDrag(d => d ? { ...d, x2: x, y2: y } : d);
    };
    const onUp = () => {
      setDrag(curr => {
        if (curr) {
          const xMin = Math.min(curr.x1, curr.x2);
          const yMin = Math.min(curr.y1, curr.y2);
          const xMax = Math.max(curr.x1, curr.x2);
          const yMax = Math.max(curr.y1, curr.y2);
          if (Math.abs(xMax - xMin) > 6 && Math.abs(yMax - yMin) > 6) {
            const hits = displayed
              .filter(b => b.state !== "excluded")
              .filter(b => b.x >= xMin && b.y >= yMin && b.x + b.w <= xMax && b.y + b.h <= yMax)
              .map(b => b.id);
            setSelected(s => {
              const n = new Set(curr.additive ? s : []);
              hits.forEach(id => n.add(id));
              return n;
            });
          }
        }
        return null;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, displayed]);

  const selectedCount = selected.size;
  const selectedIds = Array.from(selected);

  // Action handlers
  const mergeSelected = () => {
    if (selectedCount < 2) return;
    // Only merge original boxes (not merged ones for simplicity)
    const ids = selectedIds.filter(id => !merges.find(m => m.id === id));
    if (ids.length < 2) return;
    const newGroup = { id: -Math.floor(Math.random() * 1e6), boxIds: ids };
    setMerges(m => [...m, newGroup]);
    setSelected(new Set());
  };
  const excludeSelected = () => {
    setExcluded(e => {
      const n = new Set(e);
      selectedIds.forEach(id => { if (id > 0) n.add(id); });
      return n;
    });
    setSelected(new Set());
  };
  const restoreAll = () => {
    setExcluded(new Set());
    setMerges([]);
    setSelected(new Set());
  };

  return (
    <div className="cut">
      <div className="preview-wrap">
        <div className="preview-status">
          <span className="chip">
            <span className="dot"></span>
            Detected <strong style={{fontWeight: 600}}>{finalCount}</strong> objects
          </span>
          {excludedCount > 0 && (
            <span className="chip" style={{color: "var(--danger)"}}>
              − {excludedCount} excluded
            </span>
          )}
          {merges.length > 0 && (
            <span className="chip" style={{color: "var(--success)"}}>
              ⨯ {merges.length} merged
            </span>
          )}
          <span className="chip" style={{color: "var(--text-muted)"}}>
            {sheet.width}×{sheet.height}px
          </span>
        </div>

        <div
          ref={stageRef}
          className={"preview-stage" + (manualMode ? " manual" : "")}
          style={{transform: `scale(${zoom})`}}
          onPointerDown={onStageDown}
        >
          <img src={sheet.src} alt={sheet.name} draggable={false} />
          <BBoxOverlay
            boxes={displayed}
            style={bboxStyle}
            onClickBox={onClickBox}
            showLabels={showLabels}
            manualMode={manualMode}
            dragRect={drag}
          />
        </div>

        {/* Floating action bar — appears when selection in manual mode */}
        {manualMode && selectedCount > 0 && (
          <div className="action-bar">
            <span className="count"><strong>{selectedCount}</strong> selected</span>
            {selectedCount >= 2 && (
              <button className="btn btn-primary" onClick={mergeSelected}>
                <Icon name="layers" size={13} />
                รวมเป็นชิ้นเดียว
              </button>
            )}
            <button className="btn" onClick={excludeSelected}>
              <Icon name="trash" size={13} />
              เขี่ยทิ้ง
            </button>
            <button className="btn btn-ghost icon-btn" onClick={() => setSelected(new Set())} title="Clear">
              <Icon name="x" size={14} />
            </button>
          </div>
        )}

        <div className="preview-controls">
          <button className="icon-btn" title="Zoom out" onClick={() => setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)))}>
            <Icon name="zoomout" size={14} />
          </button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button className="icon-btn" title="Zoom in" onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))}>
            <Icon name="zoomin" size={14} />
          </button>
          <div className="sep"></div>
          <button className="icon-btn" title="Fit" onClick={() => setZoom(1)}>
            <Icon name="fit" size={14} />
          </button>
          <button
            className={"icon-btn" + (showLabels ? " active" : "")}
            title="Toggle labels"
            onClick={() => setShowLabels(v => !v)}
          >
            <Icon name="info" size={14} />
          </button>
        </div>

        {status && status.kind === "running" && (
          <div className="progress-overlay">
            <div className="progress-card">
              <div className="h">กำลังตัดภาพ…</div>
              <div className="sub">{status.current} / {status.total} — {sheet.name}</div>
              <div className="progress-bar"><div className="fill" style={{width: `${(status.current / status.total) * 100}%`}}></div></div>
            </div>
          </div>
        )}
      </div>

      <CutSettings
        sheet={sheet}
        hint={hint}
        settings={settings}
        setSettings={setSettings}
        editMode={editMode}
        setEditMode={setEditMode}
        count={finalCount}
        excludedCount={excludedCount}
        mergeCount={merges.length}
        onCut={onCut}
        onResetAuto={() => { setSettings(hint.settings); restoreAll(); }}
        onRestore={restoreAll}
      />
    </div>
  );
};

const SliderRow = ({ label, hint, value, min, max, step, unit, onChange }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="s-row">
      <div className="s-row-h">
        <span className="label">{label}</span>
        <span className="value">{value}{unit || ""}</span>
      </div>
      {hint && <div className="s-row-h" style={{marginTop: -4, marginBottom: 4}}><span className="hint">{hint}</span></div>}
      <input
        className="slider"
        type="range"
        min={min} max={max} step={step}
        value={value}
        style={{"--pct": pct + "%"}}
        onChange={e => onChange(+e.target.value)}
      />
    </div>
  );
};

const ToggleRow = ({ label, sub, value, onChange }) => (
  <div className={"toggle" + (value ? " on" : "")} onClick={() => onChange(!value)}>
    <div>
      <div className="label">{label}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
    <div className="toggle-switch"></div>
  </div>
);

const CutSettings = ({
  sheet, hint, settings, setSettings, editMode, setEditMode,
  count, excludedCount, mergeCount, onCut, onResetAuto, onRestore,
}) => {
  const update = (k, v) => setSettings(s => ({...s, [k]: v}));
  const [userPresets, setUserPresets] = React.useState([]);
  const [activePresetId, setActivePresetId] = React.useState(null);

  // Compare settings to identify active preset
  React.useEffect(() => {
    const all = [...PRESETS, ...userPresets];
    const match = all.find(p =>
      p.settings.threshold === settings.threshold &&
      p.settings.minSize === settings.minSize &&
      p.settings.dilation === settings.dilation &&
      p.settings.padding === settings.padding
    );
    setActivePresetId(match ? match.id : null);
  }, [settings, userPresets]);

  const applyPreset = (p) => setSettings(s => ({...s, ...p.settings}));
  const saveAsPreset = () => {
    const name = window.prompt("ตั้งชื่อ preset:", "Preset ใหม่");
    if (!name) return;
    const np = { id: "user-" + Date.now(), name, settings: {...settings} };
    setUserPresets(p => [...p, np]);
    setActivePresetId(np.id);
  };

  return (
    <div className="settings">
      <div className="settings-scroll">
        {/* Auto-suggest banner */}
        <div className="auto-banner">
          <div className="auto-banner-h">
            <span className="ico"><Icon name="sparkles" size={12} /></span>
            <span className="title">Auto-suggest</span>
            <span className="conf">{Math.round(hint.confidence * 100)}% confident</span>
          </div>
          <div className="label">{hint.label}</div>
          <div className="note">{hint.note}</div>
          <div className="actions">
            <button className="btn btn-ghost" style={{padding: "4px 10px", fontSize: 12, background: "var(--bg-elevated)"}} onClick={onResetAuto}>
              <Icon name="refresh" size={12} />
              เดาค่าใหม่
            </button>
          </div>
        </div>

        {/* Auto / Manual mode switch */}
        <div className="mode-switch">
          <button className={editMode === "auto" ? "active" : ""} onClick={() => setEditMode("auto")}>
            <Icon name="sparkles" size={12} />
            Auto
          </button>
          <button className={"manual" + (editMode === "manual" ? " active" : "")} onClick={() => setEditMode("manual")}>
            <Icon name="cursor" size={12} />
            Manual edit
          </button>
        </div>

        {editMode === "manual" && (
          <div className="s-group" style={{padding: "12px 18px"}}>
            <div className="mono faint" style={{fontSize: 11.5, lineHeight: 1.6}}>
              <div style={{color: "var(--text-muted)", marginBottom: 4}}><strong>Manual edit shortcuts:</strong></div>
              <div>• คลิก = เลือก ·  <span className="kbd" style={{fontSize: 9.5}}>Shift</span>+คลิก = หลายชิ้น</div>
              <div>• ลากกรอบ = เลือกพื้นที่ ·  <span className="kbd" style={{fontSize: 9.5}}>Alt</span>+คลิก = เขี่ยทิ้งทันที</div>
              <div>• เลือก ≥ 2 ชิ้น → ปุ่ม "รวม" ลอยขึ้นมา</div>
            </div>
            {(excludedCount > 0 || mergeCount > 0) && (
              <button className="btn btn-ghost" style={{marginTop: 10, padding: "5px 10px", fontSize: 12}} onClick={onRestore}>
                <Icon name="refresh" size={12} />
                คืนค่าทุกชิ้น ({excludedCount + mergeCount})
              </button>
            )}
          </div>
        )}

        <div className="s-group">
          <div className="s-group-h">
            <span>Detection</span>
            <span className="mono faint" style={{textTransform: "none", letterSpacing: 0, fontWeight: 400, fontSize: 10.5}}>
              {activePresetId ? "preset" : "custom"}
            </span>
          </div>
          <SliderRow
            label="Background threshold"
            hint="ค่าสูง = แยกพื้นหลังขาวเข้มข้น"
            value={settings.threshold} min={200} max={255} step={1}
            onChange={v => update("threshold", v)}
          />
          <SliderRow
            label="Min size"
            hint="กรองเศษเล็กกว่าค่านี้ออก"
            unit="px"
            value={settings.minSize} min={8} max={200} step={4}
            onChange={v => update("minSize", v)}
          />
          <SliderRow
            label="Group / dilation"
            hint="เพิ่ม = รวมชิ้นที่แตก / ลด = แยกชิ้นที่ติดกัน"
            unit="px"
            value={settings.dilation} min={0} max={20} step={1}
            onChange={v => update("dilation", v)}
          />
          <SliderRow
            label="Padding"
            hint="ขอบรอบวัตถุหลังตัด"
            unit="px"
            value={settings.padding} min={0} max={32} step={1}
            onChange={v => update("padding", v)}
          />
        </div>

        {/* Presets */}
        <div className="s-group">
          <div className="s-group-h">
            <span>Presets</span>
          </div>
          <div className="presets">
            {[...PRESETS, ...userPresets].map(p => (
              <button
                key={p.id}
                className={"preset-chip" + (activePresetId === p.id ? " active" : "")}
                onClick={() => applyPreset(p)}
                title={p.builtin ? "Built-in" : "Saved by you"}
              >
                {p.builtin && <span className="star">★</span>}
                {p.name}
              </button>
            ))}
            <button className="preset-chip preset-chip-new" onClick={saveAsPreset}>
              <Icon name="plus" size={11} />
              บันทึกชุดนี้
            </button>
          </div>
        </div>

        <div className="s-group">
          <div className="s-group-h"><span>Background</span></div>
          <div className="s-row">
            <div className="s-row-h" style={{marginBottom: 8}}>
              <span className="label">Alpha mode</span>
            </div>
            <div className="seg-sm">
              {[
                {id: "remove-white", label: "Remove"},
                {id: "keep", label: "Keep"},
                {id: "fuzzy", label: "Fuzzy"},
              ].map(o => (
                <button
                  key={o.id}
                  className={settings.alphaMode === o.id ? "active" : ""}
                  onClick={() => update("alphaMode", o.id)}
                >{o.label}</button>
              ))}
            </div>
          </div>
          <div style={{marginTop: 12}}>
            <ToggleRow
              label="Keep shadows"
              sub="เก็บเงาใต้วัตถุไว้ในชิ้นที่ตัด"
              value={settings.keepShadow}
              onChange={v => update("keepShadow", v)}
            />
          </div>
        </div>

        <div className="s-group">
          <div className="s-group-h"><span>Output</span></div>
          <div className="s-row">
            <div className="s-row-h" style={{marginBottom: 6}}>
              <span className="label">Naming pattern</span>
            </div>
            <input
              type="text"
              defaultValue={`${sheet.id}_{n}.png`}
              style={{
                width: "100%", padding: "7px 10px",
                fontFamily: "var(--font-mono)", fontSize: 12,
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)", outline: "none",
              }}
            />
            <div className="hint mono" style={{fontSize: 10.5, marginTop: 4, color: "var(--text-faint)"}}>
              {"{n}=index · {w}×{h}=size · {sheet}=sheet name"}
            </div>
          </div>
        </div>
      </div>

      <div className="s-footer">
        <div className="summary">
          <span>จะตัด <span className="v">{count}</span> ชิ้น</span>
          <span className="spacer"></span>
          <span>→ output/{sheet.id}/</span>
        </div>
        <div className="row">
          <button className="btn btn-primary" onClick={onCut} style={{flex: 1.6}}>
            <Icon name="scissors" size={14} />
            ตัด &amp; บันทึก
          </button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { InputGallery, CutMode, BBoxOverlay });
