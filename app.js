const UI = {
    modeLabel: document.getElementById("modeLabel"),
    wave: document.getElementById("wave"),
    lives: document.getElementById("lives"),
    gold: document.getElementById("gold"),
    enemies: document.getElementById("enemies"),
    note: document.getElementById("note"),
    debug: document.getElementById("debug"),
    hint: document.getElementById("hint"),

    btnMode: document.getElementById("btnMode"),
    btnStart: document.getElementById("btnStart"),
    btnNext: document.getElementById("btnNext"),
    btnReset: document.getElementById("btnReset"),

    buildCard: document.getElementById("buildCard"),
    upgradeCard: document.getElementById("upgradeCard"),
    editorCard: document.getElementById("editorCard"),

    buildList: document.getElementById("buildList"),
    buildHint: document.getElementById("buildHint"),
    upgradePanel: document.getElementById("upgradePanel"),
    btnUpgrade: document.getElementById("btnUpgrade"),
    btnSell: document.getElementById("btnSell"),

    editCols: document.getElementById("editCols"),
    editRows: document.getElementById("editRows"),
    btnApplyGrid: document.getElementById("btnApplyGrid"),
    paintTools: document.getElementById("paintTools"),

    maxLevelInput: document.getElementById("maxLevelInput"),
    btnApplyLevels: document.getElementById("btnApplyLevels"),
    towerLevelTable: document.getElementById("towerLevelTable"),
    towerBaseTable: document.getElementById("towerBaseTable"),
    enemyTable: document.getElementById("enemyTable"),

    btnGenerate: document.getElementById("btnGenerate"),
    btnLoad: document.getElementById("btnLoad"),
    configText: document.getElementById("configText"),
};

const scene = document.getElementById("scene");
const gridG = document.getElementById("grid");
const pathG = document.getElementById("path");
const towersG = document.getElementById("towers");
const bulletsG = document.getElementById("bullets");
const enemiesG = document.getElementById("enemiesLayer");

const NS = "http://www.w3.org/2000/svg";

const CELL = {
    EMPTY: "empty",
    PATH: "path",
    OBSTACLE: "obstacle",
    START: "start",
    END: "end",
};

const CONFIG = {
    tile: 56,
    livesStart: 20,
    goldStart: 120,
    autoNextWaveDelay: 2.2,
};

const DEFAULT_TOWER_TYPES = {
    rifle: { id: "rifle", name: "Rifle", color: "#6ec5ff", cost: 30, damage: 10, fireRate: 2.4, rangeTiles: 2.9, bulletSpeedTiles: 9.5, bulletRadius: 4 },
    rapid: { id: "rapid", name: "Rapid", color: "#8ee38a", cost: 40, damage: 5, fireRate: 5.4, rangeTiles: 2.4, bulletSpeedTiles: 10.8, bulletRadius: 3 },
    sniper: { id: "sniper", name: "Sniper", color: "#ffcc66", cost: 55, damage: 30, fireRate: 0.75, rangeTiles: 4.6, bulletSpeedTiles: 14.5, bulletRadius: 5 },
};

const DEFAULT_ENEMY_TYPES = {
    scout: {
        id: "scout", name: "Scout", color: "rgba(120,235,180,0.9)", shape: "scout", size: 0.9,
        baseHp: 24, baseSpeedTiles: 1.55, reward: 6, leak: 1,
        startWave: 1, countBase: 2, countMul: 1.08, hpMul: 1.08, speedMul: 1.02,
    },
    grunt: {
        id: "grunt", name: "Grunt", color: "rgba(88,205,230,0.88)", shape: "grunt", size: 1,
        baseHp: 34, baseSpeedTiles: 1.1, reward: 8, leak: 1,
        startWave: 1, countBase: 4, countMul: 1.1, hpMul: 1.1, speedMul: 1.015,
    },
    raider: {
        id: "raider", name: "Raider", color: "rgba(255,142,106,0.9)", shape: "raider", size: 1.05,
        baseHp: 44, baseSpeedTiles: 1.25, reward: 10, leak: 2,
        startWave: 4, countBase: 2, countMul: 1.08, hpMul: 1.1, speedMul: 1.02,
    },
    tank: {
        id: "tank", name: "Tank", color: "rgba(180,160,255,0.86)", shape: "tank", size: 1.18,
        baseHp: 92, baseSpeedTiles: 0.72, reward: 14, leak: 2,
        startWave: 5, countBase: 1, countMul: 1.06, hpMul: 1.12, speedMul: 1.01,
    },
    juggernaut: {
        id: "juggernaut", name: "Juggernaut", color: "rgba(255,92,124,0.86)", shape: "juggernaut", size: 1.28,
        baseHp: 230, baseSpeedTiles: 0.55, reward: 30, leak: 4,
        startWave: 8, countBase: 0, countMul: 1.05, hpMul: 1.16, speedMul: 1.01,
    },
};

const DEFAULT_LEVEL_RULES = [
    { level: 2, gold: 1.35, damage: 1.32, rate: 1.14, range: 1.08 },
    { level: 3, gold: 1.45, damage: 1.38, rate: 1.12, range: 1.1 },
];

const STATE = {
    mode: "game",
    running: false,
    startedOnce: false,
    tPrev: performance.now(),

    cols: 16,
    rows: 10,
    cells: [],
    start: null,
    end: null,

    wave: 1,
    lives: CONFIG.livesStart,
    gold: CONFIG.goldStart,

    towers: [],
    enemies: [],
    bullets: [],
    towerMap: new Map(),

    spawn: { active: false, queue: [], spawned: 0, cooldown: 0, nextWaveCd: 0 },

    selectedBuildType: "rifle",
    selectedTowerId: null,
    hoveredCell: null,

    paintTool: "empty",
    painting: false,
    lastPaintCell: null,

    settings: {
        maxTowerLevel: 3,
        towerLevelRules: structuredClone(DEFAULT_LEVEL_RULES),
        towerTypes: structuredClone(DEFAULT_TOWER_TYPES),
        enemyTypes: structuredClone(DEFAULT_ENEMY_TYPES),
    },
};

const PLACEMENT_PREVIEW = (() => {
    const ring = svgEl("circle", {
        cx: -9999,
        cy: -9999,
        r: 12,
        fill: "none",
        stroke: "rgba(255,186,96,0.9)",
        "stroke-width": 2.5,
        "stroke-dasharray": "7 5",
        opacity: 0,
    });
    const center = svgEl("circle", {
        cx: -9999,
        cy: -9999,
        r: 4,
        fill: "rgba(255,186,96,0.42)",
        stroke: "rgba(255,212,140,0.92)",
        "stroke-width": 1.2,
        opacity: 0,
    });
    towersG.appendChild(ring);
    towersG.appendChild(center);
    return { ring, center };
})();
pathG.setAttribute("pointer-events", "none");

function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function format1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
function cellKey(c, r) { return `${c},${r}`; }
function toIndex(c, r) { return r * STATE.cols + c; }
function inBounds(c, r) { return c >= 0 && r >= 0 && c < STATE.cols && r < STATE.rows; }

function setNote(msg) { UI.note.textContent = msg; }

function cellToCenter(c, r) {
    return { x: c * CONFIG.tile + CONFIG.tile / 2, y: r * CONFIG.tile + CONFIG.tile / 2 };
}

function getCell(c, r) {
    if (!inBounds(c, r)) return CELL.OBSTACLE;
    return STATE.cells[toIndex(c, r)];
}

