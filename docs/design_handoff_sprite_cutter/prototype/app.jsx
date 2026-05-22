// ============== Main App ==============

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "bboxStyle": "clean"
}/*EDITMODE-END*/;

function App() {
  // Theme
  const [theme, setTheme] = React.useState("light");
  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Navigation
  const [page, setPage] = React.useState("workspace"); // "input" | "workspace" | "output"
  const [workspaceMode, setWorkspaceMode] = React.useState("cut"); // "cut" | "prompt" | "tileset"
  const [sheetId, setSheetId] = React.useState(SHEETS[0].id);
  const sheet = SHEETS.find(s => s.id === sheetId);
  const hint = SHEET_HINTS[sheetId];

  // Cut settings — initialize from sheet hint, re-initialize on sheet change
  const [settings, setSettings] = React.useState(() => ({...hint.settings}));
  // Manual edit state — per session, reset when sheet changes
  const [editMode, setEditMode] = React.useState("auto");
  const [excluded, setExcluded] = React.useState(new Set());
  const [selected, setSelected] = React.useState(new Set());
  const [merges, setMerges] = React.useState([]);

  // When sheet changes → reset to that sheet's auto-suggest
  React.useEffect(() => {
    setSettings({...hint.settings});
    setExcluded(new Set());
    setSelected(new Set());
    setMerges([]);
  }, [sheetId]);

  // Cut status
  const [cutStatus, setCutStatus] = React.useState(null);
  const onCut = () => {
    if (cutStatus && cutStatus.kind === "running") return;
    // Compute final count (visible-after-filter - excluded - merged-into-groups + merge-groups)
    const baseVisible = sheet.boxes.filter(b => Math.min(b.w, b.h) >= settings.minSize * 0.6);
    const inMerge = new Set(merges.flatMap(g => g.boxIds));
    const remaining = baseVisible.filter(b => !inMerge.has(b.id) && !excluded.has(b.id)).length;
    const total = remaining + merges.length;
    if (total === 0) {
      pushToast({ title: "ไม่มีชิ้นให้ตัด", desc: "ปรับ slider หรือคืนค่าก่อน", kind: "error" });
      return;
    }
    setCutStatus({ kind: "running", total, current: 0 });
    let i = 0;
    const tick = () => {
      i++;
      if (i >= total) {
        setCutStatus(null);
        pushToast({
          title: "ตัดเสร็จ — " + total + " ชิ้น",
          desc: `บันทึกที่ output/${sheet.id}/`,
          kind: "success",
          action: { label: "ดูที่ Output", run: () => setPage("output") },
        });
      } else {
        setCutStatus({ kind: "running", total, current: i });
        setTimeout(tick, Math.max(8, 30 - Math.floor(total / 8)));
      }
    };
    setTimeout(tick, 200);
  };

  // Prompt history
  const [history, setHistory] = React.useState(PROMPT_HISTORY);

  // Toasts
  const [toasts, setToasts] = React.useState([]);
  const pushToast = (t) => {
    const id = Date.now() + Math.random();
    setToasts(ts => [...ts, { id, ...t }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 4000);
  };

  // Tweaks
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const onOpenSheet = (id) => {
    setSheetId(id);
    setPage("workspace");
    setWorkspaceMode("cut");
  };

  // Page label for breadcrumb
  const pageLabels = {
    input: "Input Gallery",
    workspace: "Workspace",
    output: "Output Gallery",
  };
  const modeLabels = {
    cut: "Cut Sprites",
    prompt: "Prompt Generator",
    tileset: "Tileset Maker",
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div className="brand-name">
            <span>Sprite Cutter</span>
            <span>v0.1 · local</span>
          </div>
        </div>

        <div className="side-label">Pages</div>
        <button className={"nav-item" + (page === "input" ? " active" : "")} onClick={() => setPage("input")}>
          <span className="ico"><Icon name="gallery" size={15} /></span>
          <span>Input Gallery</span>
          <span className="count">{SHEETS.length}</span>
        </button>
        <button className={"nav-item" + (page === "workspace" ? " active" : "")} onClick={() => setPage("workspace")}>
          <span className="ico"><Icon name="scissors" size={15} /></span>
          <span>Workspace</span>
        </button>
        <button className={"nav-item" + (page === "output" ? " active" : "")} onClick={() => setPage("output")}>
          <span className="ico"><Icon name="output" size={15} /></span>
          <span>Output</span>
          <span className="count">{OUTPUT_GROUPS.reduce((s, g) => s + g.count, 0)}</span>
        </button>

        <div className="side-label">Recent files</div>
        <div className="recent">
          {SHEETS.map(s => (
            <button
              key={s.id}
              className={"recent-item" + (sheetId === s.id ? " active" : "")}
              onClick={() => onOpenSheet(s.id)}
            >
              <div className="recent-thumb" style={{backgroundImage: `url(${s.src})`}}></div>
              <span className="recent-name">{s.name}</span>
            </button>
          ))}
        </div>

        <div className="side-foot">
          <span className="folder" title="~/sprite-cutter/">~/sprite-cutter/</span>
          <button className="icon-btn" title={theme === "light" ? "Dark mode" : "Light mode"}
            onClick={() => setTheme(t => t === "light" ? "dark" : "light")}>
            <Icon name={theme === "light" ? "moon" : "sun"} size={15} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <div className="topbar">
          <div className="crumb">
            <span>{pageLabels[page]}</span>
            {page === "workspace" && (
              <>
                <span className="sep"><Icon name="chevron" size={12} /></span>
                <span className="cur mono" style={{fontSize: 12}}>{sheet.name}</span>
                <span className="sep"><Icon name="chevron" size={12} /></span>
                <span className="cur">{modeLabels[workspaceMode]}</span>
              </>
            )}
          </div>

          {page === "workspace" && (
            <div className="tabs">
              <button className={"tab" + (workspaceMode === "cut" ? " active" : "")} onClick={() => setWorkspaceMode("cut")}>
                <Icon name="scissors" size={13} />
                Cut Sprites
                <span className="star">★</span>
              </button>
              <button className={"tab" + (workspaceMode === "prompt" ? " active" : "")} onClick={() => setWorkspaceMode("prompt")}>
                <Icon name="sparkles" size={13} />
                Prompt
              </button>
              <button className={"tab" + (workspaceMode === "tileset" ? " active" : "")} onClick={() => setWorkspaceMode("tileset")}>
                <Icon name="stack" size={13} />
                Tileset
              </button>
            </div>
          )}

          <div className="right">
            <div className="kbd">⌘K</div>
            <button className="btn btn-ghost icon-btn" title="Search">
              <Icon name="search" size={14} />
            </button>
            <button className="btn btn-ghost icon-btn" title="Settings">
              <Icon name="settings" size={14} />
            </button>
          </div>
        </div>

        {page === "input" && (
          <InputGallery onOpen={onOpenSheet} selectedId={sheetId} />
        )}
        {page === "workspace" && workspaceMode === "cut" && (
          <CutMode
            sheet={sheet}
            settings={settings}
            setSettings={setSettings}
            bboxStyle={tweaks.bboxStyle}
            onCut={onCut}
            status={cutStatus}
            editMode={editMode}
            setEditMode={setEditMode}
            excluded={excluded}
            setExcluded={setExcluded}
            selected={selected}
            setSelected={setSelected}
            merges={merges}
            setMerges={setMerges}
            hint={hint}
          />
        )}
        {page === "workspace" && workspaceMode === "prompt" && (
          <PromptMode
            sheet={sheet}
            history={history}
            setHistory={setHistory}
            onToast={pushToast}
          />
        )}
        {page === "workspace" && workspaceMode === "tileset" && (
          <TilesetMode sheet={sheet} onToast={pushToast} />
        )}
        {page === "output" && (
          <OutputGallery
            onSendToTileset={() => { setPage("workspace"); setWorkspaceMode("tileset"); }}
            onToast={pushToast}
          />
        )}
      </main>

      {/* Toasts */}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={"toast " + (t.kind || "")}>
            <span className="icon">
              <Icon name={t.kind === "success" ? "check" : t.kind === "error" ? "x" : "info"} size={16} />
            </span>
            <div className="body">
              <div className="title">{t.title}</div>
              {t.desc && <div className="desc">{t.desc}</div>}
            </div>
            {t.action && (
              <button className="btn btn-ghost" style={{fontSize: 12, padding: "4px 8px"}} onClick={() => { t.action.run(); setToasts(ts => ts.filter(x => x.id !== t.id)); }}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Bounding-box style" />
        <TweakSelect
          label="Style"
          value={tweaks.bboxStyle}
          onChange={v => setTweak("bboxStyle", v)}
          options={[
            { value: "clean",   label: "Clean — thin solid lines" },
            { value: "ants",    label: "Ants — marching dashes" },
            { value: "corners", label: "Corners — L brackets only" },
            { value: "tinted",  label: "Tinted — fill + border" },
          ]}
        />
        <TweakSection label="Theme" />
        <TweakRadio
          label="Mode"
          value={theme}
          onChange={setTheme}
          options={[
            { value: "light", label: "Light" },
            { value: "dark",  label: "Dark" },
          ]}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