function setCell(c, r, type) {
    if (!inBounds(c, r)) return;
    STATE.cells[toIndex(c, r)] = type;
}

function resetMap(cols, rows) {
    STATE.cols = cols;
    STATE.rows = rows;
    STATE.cells = new Array(cols * rows).fill(CELL.EMPTY);

    const mid = Math.floor(rows / 2);
    STATE.start = { c: 0, r: mid };
    STATE.end = { c: cols - 1, r: mid };

    for (let c = 1; c < cols - 1; c++) setCell(c, mid, CELL.PATH);
    setCell(STATE.start.c, STATE.start.r, CELL.START);
    setCell(STATE.end.c, STATE.end.r, CELL.END);

    refreshSceneSize();
}

function refreshSceneSize() {
    const w = STATE.cols * CONFIG.tile;
    const h = STATE.rows * CONFIG.tile;
    scene.setAttribute("viewBox", `0 0 ${w} ${h}`);
    scene.setAttribute("width", w);
    scene.setAttribute("height", h);
}

function clearEntities() {
    for (const t of STATE.towers) {
        t.el.remove(); t.ring.remove(); t.selectRing.remove();
    }
    for (const e of STATE.enemies) e.el.remove();
    for (const b of STATE.bullets) b.el.remove();

    STATE.towers = [];
    STATE.enemies = [];
    STATE.bullets = [];
    STATE.towerMap = new Map();
    STATE.selectedTowerId = null;
}

function resetGameState() {
    clearEntities();
    STATE.running = false;
    STATE.startedOnce = false;
    STATE.wave = 1;
    STATE.lives = CONFIG.livesStart;
    STATE.gold = CONFIG.goldStart;
    STATE.spawn = { active: false, queue: [], spawned: 0, cooldown: 0, nextWaveCd: 0 };
    hidePlacementPreview();
    setNote("Ready.");
}

function isPassableForPath(type) {
    return type === CELL.PATH || type === CELL.START || type === CELL.END;
}

function computePathPoints() {
    if (!STATE.start || !STATE.end) return null;

    const q = [{ c: STATE.start.c, r: STATE.start.r }];
    const prev = new Map();
    const seen = new Set([cellKey(STATE.start.c, STATE.start.r)]);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

    while (q.length > 0) {
        const cur = q.shift();
        if (cur.c === STATE.end.c && cur.r === STATE.end.r) break;

        for (const [dc, dr] of dirs) {
            const nc = cur.c + dc;
            const nr = cur.r + dr;
            if (!inBounds(nc, nr)) continue;
            const key = cellKey(nc, nr);
            if (seen.has(key)) continue;
            if (!isPassableForPath(getCell(nc, nr))) continue;
            seen.add(key);
            prev.set(key, cellKey(cur.c, cur.r));
            q.push({ c: nc, r: nr });
        }
    }

    const endKey = cellKey(STATE.end.c, STATE.end.r);
    if (!seen.has(endKey)) return null;

    const rev = [];
    let curKey = endKey;
    while (curKey) {
        const [c, r] = curKey.split(",").map(Number);
        rev.push({ c, r });
        curKey = prev.get(curKey);
    }
    rev.reverse();
    return rev.map((p) => cellToCenter(p.c, p.r));
}

function drawStartMarker(c, r) {
    const p = cellToCenter(c, r);
    const g = svgEl("g", {});
    g.appendChild(svgEl("circle", {
        cx: p.x, cy: p.y, r: 13,
        fill: "rgba(67,214,146,0.22)",
        stroke: "rgba(67,214,146,0.96)",
        "stroke-width": 2,
    }));
    g.appendChild(svgEl("path", {
        d: `M ${p.x - 5} ${p.y} L ${p.x + 4} ${p.y} M ${p.x + 4} ${p.y} L ${p.x} ${p.y - 4} M ${p.x + 4} ${p.y} L ${p.x} ${p.y + 4}`,
        stroke: "rgba(67,214,146,0.96)",
        "stroke-width": 2.4,
        "stroke-linecap": "round",
        fill: "none",
    }));
    pathG.appendChild(g);
}

function drawEndMarker(c, r) {
    const p = cellToCenter(c, r);
    const g = svgEl("g", {});
    g.appendChild(svgEl("circle", {
        cx: p.x, cy: p.y, r: 13,
        fill: "rgba(255,102,129,0.2)",
        stroke: "rgba(255,102,129,0.94)",
        "stroke-width": 2,
    }));
    g.appendChild(svgEl("circle", {
        cx: p.x, cy: p.y, r: 4.2,
        fill: "rgba(255,102,129,0.94)",
    }));
    pathG.appendChild(g);
}

function drawGrid() {
    gridG.innerHTML = "";
    pathG.innerHTML = "";

    for (let r = 0; r < STATE.rows; r++) {
        for (let c = 0; c < STATE.cols; c++) {
            const type = getCell(c, r);
            const x = c * CONFIG.tile;
            const y = r * CONFIG.tile;

            let fill = "rgba(255,255,255,0.02)";
            if (type === CELL.PATH) fill = "rgba(255,255,255,0.065)";
            if (type === CELL.OBSTACLE) fill = "rgba(255,255,255,0.12)";
            if (type === CELL.START) fill = "rgba(67,214,146,0.12)";
            if (type === CELL.END) fill = "rgba(255,102,129,0.12)";

            const rect = svgEl("rect", {
                x, y,
                width: CONFIG.tile,
                height: CONFIG.tile,
                fill,
                stroke: "rgba(255,255,255,0.08)",
            });

            rect.style.cursor = STATE.mode === "edit" ? "crosshair" : "pointer";
            rect.addEventListener("mousedown", (ev) => onCellPointerDown(ev, c, r));
            rect.addEventListener("mouseenter", () => onCellPointerEnter(c, r));
            rect.addEventListener("mouseleave", () => onCellPointerLeave(c, r));
            rect.addEventListener("click", () => {
                if (STATE.mode === "game") onGridClick(c, r);
            });

            gridG.appendChild(rect);
        }
    }

    for (let r = 0; r < STATE.rows; r++) {
        for (let c = 0; c < STATE.cols; c++) {
            const type = getCell(c, r);
            const x = c * CONFIG.tile;
            const y = r * CONFIG.tile;
            if (type === CELL.PATH) {
                pathG.appendChild(svgEl("rect", {
                    x: x + 5, y: y + 5,
                    width: CONFIG.tile - 10,
                    height: CONFIG.tile - 10,
                    rx: 10,
                    fill: "rgba(255,255,255,0.06)",
                    stroke: "rgba(255,255,255,0.11)",
                }));
            }
        }
    }

    if (STATE.start) drawStartMarker(STATE.start.c, STATE.start.r);
    if (STATE.end) drawEndMarker(STATE.end.c, STATE.end.r);

    const points = computePathPoints();
    if (points && points.length > 1) {
        pathG.appendChild(svgEl("polyline", {
            points: points.map((p) => `${p.x},${p.y}`).join(" "),
            fill: "none",
            stroke: "rgba(255,255,255,0.14)",
            "stroke-width": 5,
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
        }));
    }
}

function onCellPointerDown(ev, c, r) {
    if (STATE.mode !== "edit") return;
    ev.preventDefault();
    if (STATE.paintTool === "path") {
        STATE.painting = true;
        STATE.lastPaintCell = { c, r };
        applyToolAt(c, r, { behavior: "toggle" });
        return;
    }

    STATE.painting = false;
    STATE.lastPaintCell = null;
    applyToolAt(c, r, { behavior: "toggle" });
}

function applyPaintSegment(from, to) {
    let changed = false;
    if (from.c === to.c) {
        const [a, b] = from.r < to.r ? [from.r, to.r] : [to.r, from.r];
        for (let r = a; r <= b; r++) changed = applyToolAt(to.c, r, { redraw: false, behavior: "paint" }) || changed;
        if (changed) { drawGrid(); syncUI(); }
        return;
    }
    if (from.r === to.r) {
        const [a, b] = from.c < to.c ? [from.c, to.c] : [to.c, from.c];
        for (let c = a; c <= b; c++) changed = applyToolAt(c, to.r, { redraw: false, behavior: "paint" }) || changed;
        if (changed) { drawGrid(); syncUI(); }
        return;
    }

    const stepC = to.c > from.c ? 1 : -1;
    const stepR = to.r > from.r ? 1 : -1;
    for (let c = from.c; c !== to.c; c += stepC) changed = applyToolAt(c, from.r, { redraw: false, behavior: "paint" }) || changed;
    for (let r = from.r; r !== to.r; r += stepR) changed = applyToolAt(to.c, r, { redraw: false, behavior: "paint" }) || changed;
    changed = applyToolAt(to.c, to.r, { redraw: false, behavior: "paint" }) || changed;
    if (changed) { drawGrid(); syncUI(); }
}

function onCellPointerEnter(c, r) {
    if (STATE.mode === "edit") {
        if (STATE.paintTool !== "path") return;
        if (!STATE.painting) return;
        applyPaintSegment(STATE.lastPaintCell, { c, r });
        STATE.lastPaintCell = { c, r };
        return;
    }
    showPlacementPreview(c, r);
}

function onCellPointerLeave() {
    if (STATE.mode !== "game") return;
    hidePlacementPreview();
}

function moveStart(c, r) {
    if (STATE.start) {
        const t = getCell(STATE.start.c, STATE.start.r);
        if (t === CELL.START) setCell(STATE.start.c, STATE.start.r, CELL.EMPTY);
    }
    if (STATE.end && STATE.end.c === c && STATE.end.r === r) {
        STATE.end = null;
    }
    STATE.start = { c, r };
    setCell(c, r, CELL.START);
}

function moveEnd(c, r) {
    if (STATE.end) {
        const t = getCell(STATE.end.c, STATE.end.r);
        if (t === CELL.END) setCell(STATE.end.c, STATE.end.r, CELL.EMPTY);
    }
    if (STATE.start && STATE.start.c === c && STATE.start.r === r) {
        STATE.start = null;
    }
    STATE.end = { c, r };
    setCell(c, r, CELL.END);
}

function applyToolAt(c, r, opts = {}) {
    const redraw = opts.redraw !== false;
    const behavior = opts.behavior || "toggle"; // toggle | paint
    if (!inBounds(c, r)) return;

    const prevType = getCell(c, r);
    const tool = STATE.paintTool;
    let changed = false;

    if (tool === "start") {
        if (prevType === CELL.START) {
            setCell(c, r, CELL.EMPTY);
            STATE.start = null;
            changed = true;
        } else {
            moveStart(c, r);
            changed = true;
        }
    } else if (tool === "end") {
        if (prevType === CELL.END) {
            setCell(c, r, CELL.EMPTY);
            STATE.end = null;
            changed = true;
        } else {
            moveEnd(c, r);
            changed = true;
        }
    } else {
        if (prevType === CELL.START) STATE.start = null;
        if (prevType === CELL.END) STATE.end = null;

        const targetType = tool === "path" ? CELL.PATH : tool === "obstacle" ? CELL.OBSTACLE : CELL.EMPTY;
        const nextType = behavior === "paint"
            ? targetType
            : (prevType === targetType ? CELL.EMPTY : targetType);
        if (prevType !== nextType) {
            setCell(c, r, nextType);
            changed = true;
        }
    }

    if (changed && redraw) {
        drawGrid();
        syncUI();
    }
    return changed;
}

window.addEventListener("mouseup", () => {
    STATE.painting = false;
    STATE.lastPaintCell = null;
});

function clearAllToEmpty() {
    STATE.cells.fill(CELL.EMPTY);
    STATE.start = null;
    STATE.end = null;
    clearEntities();
    drawGrid();
    syncUI();
    setNote("Grid cleared.");
}

function towerIconHTML(typeId, mini = false) {
    return `<span class="tower-icon ${typeId} ${mini ? "mini" : ""}" aria-hidden="true"></span>`;
}

function renderBuildOptions() {
    UI.buildList.innerHTML = "";

    for (const type of Object.values(STATE.settings.towerTypes)) {
        const btn = document.createElement("button");
        btn.className = "build-btn";
        btn.dataset.type = type.id;
        btn.innerHTML = `<span class="tower-label">${towerIconHTML(type.id)}<b>${type.name}</b></span><span class="cost">${Math.round(type.cost)}g</span>`;
        btn.addEventListener("click", () => {
            STATE.selectedBuildType = type.id;
            refreshBuildSelection();
        });
        UI.buildList.appendChild(btn);
    }

    refreshBuildSelection();
}

function refreshBuildSelection() {
    for (const btn of UI.buildList.querySelectorAll("button")) {
        btn.classList.toggle("active", btn.dataset.type === STATE.selectedBuildType);
    }

    const t = STATE.settings.towerTypes[STATE.selectedBuildType];
    if (!t) return;
    UI.hint.textContent = `Build: ${t.name} (${Math.round(t.cost)}g). Click empty tile.`;
    UI.buildHint.textContent = `${t.name}: DMG ${format1(t.damage)}, RNG ${format1(t.rangeTiles)}, RATE ${format1(t.fireRate)}/s`;

    if (STATE.hoveredCell) showPlacementPreview(STATE.hoveredCell.c, STATE.hoveredCell.r);
}

function canPlaceTowerAt(c, r) {
    return getCell(c, r) === CELL.EMPTY && !STATE.towerMap.has(cellKey(c, r));
}

function hidePlacementPreview() {
    STATE.hoveredCell = null;
    PLACEMENT_PREVIEW.ring.setAttribute("opacity", "0");
    PLACEMENT_PREVIEW.center.setAttribute("opacity", "0");
}

function showPlacementPreview(c, r) {
    if (STATE.mode !== "game") return;
    if (!canPlaceTowerAt(c, r)) {
        hidePlacementPreview();
        return;
    }

    STATE.hoveredCell = { c, r };
    const p = cellToCenter(c, r);
    const t = STATE.settings.towerTypes[STATE.selectedBuildType];

    PLACEMENT_PREVIEW.ring.setAttribute("cx", String(p.x));
    PLACEMENT_PREVIEW.ring.setAttribute("cy", String(p.y));
    PLACEMENT_PREVIEW.ring.setAttribute("r", String(t.rangeTiles * CONFIG.tile));
    PLACEMENT_PREVIEW.ring.setAttribute("opacity", "1");

    PLACEMENT_PREVIEW.center.setAttribute("cx", String(p.x));
    PLACEMENT_PREVIEW.center.setAttribute("cy", String(p.y));
    PLACEMENT_PREVIEW.center.setAttribute("opacity", "1");
}

function buildTowerVisual(center, color) {
    const root = svgEl("g", {});

    const base = svgEl("circle", {
        cx: center.x, cy: center.y, r: 14,
        fill: "rgba(255,255,255,0.11)",
        stroke: "rgba(255,255,255,0.25)",
        "stroke-width": 2,
    });

    const core = svgEl("circle", {
        cx: center.x, cy: center.y, r: 8,
        fill: "rgba(0,0,0,0.2)",
        stroke: "rgba(255,255,255,0.25)",
        "stroke-width": 1.5,
    });

    const aim = svgEl("g", {});
    const head = svgEl("circle", {
        cx: center.x, cy: center.y, r: 9,
        fill: "rgba(255,255,255,0.14)",
        stroke: color,
        "stroke-width": 2,
    });
    const barrel = svgEl("rect", {
        x: center.x - 3, y: center.y - 23, width: 6, height: 17, rx: 2, fill: color,
    });

    const levelHalo = svgEl("circle", {
        cx: center.x, cy: center.y, r: 17.5,
        fill: "none", stroke: color, "stroke-width": 1.8, opacity: 0,
    });

    const levelPips = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => svgEl("circle", {
        cx: center.x - 14 + i * 4,
        cy: center.y - 19,
        r: 1.7,
        fill: color,
        opacity: 0.15,
    }));

    aim.appendChild(head);
    aim.appendChild(barrel);

    root.appendChild(base);
    root.appendChild(core);
    root.appendChild(levelHalo);
    for (const p of levelPips) root.appendChild(p);
    root.appendChild(aim);

    return { root, aim, head, barrel, levelHalo, levelPips };
}

function applyTowerLevelVisual(tower) {
    const bonus = tower.level - 1;
    tower.barrel.setAttribute("height", String(17 + bonus * 1.8));
    tower.barrel.setAttribute("y", String(tower.pos.y - 23 - bonus));
    tower.head.setAttribute("r", String(9 + bonus * 0.45));
    tower.levelHalo.setAttribute("opacity", String(clamp(0.24 + tower.level * 0.11, 0, 0.95)));
    tower.levelHalo.setAttribute("stroke-width", String(1.3 + tower.level * 0.25));

    for (let i = 0; i < tower.levelPips.length; i++) {
        tower.levelPips[i].setAttribute("opacity", i < tower.level ? "0.95" : "0.1");
    }
}

function onGridClick(c, r) {
    if (STATE.mode !== "game") return;

    const key = cellKey(c, r);
    if (STATE.towerMap.has(key)) {
        selectTower(STATE.towerMap.get(key));
        return;
    }

    if (!canPlaceTowerAt(c, r)) {
        setNote("Cannot build here.");
        return;
    }

    const type = STATE.settings.towerTypes[STATE.selectedBuildType];
    if (!type) return;

    if (STATE.gold < type.cost) {
        setNote("Not enough gold.");
        return;
    }

    STATE.gold -= type.cost;
    placeTower(c, r, type.id);
    hidePlacementPreview();
    setNote(`${type.name} built.`);
    syncUI();
}

function placeTower(c, r, typeId) {
    const type = STATE.settings.towerTypes[typeId];
    const center = cellToCenter(c, r);
    const id = crypto.randomUUID();
    const visual = buildTowerVisual(center, type.color);

    const rangePx = type.rangeTiles * CONFIG.tile;
    const ring = svgEl("circle", {
        cx: center.x, cy: center.y, r: rangePx,
        fill: "none", stroke: "rgba(79,139,255,0.2)", "stroke-width": 2,
        "stroke-dasharray": "6 6", opacity: 0,
    });

    const selectRing = svgEl("circle", {
        cx: center.x, cy: center.y, r: 20,
        fill: "none", stroke: "rgba(255,224,120,0.95)", "stroke-width": 2.5,
        "stroke-dasharray": "5 4", opacity: 0,
    });

    visual.root.style.cursor = "pointer";
    visual.root.addEventListener("click", (ev) => {
        ev.stopPropagation();
        selectTower(id);
    });
    visual.root.addEventListener("mouseenter", () => {
        if (STATE.selectedTowerId !== id) ring.setAttribute("opacity", "1");
    });
    visual.root.addEventListener("mouseleave", () => {
        if (STATE.selectedTowerId !== id) ring.setAttribute("opacity", "0");
    });

    towersG.appendChild(ring);
    towersG.appendChild(selectRing);
    towersG.appendChild(visual.root);

    const tower = {
        id,
        c, r,
        pos: center,
        typeId,
        typeName: type.name,
        color: type.color,
        level: 1,
        spent: type.cost,
        fireCd: 0,
        damage: type.damage,
        fireRate: type.fireRate,
        range: rangePx,
        bulletSpeed: type.bulletSpeedTiles * CONFIG.tile,
        bulletRadius: type.bulletRadius,
        nextUpgradeCost: 0,
        el: visual.root,
        aimEl: visual.aim,
        head: visual.head,
        barrel: visual.barrel,
        levelHalo: visual.levelHalo,
        levelPips: visual.levelPips,
        ring,
        selectRing,
    };
    const firstRule = getNextLevelRule(tower);
    const firstGoldMul = firstRule ? Math.max(1, Number(firstRule.gold) || 1) : 1;
    tower.nextUpgradeCost = firstRule ? Math.round(type.cost * firstGoldMul) : 0;

    applyTowerLevelVisual(tower);

    STATE.towers.push(tower);
    STATE.towerMap.set(cellKey(c, r), id);
    selectTower(id);
}

function findTowerById(id) {
    return STATE.towers.find((t) => t.id === id) || null;
}

function selectTower(id) {
    STATE.selectedTowerId = id;
    for (const t of STATE.towers) {
        const selected = t.id === id;
        t.selectRing.setAttribute("opacity", selected ? "1" : "0");
        t.ring.setAttribute("opacity", selected ? "1" : "0");
    }
    renderUpgradePanel();
}

function removeTower(tower, refund = true) {
    tower.el.remove();
    tower.ring.remove();
    tower.selectRing.remove();
    const idx = STATE.towers.findIndex((t) => t.id === tower.id);
    if (idx >= 0) STATE.towers.splice(idx, 1);
    STATE.towerMap.delete(cellKey(tower.c, tower.r));

    if (refund) {
        const money = Math.round(tower.spent * 0.65);
        STATE.gold += money;
        setNote(`Sold: +${money}g`);
    }

    if (STATE.selectedTowerId === tower.id) STATE.selectedTowerId = null;
    renderUpgradePanel();
}

function getNextLevelRule(tower) {
    const targetLevel = tower.level + 1;
    return STATE.settings.towerLevelRules.find((r) => r.level === targetLevel) || null;
}

function upgradeSelectedTower() {
    const tower = findTowerById(STATE.selectedTowerId);
    if (!tower) return;

    if (tower.level >= STATE.settings.maxTowerLevel) {
        setNote("Already max level.");
        return;
    }

    const rule = getNextLevelRule(tower);
    if (!rule) {
        setNote("Missing level rule.");
        return;
    }

    const need = Math.max(1, Math.round(tower.nextUpgradeCost || 0));
    if (STATE.gold < need) {
        setNote("Not enough gold.");
        return;
    }

    STATE.gold -= need;
    tower.spent += need;
    tower.level += 1;

    tower.damage *= rule.damage;
    tower.fireRate *= rule.rate;
    tower.range *= rule.range;
    const nextRule = getNextLevelRule(tower);
    const nextGoldMul = nextRule ? Math.max(1, Number(nextRule.gold) || 1) : 1;
    tower.nextUpgradeCost = nextRule ? Math.max(1, Math.round(need * nextGoldMul)) : 0;

    tower.ring.setAttribute("r", String(tower.range));
    applyTowerLevelVisual(tower);

    setNote(`${tower.typeName} Lv.${tower.level} upgraded.`);
    syncUI();
}

function renderUpgradePanel() {
    const t = findTowerById(STATE.selectedTowerId);
    if (!t) {
        UI.upgradePanel.innerHTML = "Select a tower.";
        UI.btnUpgrade.disabled = true;
        UI.btnSell.disabled = true;
        return;
    }

    const nextRule = getNextLevelRule(t);
    const isMax = t.level >= STATE.settings.maxTowerLevel;
    const nextCost = Math.max(0, Math.round(t.nextUpgradeCost || 0));

    UI.upgradePanel.innerHTML = [
        `<div class="row"><span>Type</span><b class="tower-type">${towerIconHTML(t.typeId, true)}${t.typeName}</b></div>`,
        `<div class="row"><span>Level</span><b>${t.level}/${STATE.settings.maxTowerLevel}</b></div>`,
        `<div class="row"><span>Damage</span><b>${format1(t.damage)}</b></div>`,
        `<div class="row"><span>Rate</span><b>${format1(t.fireRate)}/s</b></div>`,
        `<div class="row"><span>Range</span><b>${format1(t.range / CONFIG.tile)}</b></div>`,
        `<div class="row"><span>Next</span><b>${isMax ? "MAX" : `${nextCost}g`}</b></div>`,
    ].join("");

    UI.btnUpgrade.disabled = isMax || !nextRule || STATE.gold < nextCost;
    UI.btnSell.disabled = false;
}

function aimTowerAt(tower, targetPos) {
    const dx = targetPos.x - tower.pos.x;
    const dy = targetPos.y - tower.pos.y;
    const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    tower.aimEl.setAttribute("transform", `rotate(${angleDeg} ${tower.pos.x} ${tower.pos.y})`);
}

function fireBullet(tower, targetEnemy) {
    const id = crypto.randomUUID();
    const shot = svgEl("circle", {
        cx: tower.pos.x,
        cy: tower.pos.y,
        r: tower.bulletRadius,
        fill: tower.color,
        opacity: 0.95,
    });
    bulletsG.appendChild(shot);

    STATE.bullets.push({
        id,
        pos: { x: tower.pos.x, y: tower.pos.y },
        speed: tower.bulletSpeed,
        damage: tower.damage,
        radius: tower.bulletRadius,
        targetId: targetEnemy.id,
        el: shot,
    });
}

function updateBullets(dt) {
    for (let i = STATE.bullets.length - 1; i >= 0; i--) {
        const b = STATE.bullets[i];
        const target = STATE.enemies.find((e) => e.id === b.targetId);
        if (!target) {
            b.el.remove();
            STATE.bullets.splice(i, 1);
            continue;
        }

        const dx = target.pos.x - b.pos.x;
        const dy = target.pos.y - b.pos.y;
        const d = Math.hypot(dx, dy);
        const hitDist = target.hitRadius + b.radius + 2;

        if (d <= hitDist) {
            target.hp -= b.damage;
            if (target.hp <= 0) {
                const idx = STATE.enemies.findIndex((e) => e.id === target.id);
                if (idx >= 0) killEnemy(idx, true);
            }
            b.el.remove();
            STATE.bullets.splice(i, 1);
            continue;
        }

        const nx = dx / (d || 1);
        const ny = dy / (d || 1);
        b.pos.x += nx * b.speed * dt;
        b.pos.y += ny * b.speed * dt;

        b.el.setAttribute("cx", String(b.pos.x));
        b.el.setAttribute("cy", String(b.pos.y));
    }
}

function createEnemyVisual(type) {
    const root = svgEl("g", {});
    const body = svgEl("g", {});

    if (type.shape === "scout") {
        body.appendChild(svgEl("polygon", {
            points: "-14,1 -3,-12 10,-2 6,12 -10,10",
            fill: type.color,
            stroke: "rgba(255,255,255,0.26)",
            "stroke-width": 1.6,
        }));
        body.appendChild(svgEl("circle", { cx: 6, cy: -1, r: 2.6, fill: "rgba(255,255,255,0.85)" }));
    } else if (type.shape === "grunt") {
        body.appendChild(svgEl("rect", {
            x: -13, y: -10, width: 26, height: 20, rx: 6,
            fill: type.color,
            stroke: "rgba(255,255,255,0.26)",
            "stroke-width": 1.7,
        }));
        body.appendChild(svgEl("circle", { cx: -5, cy: -1, r: 2.3, fill: "rgba(255,255,255,0.85)" }));
        body.appendChild(svgEl("circle", { cx: 5, cy: -1, r: 2.3, fill: "rgba(255,255,255,0.85)" }));
    } else if (type.shape === "raider") {
        body.appendChild(svgEl("path", {
            d: "M -14 8 L -6 -10 L 6 -10 L 14 8 L 0 12 Z",
            fill: type.color,
            stroke: "rgba(255,255,255,0.26)",
            "stroke-width": 1.7,
        }));
        body.appendChild(svgEl("rect", { x: -2, y: -7, width: 4, height: 8, rx: 1.5, fill: "rgba(255,255,255,0.84)" }));
    } else if (type.shape === "tank") {
        body.appendChild(svgEl("rect", {
            x: -16, y: -11, width: 32, height: 22, rx: 5,
            fill: type.color,
            stroke: "rgba(255,255,255,0.26)",
            "stroke-width": 1.9,
        }));
        body.appendChild(svgEl("rect", { x: -7, y: -15, width: 14, height: 8, rx: 3, fill: "rgba(255,255,255,0.32)" }));
    } else {
        body.appendChild(svgEl("path", {
            d: "M 0 -16 L 12 -8 L 14 5 L 6 15 L -6 15 L -14 5 L -12 -8 Z",
            fill: type.color,
            stroke: "rgba(255,255,255,0.26)",
            "stroke-width": 2.1,
        }));
        body.appendChild(svgEl("circle", { cx: 0, cy: -1, r: 4.1, fill: "rgba(255,255,255,0.82)" }));
    }

    body.setAttribute("transform", `scale(${type.size})`);

    const hpBg = svgEl("rect", {
        x: -18, y: -24, width: 36, height: 5, rx: 2,
        fill: "rgba(255,255,255,0.12)",
    });
    const hpFg = svgEl("rect", {
        x: -18, y: -24, width: 36, height: 5, rx: 2,
        fill: "rgba(54,211,153,0.74)",
    });

    root.appendChild(hpBg);
    root.appendChild(hpFg);
    root.appendChild(body);
    enemiesG.appendChild(root);

    return { root, hpFg };
}

function makeEnemy(typeId) {
    const type = STATE.settings.enemyTypes[typeId];
    if (!type || !STATE.start) return null;

    const p0 = cellToCenter(STATE.start.c, STATE.start.r);

    const step = Math.max(0, STATE.wave - type.startWave);
    const hp = type.baseHp * Math.pow(type.hpMul, step);
    const speedTiles = type.baseSpeedTiles * Math.pow(type.speedMul, step);

    const visual = createEnemyVisual(type);

    const enemy = {
        id: crypto.randomUUID(),
        type,
        pos: { x: p0.x, y: p0.y },
        pathIndex: 0,
        speedPx: Math.max(0.25, speedTiles) * CONFIG.tile,
        hp: Math.max(1, hp),
        hpMax: Math.max(1, hp),
        reward: Math.round(type.reward),
        leak: Math.round(type.leak),
        hitRadius: 12 * type.size,
        el: visual.root,
        hpFg: visual.hpFg,
    };

    updateEnemyVisual(enemy);
    return enemy;
}

function updateEnemyVisual(enemy) {
    enemy.el.setAttribute("transform", `translate(${enemy.pos.x} ${enemy.pos.y})`);
    const w = clamp((enemy.hp / enemy.hpMax) * 36, 0, 36);
    enemy.hpFg.setAttribute("width", String(w));
}

function killEnemy(idx, reward = true) {
    const e = STATE.enemies[idx];
    if (!e) return;
    e.el.remove();
    STATE.enemies.splice(idx, 1);
    if (reward) STATE.gold += e.reward;
}

function enemyReachedEnd(idx) {
    const e = STATE.enemies[idx];
    if (!e) return;

    e.el.remove();
    STATE.enemies.splice(idx, 1);
    STATE.lives -= e.leak;
    setNote(`${e.type.name} leaked. -${e.leak} life`);

    if (STATE.lives <= 0) {
        STATE.lives = 0;
        STATE.running = false;
        setNote("Game Over.");
    }
}

function composeWave(wave) {
    const queue = [];
    const enemies = Object.values(STATE.settings.enemyTypes).sort((a, b) => a.startWave - b.startWave);

    for (const e of enemies) {
        if (wave < e.startWave) continue;
        const step = Math.max(0, wave - e.startWave);
        const count = Math.floor(e.countBase * Math.pow(e.countMul, step));
        if (count <= 0) continue;
        for (let i = 0; i < count; i++) {
            const interval = clamp(0.58 - wave * 0.01 + i * 0.002, 0.2, 0.75);
            queue.push({ typeId: e.id, interval });
        }
    }

    if (queue.length === 0) {
        for (let i = 0; i < 5; i++) queue.push({ typeId: "grunt", interval: 0.45 });
    }

    return queue;
}

function summarizeWave(queue) {
    const m = new Map();
    for (const q of queue) m.set(q.typeId, (m.get(q.typeId) || 0) + 1);
    return Array.from(m.entries()).map(([id, n]) => `${STATE.settings.enemyTypes[id].name} x${n}`).join(", ");
}

function canRunPath() {
    const points = computePathPoints();
    if (!points || points.length < 2) {
        setNote("Invalid path. Set connected Start -> End path.");
        return false;
    }
    return true;
}

function spawnWave() {
    if (!canRunPath()) return;
    if (STATE.spawn.active) {
        setNote("Wave already active.");
        return;
    }

    const queue = composeWave(STATE.wave);
    STATE.spawn.active = true;
    STATE.spawn.queue = queue;
    STATE.spawn.spawned = 0;
    STATE.spawn.cooldown = 0;
    STATE.spawn.nextWaveCd = 0;

    setNote(`Wave ${STATE.wave}: ${summarizeWave(queue)}`);
}

function updateSpawner(dt) {
    if (!STATE.spawn.active) {
        if (STATE.running && STATE.enemies.length === 0 && STATE.spawn.nextWaveCd > 0) {
            STATE.spawn.nextWaveCd -= dt;
            if (STATE.spawn.nextWaveCd <= 0) spawnWave();
        }
        return;
    }

    STATE.spawn.cooldown -= dt;
    if (STATE.spawn.cooldown > 0) return;

    if (STATE.spawn.queue.length > 0) {
        const next = STATE.spawn.queue.shift();
        const e = makeEnemy(next.typeId);
        if (e) STATE.enemies.push(e);
        STATE.spawn.spawned += 1;
        STATE.spawn.cooldown = next.interval;
        return;
    }

    if (STATE.enemies.length === 0) {
        STATE.spawn.active = false;
        STATE.wave += 1;
        STATE.spawn.nextWaveCd = CONFIG.autoNextWaveDelay;
        setNote(`Wave clear. Next in ${CONFIG.autoNextWaveDelay.toFixed(1)}s`);
    }
}

function updateEnemies(dt) {
    const pathPoints = computePathPoints();
    if (!pathPoints || pathPoints.length < 2) return;

    for (let i = STATE.enemies.length - 1; i >= 0; i--) {
        const e = STATE.enemies[i];

        const nextIndex = e.pathIndex + 1;
        if (nextIndex >= pathPoints.length) {
            enemyReachedEnd(i);
            continue;
        }

        const target = pathPoints[nextIndex];
        const dx = target.x - e.pos.x;
        const dy = target.y - e.pos.y;
        const d = Math.hypot(dx, dy);

        if (d < 1.5) {
            e.pathIndex = nextIndex;
            continue;
        }

        const nx = dx / (d || 1);
        const ny = dy / (d || 1);
        e.pos.x += nx * e.speedPx * dt;
        e.pos.y += ny * e.speedPx * dt;

        updateEnemyVisual(e);
    }
}

function updateTowers(dt) {
    const pathPoints = computePathPoints();
    const denom = pathPoints ? Math.max(1, pathPoints.length - 1) : 1;

    for (const t of STATE.towers) {
        t.fireCd -= dt;

        let best = null;
        let bestProgress = -1;

        for (const e of STATE.enemies) {
            const d = dist(t.pos, e.pos);
            if (d > t.range) continue;
            const progress = e.pathIndex / denom;
            if (progress > bestProgress) {
                best = e;
                bestProgress = progress;
            }
        }

        if (!best) continue;

        aimTowerAt(t, best.pos);

        if (t.fireCd <= 0) {
            fireBullet(t, best);
            t.fireCd = 1 / t.fireRate;
        }
    }
}

function updateStartButtonLabel() {
    if (STATE.mode === "edit") {
        UI.btnStart.textContent = "Start";
        return;
    }

    if (!STATE.startedOnce && !STATE.running) {
        UI.btnStart.textContent = "Start";
        return;
    }
    UI.btnStart.textContent = STATE.running ? "Pause" : "Resume";
}

function syncUI() {
    UI.modeLabel.textContent = STATE.mode.toUpperCase();
    UI.wave.textContent = String(STATE.wave);
    UI.lives.textContent = String(STATE.lives);
    UI.gold.textContent = String(Math.round(STATE.gold));
    UI.enemies.textContent = String(STATE.enemies.length);

    const remain = STATE.spawn.active ? STATE.spawn.queue.length : 0;

    UI.debug.textContent = [
        `mode: ${STATE.mode}`,
        `running: ${STATE.running}`,
        `build: ${STATE.settings.towerTypes[STATE.selectedBuildType]?.name || "-"}`,
        `selected: ${findTowerById(STATE.selectedTowerId)?.typeName || "none"}`,
        `grid: ${STATE.cols}x${STATE.rows}`,
        `path: ${computePathPoints() ? "ok" : "invalid"}`,
        `towers: ${STATE.towers.length}`,
        `bullets: ${STATE.bullets.length}`,
        `spawn: ${STATE.spawn.active ? "active" : "idle"} (${STATE.spawn.spawned}/${STATE.spawn.spawned + remain})`,
        `next: ${STATE.spawn.nextWaveCd > 0 ? `${STATE.spawn.nextWaveCd.toFixed(1)}s` : "-"}`,
    ].join("\n");

    updateStartButtonLabel();
    renderUpgradePanel();
}

function tick(now) {
    const dt = clamp((now - STATE.tPrev) / 1000, 0, 0.05);
    STATE.tPrev = now;

    if (STATE.running && STATE.mode === "game") {
        updateSpawner(dt);
        updateEnemies(dt);
        updateTowers(dt);
        updateBullets(dt);
    }

    syncUI();
    requestAnimationFrame(tick);
}

function setMode(mode) {
    STATE.mode = mode;
    const edit = mode === "edit";

    resetGameState();
    setNote(edit ? "Edit mode. Paint map and edit tables." : "Game mode. Press Start.");

    UI.btnMode.textContent = edit ? "Game Mode" : "Edit Mode";
    UI.editorCard.hidden = !edit;
    UI.buildCard.hidden = edit;
    UI.upgradeCard.hidden = edit;

    UI.btnStart.disabled = edit;
    UI.btnNext.disabled = edit;

    UI.hint.textContent = edit
        ? "Editor: choose tool, click-drag on grid."
        : `Build: ${STATE.settings.towerTypes[STATE.selectedBuildType].name} (${Math.round(STATE.settings.towerTypes[STATE.selectedBuildType].cost)}g). Click empty tile.`;

    drawGrid();
    syncUI();
}

function renderLevelRuleTable() {
    const rules = STATE.settings.towerLevelRules;
    const header = `<tr><th>Level</th><th>Gold x</th><th>Damage x</th><th>Rate x</th><th>Range x</th></tr>`;
    const rows = rules.map((r, i) => `
        <tr>
            <td>${r.level}</td>
            <td><input data-kind="lvl" data-i="${i}" data-k="gold" type="number" step="0.01" value="${r.gold}" /></td>
            <td><input data-kind="lvl" data-i="${i}" data-k="damage" type="number" step="0.01" value="${r.damage}" /></td>
            <td><input data-kind="lvl" data-i="${i}" data-k="rate" type="number" step="0.01" value="${r.rate}" /></td>
            <td><input data-kind="lvl" data-i="${i}" data-k="range" type="number" step="0.01" value="${r.range}" /></td>
        </tr>`).join("");
    UI.towerLevelTable.innerHTML = header + rows;
}

function renderTowerBaseTable() {
    const types = Object.values(STATE.settings.towerTypes);
    const header = `<tr><th>Type</th><th>Gold</th><th>Damage</th><th>Rate</th><th>Range</th></tr>`;
    const rows = types.map((t) => `
        <tr>
            <td>${t.name}</td>
            <td><input data-kind="tower" data-id="${t.id}" data-k="cost" type="number" step="1" value="${t.cost}" /></td>
            <td><input data-kind="tower" data-id="${t.id}" data-k="damage" type="number" step="0.1" value="${t.damage}" /></td>
            <td><input data-kind="tower" data-id="${t.id}" data-k="fireRate" type="number" step="0.05" value="${t.fireRate}" /></td>
            <td><input data-kind="tower" data-id="${t.id}" data-k="rangeTiles" type="number" step="0.1" value="${t.rangeTiles}" /></td>
        </tr>`).join("");
    UI.towerBaseTable.innerHTML = header + rows;
}

function renderEnemyTable() {
    const enemies = Object.values(STATE.settings.enemyTypes);
    const header = `<tr><th>Enemy</th><th>Start Wave</th><th>Count Base</th><th>Count x</th><th>HP x</th><th>Speed x</th></tr>`;
    const rows = enemies.map((e) => `
        <tr>
            <td>${e.name}</td>
            <td><input data-kind="enemy" data-id="${e.id}" data-k="startWave" type="number" step="1" value="${e.startWave}" /></td>
            <td><input data-kind="enemy" data-id="${e.id}" data-k="countBase" type="number" step="1" value="${e.countBase}" /></td>
            <td><input data-kind="enemy" data-id="${e.id}" data-k="countMul" type="number" step="0.01" value="${e.countMul}" /></td>
            <td><input data-kind="enemy" data-id="${e.id}" data-k="hpMul" type="number" step="0.01" value="${e.hpMul}" /></td>
            <td><input data-kind="enemy" data-id="${e.id}" data-k="speedMul" type="number" step="0.01" value="${e.speedMul}" /></td>
        </tr>`).join("");
    UI.enemyTable.innerHTML = header + rows;
}

function renderEditorPanels() {
    UI.editCols.value = STATE.cols;
    UI.editRows.value = STATE.rows;
    UI.maxLevelInput.value = STATE.settings.maxTowerLevel;
    renderLevelRuleTable();
    renderTowerBaseTable();
    renderEnemyTable();
}

function adjustLevelRules(maxLevel) {
    maxLevel = clamp(Math.round(maxLevel), 2, 8);
    STATE.settings.maxTowerLevel = maxLevel;

    while (STATE.settings.towerLevelRules.length < maxLevel - 1) {
        const prev = STATE.settings.towerLevelRules[STATE.settings.towerLevelRules.length - 1] || { gold: 1.35, damage: 1.2, rate: 1.1, range: 1.08 };
        STATE.settings.towerLevelRules.push({
            level: STATE.settings.towerLevelRules.length + 2,
            gold: prev.gold,
            damage: prev.damage,
            rate: prev.rate,
            range: prev.range,
        });
    }

    if (STATE.settings.towerLevelRules.length > maxLevel - 1) {
        STATE.settings.towerLevelRules = STATE.settings.towerLevelRules.slice(0, maxLevel - 1);
    }

    STATE.settings.towerLevelRules.forEach((r, i) => { r.level = i + 2; });
}

function normalizeLoadedSettings() {
    if (!STATE.settings?.towerLevelRules) STATE.settings.towerLevelRules = structuredClone(DEFAULT_LEVEL_RULES);
    for (const r of STATE.settings.towerLevelRules) {
        if (r.gold == null) {
            if (r.cost != null) {
                const raw = Number(r.cost);
                r.gold = raw > 5 ? 1.35 : Math.max(1, raw);
            } else {
                r.gold = 1.35;
            }
        }
        r.gold = Math.max(1, Number(r.gold) || 1);
        r.damage = Math.max(1, Number(r.damage) || 1);
        r.rate = Math.max(1, Number(r.rate) || 1);
        r.range = Math.max(1, Number(r.range) || 1);
        delete r.cost;
    }

    if (!STATE.settings?.enemyTypes) STATE.settings.enemyTypes = structuredClone(DEFAULT_ENEMY_TYPES);
    for (const e of Object.values(STATE.settings.enemyTypes)) {
        if (e.countMul == null && e.countGrowth != null) e.countMul = Math.max(1, 1 + Number(e.countGrowth));
        if (e.hpMul == null && e.hpGrowth != null) e.hpMul = Math.max(1, 1 + Number(e.hpGrowth));
        if (e.speedMul == null && e.speedGrowth != null) e.speedMul = Math.max(1, 1 + Number(e.speedGrowth));

        e.countMul = Math.max(1, Number(e.countMul) || 1);
        e.hpMul = Math.max(1, Number(e.hpMul) || 1);
        e.speedMul = Math.max(1, Number(e.speedMul) || 1);

        e.startWave = Math.max(0, Math.round(Number(e.startWave) || 0));
        e.countBase = Math.max(0, Math.round(Number(e.countBase) || 0));

        delete e.countGrowth;
        delete e.hpGrowth;
        delete e.speedGrowth;
    }
}

function bindEditorInputs() {
    const onInput = (ev) => {
        const el = ev.target;
        if (!(el instanceof HTMLInputElement)) return;

        const kind = el.dataset.kind;
        const key = el.dataset.k;
        const val = Number(el.value);
        if (Number.isNaN(val)) return;

        if (kind === "lvl") {
            const i = Number(el.dataset.i);
            if (!STATE.settings.towerLevelRules[i]) return;
            STATE.settings.towerLevelRules[i][key] = Math.max(1, val);
        }

        if (kind === "tower") {
            const id = el.dataset.id;
            const t = STATE.settings.towerTypes[id];
            if (!t) return;
            t[key] = key === "cost" ? Math.max(0, Math.round(val)) : Math.max(0.05, val);
            refreshBuildSelection();
        }

        if (kind === "enemy") {
            const id = el.dataset.id;
            const e = STATE.settings.enemyTypes[id];
            if (!e) return;
            e[key] = key === "startWave" || key === "countBase" ? Math.max(0, Math.round(val)) : Math.max(1, val);
        }
    };

    UI.towerLevelTable.addEventListener("input", onInput);
    UI.towerBaseTable.addEventListener("input", onInput);
    UI.enemyTable.addEventListener("input", onInput);
}

function serializeConfig() {
    const cellCode = {
        [CELL.EMPTY]: "E",
        [CELL.PATH]: "P",
        [CELL.OBSTACLE]: "O",
        [CELL.START]: "S",
        [CELL.END]: "X",
    };

    const cells = STATE.cells.map((c) => cellCode[c] || "E").join("");

    const data = {
        v: 1,
        grid: {
            cols: STATE.cols,
            rows: STATE.rows,
            cells,
            start: STATE.start,
            end: STATE.end,
        },
        settings: STATE.settings,
        cfg: { autoNextWaveDelay: CONFIG.autoNextWaveDelay },
    };

    const json = JSON.stringify(data);
    return btoa(encodeURIComponent(json));
}

function applyLoadedConfig(data) {
    if (!data || data.v !== 1) throw new Error("Unsupported config version");

    const cols = Number(data.grid?.cols);
    const rows = Number(data.grid?.rows);
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 6 || rows < 6) {
        throw new Error("Invalid grid size");
    }

    resetMap(cols, rows);

    const decode = { E: CELL.EMPTY, P: CELL.PATH, O: CELL.OBSTACLE, S: CELL.START, X: CELL.END };
    const str = String(data.grid?.cells || "");
    for (let i = 0; i < Math.min(str.length, STATE.cells.length); i++) {
        STATE.cells[i] = decode[str[i]] || CELL.EMPTY;
    }

    STATE.start = data.grid?.start && inBounds(data.grid.start.c, data.grid.start.r)
        ? { c: Number(data.grid.start.c), r: Number(data.grid.start.r) }
        : null;
    STATE.end = data.grid?.end && inBounds(data.grid.end.c, data.grid.end.r)
        ? { c: Number(data.grid.end.c), r: Number(data.grid.end.r) }
        : null;

    if (STATE.start) setCell(STATE.start.c, STATE.start.r, CELL.START);
    if (STATE.end) setCell(STATE.end.c, STATE.end.r, CELL.END);

    if (data.settings) {
        STATE.settings = data.settings;
        normalizeLoadedSettings();
        adjustLevelRules(STATE.settings.maxTowerLevel || 3);
    }

    if (data.cfg && Number.isFinite(Number(data.cfg.autoNextWaveDelay))) {
        CONFIG.autoNextWaveDelay = Math.max(0.3, Number(data.cfg.autoNextWaveDelay));
    }

    resetGameState();
    drawGrid();
    renderBuildOptions();
    renderEditorPanels();
    setMode("edit");
    setNote("Config loaded.");
}

function loadConfigFromString(str) {
    const json = decodeURIComponent(atob(str.trim()));
    const data = JSON.parse(json);
    applyLoadedConfig(data);
}

function hookEvents() {
    UI.btnMode.addEventListener("click", () => {
        setMode(STATE.mode === "game" ? "edit" : "game");
    });

    UI.btnStart.addEventListener("click", () => {
        if (STATE.mode !== "game") return;
        if (STATE.lives <= 0) return;

        if (!STATE.running) {
            STATE.running = true;
            STATE.startedOnce = true;
            if (!STATE.spawn.active && STATE.enemies.length === 0 && STATE.spawn.nextWaveCd <= 0) spawnWave();
            else setNote("Running.");
        } else {
            STATE.running = false;
            setNote("Paused.");
        }
    });

    UI.btnNext.addEventListener("click", () => {
        if (STATE.mode !== "game") return;
        if (!STATE.running) {
            setNote("Press Start.");
            return;
        }
        STATE.spawn.nextWaveCd = 0;
        spawnWave();
    });

    UI.btnReset.addEventListener("click", () => {
        resetGameState();
        drawGrid();
    });

    UI.btnUpgrade.addEventListener("click", upgradeSelectedTower);
    UI.btnSell.addEventListener("click", () => {
        const t = findTowerById(STATE.selectedTowerId);
        if (!t) return;
        removeTower(t, true);
    });

    scene.addEventListener("click", () => {
        if (STATE.mode !== "game") return;
        if (STATE.selectedTowerId) {
            selectTower(null);
        }
        hidePlacementPreview();
    });

    UI.paintTools.addEventListener("click", (ev) => {
        const btn = ev.target.closest("button[data-tool]");
        if (!btn) return;
        const tool = btn.dataset.tool;
        if (tool === "clear_all") {
            clearAllToEmpty();
            return;
        }
        STATE.paintTool = tool;
        for (const b of UI.paintTools.querySelectorAll("button")) b.classList.toggle("active", b === btn);
    });

    UI.btnApplyGrid.addEventListener("click", () => {
        const cols = clamp(Number(UI.editCols.value) || STATE.cols, 6, 40);
        const rows = clamp(Number(UI.editRows.value) || STATE.rows, 6, 30);
        resetMap(cols, rows);
        clearEntities();
        drawGrid();
        syncUI();
        setNote("Grid resized.");
    });

    UI.btnApplyLevels.addEventListener("click", () => {
        adjustLevelRules(Number(UI.maxLevelInput.value) || 3);
        renderLevelRuleTable();
        setNote("Level rules updated.");
    });

    UI.btnGenerate.addEventListener("click", () => {
        UI.configText.value = serializeConfig();
        UI.configText.select();
        setNote("Config generated.");
    });

    UI.btnLoad.addEventListener("click", () => {
        const inline = UI.configText.value.trim();
        const raw = inline || window.prompt("Paste config string") || "";
        if (!raw) return;
        try {
            loadConfigFromString(raw);
        } catch (err) {
            setNote(`Load failed: ${err.message}`);
        }
    });

    bindEditorInputs();
}

function init() {
    resetMap(16, 10);

    // Seed a slightly more complex default path.
    const defaultPath = [
        [0, 6], [1, 6], [2, 6], [3, 6], [4, 6],
        [4, 5], [4, 4], [4, 3], [4, 2],
        [5, 2], [6, 2], [7, 2], [8, 2], [9, 2],
        [9, 3], [9, 4], [9, 5], [9, 6], [9, 7],
        [10, 7], [11, 7], [12, 7], [13, 7],
        [13, 6], [13, 5], [13, 4], [13, 3],
        [14, 3], [15, 3],
    ];

    STATE.cells.fill(CELL.EMPTY);
    for (const [c, r] of defaultPath) setCell(c, r, CELL.PATH);
    STATE.start = { c: 0, r: 6 };
    STATE.end = { c: 15, r: 3 };
    setCell(STATE.start.c, STATE.start.r, CELL.START);
    setCell(STATE.end.c, STATE.end.r, CELL.END);

    resetGameState();
    drawGrid();
    renderBuildOptions();
    renderEditorPanels();
    hookEvents();
    setMode("game");
    requestAnimationFrame(tick);
}

init();
