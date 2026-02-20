/**
 * Grid Tower Defense (no frameworks)
 * - multiple tower/enemy archetypes
 * - wave-based composition and scaling
 * - tower selection + upgrade/sell panel
 */

const UI = {
    wave: document.getElementById("wave"),
    lives: document.getElementById("lives"),
    gold: document.getElementById("gold"),
    enemies: document.getElementById("enemies"),
    note: document.getElementById("note"),
    debug: document.getElementById("debug"),
    btnStart: document.getElementById("btnStart"),
    btnNext: document.getElementById("btnNext"),
    btnReset: document.getElementById("btnReset"),
    buildList: document.getElementById("buildList"),
    buildHint: document.getElementById("buildHint"),
    hint: document.getElementById("hint"),
    upgradePanel: document.getElementById("upgradePanel"),
    btnUpgrade: document.getElementById("btnUpgrade"),
    btnSell: document.getElementById("btnSell"),
};

const scene = document.getElementById("scene");
const gridG = document.getElementById("grid");
const pathG = document.getElementById("path");
const towersG = document.getElementById("towers");
const bulletsG = document.getElementById("bullets");
const enemiesG = document.getElementById("enemiesLayer");

const NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function format1(v) { return (Math.round(v * 10) / 10).toFixed(1); }

const CONFIG = {
    cols: 16,
    rows: 10,
    tile: 60,
    livesStart: 20,
    goldStart: 120,
    maxTowerLevel: 3,
    sellRatio: 0.65,
    autoNextWaveDelay: 2.2,
};

const TOWER_TYPES = {
    rifle: {
        id: "rifle",
        name: "Rifle",
        color: "#6ec5ff",
        cost: 30,
        damage: 10,
        fireRate: 2.4,
        rangeTiles: 2.9,
        bulletSpeedTiles: 9.5,
        bulletRadius: 4,
        upgradeLabel: "Precision",
        upgradeMult: { damage: 1.35, fireRate: 1.12, range: 1.08, bulletSpeed: 1.06 },
    },
    rapid: {
        id: "rapid",
        name: "Rapid",
        color: "#8ee38a",
        cost: 40,
        damage: 5,
        fireRate: 5.4,
        rangeTiles: 2.4,
        bulletSpeedTiles: 10.8,
        bulletRadius: 3,
        upgradeLabel: "Overclock",
        upgradeMult: { damage: 1.22, fireRate: 1.2, range: 1.06, bulletSpeed: 1.14 },
    },
    sniper: {
        id: "sniper",
        name: "Sniper",
        color: "#ffcc66",
        cost: 55,
        damage: 30,
        fireRate: 0.75,
        rangeTiles: 4.6,
        bulletSpeedTiles: 14.5,
        bulletRadius: 5,
        upgradeLabel: "Focus",
        upgradeMult: { damage: 1.45, fireRate: 1.1, range: 1.1, bulletSpeed: 1.08 },
    },
};

const ENEMY_TYPES = {
    scout: {
        id: "scout",
        name: "Scout",
        color: "rgba(120,235,180,0.85)",
        hpMul: 0.72,
        speedMul: 1.45,
        reward: 6,
        leak: 1,
        size: 0.9,
        damageTakenMul: 1.0,
    },
    grunt: {
        id: "grunt",
        name: "Grunt",
        color: "rgba(88,205,230,0.82)",
        hpMul: 1.0,
        speedMul: 1.0,
        reward: 8,
        leak: 1,
        size: 1,
        damageTakenMul: 1.0,
    },
    raider: {
        id: "raider",
        name: "Raider",
        color: "rgba(255,142,106,0.86)",
        hpMul: 1.35,
        speedMul: 1.2,
        reward: 10,
        leak: 2,
        size: 1.05,
        damageTakenMul: 0.95,
    },
    tank: {
        id: "tank",
        name: "Tank",
        color: "rgba(180,160,255,0.82)",
        hpMul: 2.8,
        speedMul: 0.62,
        reward: 14,
        leak: 2,
        size: 1.18,
        damageTakenMul: 0.88,
    },
    juggernaut: {
        id: "juggernaut",
        name: "Juggernaut",
        color: "rgba(255,92,124,0.85)",
        hpMul: 6.0,
        speedMul: 0.5,
        reward: 30,
        leak: 4,
        size: 1.28,
        damageTakenMul: 0.84,
    },
};

const STATE = {
    running: false,
    tPrev: performance.now(),

    wave: 1,
    lives: CONFIG.livesStart,
    gold: CONFIG.goldStart,

    towers: [],
    enemies: [],
    bullets: [],

    selectedBuildType: "rifle",
    selectedTowerId: null,
    hoveredCell: null,
    startedOnce: false,

    spawn: {
        active: false,
        queue: [],
        spawned: 0,
        cooldown: 0,
        nextWaveCd: 0,
    },

    towerMap: new Map(),
};

const PLACEMENT_PREVIEW = (() => {
    const ring = svgEl("circle", {
        cx: -9999,
        cy: -9999,
        r: 10,
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

const VIEW = {
    w: CONFIG.cols * CONFIG.tile,
    h: CONFIG.rows * CONFIG.tile,
};

scene.setAttribute("viewBox", `0 0 ${VIEW.w} ${VIEW.h}`);
scene.setAttribute("width", VIEW.w);
scene.setAttribute("height", VIEW.h);

function buildPathCells(waypoints) {
    const out = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
        const [c1, r1] = waypoints[i];
        const [c2, r2] = waypoints[i + 1];

        if (c1 !== c2 && r1 !== r2) {
            throw new Error("Path waypoint must be orthogonal");
        }

        const dc = Math.sign(c2 - c1);
        const dr = Math.sign(r2 - r1);
        const steps = Math.max(Math.abs(c2 - c1), Math.abs(r2 - r1));
        for (let s = 0; s <= steps; s++) {
            const c = c1 + dc * s;
            const r = r1 + dr * s;
            if (out.length === 0 || out[out.length - 1][0] !== c || out[out.length - 1][1] !== r) {
                out.push([c, r]);
            }
        }
    }
    return out;
}

const PATH_WAYPOINTS = [
    [0, 6],
    [4, 6],
    [4, 2],
    [9, 2],
    [9, 7],
    [13, 7],
    [13, 3],
    [15, 3],
];

const PATH_CELLS = buildPathCells(PATH_WAYPOINTS);
const pathSet = new Set(PATH_CELLS.map(([c, r]) => `${c},${r}`));

function cellToCenter(c, r) {
    return {
        x: c * CONFIG.tile + CONFIG.tile / 2,
        y: r * CONFIG.tile + CONFIG.tile / 2,
    };
}

const PATH_POINTS = PATH_CELLS.map(([c, r]) => cellToCenter(c, r));

function setNote(msg) {
    UI.note.textContent = msg;
}

function updateStartButtonLabel() {
    if (!STATE.startedOnce && !STATE.running) {
        UI.btnStart.textContent = "Start";
        return;
    }
    UI.btnStart.textContent = STATE.running ? "Pause" : "Resume";
}

function towerCost(typeId) {
    return TOWER_TYPES[typeId].cost;
}

function towerUpgradeCost(tower) {
    const base = tower.type.cost;
    return Math.round(base * (0.72 + tower.level * 0.62));
}

function towerIconHTML(typeId, mini = false) {
    return `<span class="tower-icon ${typeId} ${mini ? "mini" : ""}" aria-hidden="true"></span>`;
}

function canPlaceTowerAt(c, r) {
    const key = `${c},${r}`;
    return !pathSet.has(key) && !STATE.towerMap.has(key);
}

function hidePlacementPreview() {
    STATE.hoveredCell = null;
    PLACEMENT_PREVIEW.ring.setAttribute("opacity", "0");
    PLACEMENT_PREVIEW.center.setAttribute("opacity", "0");
}

function showPlacementPreview(c, r) {
    if (!canPlaceTowerAt(c, r)) {
        hidePlacementPreview();
        return;
    }

    STATE.hoveredCell = { c, r };
    const center = cellToCenter(c, r);
    const type = TOWER_TYPES[STATE.selectedBuildType];

    PLACEMENT_PREVIEW.ring.setAttribute("cx", String(center.x));
    PLACEMENT_PREVIEW.ring.setAttribute("cy", String(center.y));
    PLACEMENT_PREVIEW.ring.setAttribute("r", String(type.rangeTiles * CONFIG.tile));
    PLACEMENT_PREVIEW.ring.setAttribute("opacity", "1");

    PLACEMENT_PREVIEW.center.setAttribute("cx", String(center.x));
    PLACEMENT_PREVIEW.center.setAttribute("cy", String(center.y));
    PLACEMENT_PREVIEW.center.setAttribute("opacity", "1");
}

function drawGrid() {
    gridG.innerHTML = "";

    for (let r = 0; r < CONFIG.rows; r++) {
        for (let c = 0; c < CONFIG.cols; c++) {
            const x = c * CONFIG.tile;
            const y = r * CONFIG.tile;
            const onPath = pathSet.has(`${c},${r}`);

            const rect = svgEl("rect", {
                x,
                y,
                width: CONFIG.tile,
                height: CONFIG.tile,
                fill: onPath ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                stroke: "rgba(255,255,255,0.08)",
            });

            rect.style.cursor = onPath ? "not-allowed" : "pointer";

            rect.addEventListener("mouseenter", () => {
                rect.setAttribute("fill", onPath ? "rgba(255,255,255,0.06)" : "rgba(79,139,255,0.08)");
                showPlacementPreview(c, r);
            });

            rect.addEventListener("mouseleave", () => {
                rect.setAttribute("fill", onPath ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)");
                hidePlacementPreview();
            });

            rect.addEventListener("click", () => onGridClick(c, r));
            gridG.appendChild(rect);
        }
    }
}

function drawPath() {
    pathG.innerHTML = "";

    for (const [c, r] of PATH_CELLS) {
        const x = c * CONFIG.tile;
        const y = r * CONFIG.tile;
        const rect = svgEl("rect", {
            x: x + 4,
            y: y + 4,
            width: CONFIG.tile - 8,
            height: CONFIG.tile - 8,
            rx: 11,
            fill: "rgba(255,255,255,0.06)",
            stroke: "rgba(255,255,255,0.11)",
        });
        pathG.appendChild(rect);
    }

    const line = svgEl("polyline", {
        points: PATH_POINTS.map((p) => `${p.x},${p.y}`).join(" "),
        fill: "none",
        stroke: "rgba(255,255,255,0.14)",
        "stroke-width": 6,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
    });
    pathG.appendChild(line);
}

function buildTowerVisual(center, color) {
    const root = svgEl("g", {});

    const base = svgEl("circle", {
        cx: center.x,
        cy: center.y,
        r: 14,
        fill: "rgba(255,255,255,0.11)",
        stroke: "rgba(255,255,255,0.25)",
        "stroke-width": 2,
    });

    const ring = svgEl("circle", {
        cx: center.x,
        cy: center.y,
        r: 8,
        fill: "rgba(0,0,0,0.2)",
        stroke: "rgba(255,255,255,0.25)",
        "stroke-width": 1.5,
    });

    const aim = svgEl("g", {});
    const head = svgEl("circle", {
        cx: center.x,
        cy: center.y,
        r: 9,
        fill: "rgba(255,255,255,0.14)",
        stroke: color,
        "stroke-width": 2,
    });

    const barrel = svgEl("rect", {
        x: center.x - 3,
        y: center.y - 23,
        width: 6,
        height: 17,
        rx: 2,
        fill: color,
    });

    const levelHalo = svgEl("circle", {
        cx: center.x,
        cy: center.y,
        r: 17.5,
        fill: "none",
        stroke: color,
        "stroke-width": 1.8,
        opacity: 0,
    });

    const levelPips = [0, 1, 2].map((i) => {
        const x = center.x - 10 + i * 10;
        const y = center.y - 18;
        return svgEl("circle", {
            cx: x,
            cy: y,
            r: 2.2,
            fill: color,
            stroke: "rgba(255,255,255,0.3)",
            "stroke-width": 0.8,
            opacity: 0.2,
        });
    });

    aim.appendChild(head);
    aim.appendChild(barrel);

    root.appendChild(base);
    root.appendChild(ring);
    root.appendChild(levelHalo);
    for (const pip of levelPips) root.appendChild(pip);
    root.appendChild(aim);

    return { root, aim, head, barrel, levelHalo, levelPips };
}

function applyTowerLevelVisual(tower) {
    const bonus = tower.level - 1;
    const barrelHeight = 17 + bonus * 2;
    const barrelY = tower.pos.y - 23 - bonus;
    const headR = 9 + bonus * 0.7;

    tower.barrel.setAttribute("height", String(barrelHeight));
    tower.barrel.setAttribute("y", String(barrelY));
    tower.head.setAttribute("r", String(headR));

    tower.levelHalo.setAttribute("opacity", String(0.22 + tower.level * 0.16));
    tower.levelHalo.setAttribute("stroke-width", String(1.4 + tower.level * 0.4));

    for (let i = 0; i < tower.levelPips.length; i++) {
        tower.levelPips[i].setAttribute("opacity", i < tower.level ? "0.95" : "0.16");
    }
}

function setBuildType(typeId) {
    STATE.selectedBuildType = typeId;
    const type = TOWER_TYPES[typeId];

    for (const btn of UI.buildList.querySelectorAll("button")) {
        btn.classList.toggle("active", btn.dataset.type === typeId);
    }

    UI.hint.textContent = `Build: ${type.name} (${type.cost}g). Click empty tile.`;
    UI.buildHint.textContent = `${type.name}: DMG ${type.damage}, RNG ${type.rangeTiles}, RATE ${type.fireRate}/s`;

    if (STATE.hoveredCell) {
        showPlacementPreview(STATE.hoveredCell.c, STATE.hoveredCell.r);
    }
}

function renderBuildOptions() {
    UI.buildList.innerHTML = "";

    for (const type of Object.values(TOWER_TYPES)) {
        const btn = document.createElement("button");
        btn.className = "build-btn";
        btn.dataset.type = type.id;
        btn.innerHTML = `<span class="tower-label">${towerIconHTML(type.id)}<b>${type.name}</b></span><span class="cost">${type.cost}g</span>`;
        btn.addEventListener("click", () => setBuildType(type.id));
        UI.buildList.appendChild(btn);
    }

    setBuildType(STATE.selectedBuildType);
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

function onGridClick(c, r) {
    const key = `${c},${r}`;

    if (STATE.towerMap.has(key)) {
        selectTower(STATE.towerMap.get(key));
        return;
    }

    if (pathSet.has(key)) {
        setNote("Cannot build on path.");
        return;
    }

    const cost = towerCost(STATE.selectedBuildType);
    if (STATE.gold < cost) {
        setNote("Not enough gold.");
        return;
    }

    STATE.gold -= cost;
    placeTower(c, r, STATE.selectedBuildType);
    setNote(`${TOWER_TYPES[STATE.selectedBuildType].name} built.`);
    hidePlacementPreview();
    syncUI();
}

function placeTower(c, r, typeId) {
    const type = TOWER_TYPES[typeId];
    const center = cellToCenter(c, r);
    const id = crypto.randomUUID();

    const { root, aim, head, barrel, levelHalo, levelPips } = buildTowerVisual(center, type.color);
    root.style.cursor = "pointer";

    const rangePx = type.rangeTiles * CONFIG.tile;
    const ring = svgEl("circle", {
        cx: center.x,
        cy: center.y,
        r: rangePx,
        fill: "none",
        stroke: "rgba(79,139,255,0.2)",
        "stroke-width": 2,
        "stroke-dasharray": "6 6",
        opacity: 0,
    });

    const selectRing = svgEl("circle", {
        cx: center.x,
        cy: center.y,
        r: 20,
        fill: "none",
        stroke: "rgba(255,224,120,0.95)",
        "stroke-width": 2.5,
        "stroke-dasharray": "5 4",
        opacity: 0,
    });

    root.addEventListener("mouseenter", () => {
        if (STATE.selectedTowerId !== id) ring.setAttribute("opacity", "1");
    });

    root.addEventListener("mouseleave", () => {
        if (STATE.selectedTowerId !== id) ring.setAttribute("opacity", "0");
    });

    root.addEventListener("click", (ev) => {
        ev.stopPropagation();
        selectTower(id);
    });

    towersG.appendChild(ring);
    towersG.appendChild(selectRing);
    towersG.appendChild(root);

    const tower = {
        id,
        c,
        r,
        pos: center,
        type,
        level: 1,
        spent: type.cost,
        fireCd: 0,
        range: rangePx,
        fireRate: type.fireRate,
        damage: type.damage,
        bulletSpeed: type.bulletSpeedTiles * CONFIG.tile,
        bulletRadius: type.bulletRadius,
        el: root,
        aimEl: aim,
        head,
        barrel,
        levelHalo,
        levelPips,
        ring,
        selectRing,
    };

    applyTowerLevelVisual(tower);
    STATE.towers.push(tower);
    STATE.towerMap.set(`${c},${r}`, id);
    selectTower(id);
}

function removeTower(tower, giveRefund) {
    tower.el.remove();
    tower.ring.remove();
    tower.selectRing.remove();

    const idx = STATE.towers.findIndex((t) => t.id === tower.id);
    if (idx >= 0) STATE.towers.splice(idx, 1);
    STATE.towerMap.delete(`${tower.c},${tower.r}`);

    if (giveRefund) {
        const refund = Math.round(tower.spent * CONFIG.sellRatio);
        STATE.gold += refund;
        setNote(`Sold: +${refund}g`);
    }

    if (STATE.selectedTowerId === tower.id) STATE.selectedTowerId = null;
    renderUpgradePanel();
}

function upgradeSelectedTower() {
    const tower = findTowerById(STATE.selectedTowerId);
    if (!tower) return;
    if (tower.level >= CONFIG.maxTowerLevel) {
        setNote("Already max level.");
        return;
    }

    const cost = towerUpgradeCost(tower);
    if (STATE.gold < cost) {
        setNote("Not enough gold.");
        return;
    }

    STATE.gold -= cost;
    tower.spent += cost;
    tower.level += 1;

    const m = tower.type.upgradeMult;
    tower.damage *= m.damage;
    tower.fireRate *= m.fireRate;
    tower.range *= m.range;
    tower.bulletSpeed *= m.bulletSpeed;
    tower.ring.setAttribute("r", String(tower.range));
    applyTowerLevelVisual(tower);

    setNote(`${tower.type.name} Lv.${tower.level} upgraded.`);
    syncUI();
}

function renderUpgradePanel() {
    const tower = findTowerById(STATE.selectedTowerId);
    if (!tower) {
        UI.upgradePanel.innerHTML = "Select a tower.";
        UI.btnUpgrade.disabled = true;
        UI.btnSell.disabled = true;
        return;
    }

    const maxed = tower.level >= CONFIG.maxTowerLevel;
    const nextCost = maxed ? 0 : towerUpgradeCost(tower);

    UI.upgradePanel.innerHTML = [
        `<div class=\"row\"><span>Type</span><b class=\"tower-type\">${towerIconHTML(tower.type.id, true)}${tower.type.name}</b></div>`,
        `<div class=\"row\"><span>Level</span><b>${tower.level}/${CONFIG.maxTowerLevel}</b></div>`,
        `<div class=\"row\"><span>Damage</span><b>${Math.round(tower.damage)}</b></div>`,
        `<div class=\"row\"><span>Rate</span><b>${format1(tower.fireRate)}/s</b></div>`,
        `<div class=\"row\"><span>Range</span><b>${format1(tower.range / CONFIG.tile)} tiles</b></div>`,
        `<div class=\"row\"><span>Next</span><b>${maxed ? "MAX" : `${nextCost}g`}</b></div>`,
    ].join("");

    UI.btnUpgrade.disabled = maxed || STATE.gold < nextCost;
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
        fill: tower.type.color,
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
            target.hp -= b.damage * target.damageTakenMul;
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
    const bodyG = svgEl("g", {});

    if (type.id === "scout") {
        bodyG.appendChild(svgEl("polygon", {
            points: "-14,1 -3,-12 10,-2 6,12 -10,10",
            fill: type.color,
            stroke: "rgba(255,255,255,0.26)",
            "stroke-width": 1.6,
        }));
        bodyG.appendChild(svgEl("circle", { cx: 6, cy: -1, r: 2.6, fill: "rgba(255,255,255,0.85)" }));
    } else if (type.id === "grunt") {
        bodyG.appendChild(svgEl("rect", {
            x: -13,
            y: -10,
            width: 26,
            height: 20,
            rx: 6,
            fill: type.color,
            stroke: "rgba(255,255,255,0.26)",
            "stroke-width": 1.7,
        }));
        bodyG.appendChild(svgEl("circle", { cx: -5, cy: -1, r: 2.4, fill: "rgba(255,255,255,0.82)" }));
        bodyG.appendChild(svgEl("circle", { cx: 5, cy: -1, r: 2.4, fill: "rgba(255,255,255,0.82)" }));
    } else if (type.id === "raider") {
        bodyG.appendChild(svgEl("path", {
            d: "M -14 8 L -6 -10 L 6 -10 L 14 8 L 0 12 Z",
            fill: type.color,
            stroke: "rgba(255,255,255,0.26)",
            "stroke-width": 1.7,
        }));
        bodyG.appendChild(svgEl("rect", {
            x: -2, y: -7, width: 4, height: 8, rx: 1.5, fill: "rgba(255,255,255,0.84)",
        }));
    } else if (type.id === "tank") {
        bodyG.appendChild(svgEl("rect", {
            x: -16,
            y: -11,
            width: 32,
            height: 22,
            rx: 5,
            fill: type.color,
            stroke: "rgba(255,255,255,0.26)",
            "stroke-width": 1.9,
        }));
        bodyG.appendChild(svgEl("rect", {
            x: -7,
            y: -15,
            width: 14,
            height: 8,
            rx: 3,
            fill: "rgba(255,255,255,0.32)",
        }));
    } else {
        bodyG.appendChild(svgEl("path", {
            d: "M 0 -16 L 12 -8 L 14 5 L 6 15 L -6 15 L -14 5 L -12 -8 Z",
            fill: type.color,
            stroke: "rgba(255,255,255,0.26)",
            "stroke-width": 2.1,
        }));
        bodyG.appendChild(svgEl("circle", { cx: 0, cy: -1, r: 4.2, fill: "rgba(255,255,255,0.82)" }));
    }

    bodyG.setAttribute("transform", `scale(${type.size})`);

    const hpBg = svgEl("rect", {
        x: -18,
        y: -24,
        width: 36,
        height: 5,
        rx: 2,
        fill: "rgba(255,255,255,0.12)",
    });

    const hpFg = svgEl("rect", {
        x: -18,
        y: -24,
        width: 36,
        height: 5,
        rx: 2,
        fill: "rgba(54,211,153,0.74)",
    });

    root.appendChild(hpBg);
    root.appendChild(hpFg);
    root.appendChild(bodyG);

    enemiesG.appendChild(root);

    return { root, hpFg };
}

function makeEnemy(typeId) {
    const id = crypto.randomUUID();
    const p0 = PATH_POINTS[0];
    const type = ENEMY_TYPES[typeId];

    const hpScale = 1 + (STATE.wave - 1) * 0.15;
    const speedScale = 1 + Math.min(0.3, (STATE.wave - 1) * 0.022);

    const hp = 32 * hpScale * type.hpMul;
    const speedPx = CONFIG.tile * 1.15 * speedScale * type.speedMul;

    const { root, hpFg } = createEnemyVisual(type);

    const enemy = {
        id,
        type,
        pos: { x: p0.x, y: p0.y },
        pathIndex: 0,
        speedPx,
        hp,
        hpMax: hp,
        reward: Math.round(type.reward + (STATE.wave - 1) * 0.5),
        leak: type.leak,
        damageTakenMul: type.damageTakenMul,
        hitRadius: 12 * type.size,
        el: root,
        hpFg,
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
        setNote("Game Over. Reset to play again.");
        updateStartButtonLabel();
    }
}

function composeWave(wave) {
    const total = 8 + wave * 2;
    const queue = [];

    const baseInterval = clamp(0.62 - wave * 0.02, 0.3, 0.62);

    for (let i = 0; i < total; i++) {
        let typeId = "grunt";

        if (wave >= 2 && i % 4 === 3) typeId = "scout";
        if (wave >= 4 && i % 6 === 5) typeId = "tank";
        if (wave >= 6 && i % 5 === 2) typeId = "raider";
        if (wave >= 8 && i % 7 === 1) typeId = "tank";

        if (wave >= 10 && i % 6 === 0) typeId = "raider";

        let interval = baseInterval;
        if (typeId === "scout") interval -= 0.08;
        if (typeId === "tank") interval += 0.08;
        if (typeId === "juggernaut") interval += 0.14;

        queue.push({ typeId, interval: clamp(interval, 0.22, 0.85) });
    }

    if (wave % 5 === 0) {
        queue.push({ typeId: "juggernaut", interval: baseInterval + 0.2 });
    }

    return queue;
}

function summarizeWave(queue) {
    const counts = new Map();
    for (const q of queue) {
        counts.set(q.typeId, (counts.get(q.typeId) || 0) + 1);
    }
    return Array.from(counts.entries())
        .map(([typeId, n]) => `${ENEMY_TYPES[typeId].name} x${n}`)
        .join(", ");
}

function spawnWave() {
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
    syncUI();
}

function updateSpawner(dt) {
    if (!STATE.spawn.active) {
        if (STATE.running && STATE.enemies.length === 0 && STATE.spawn.nextWaveCd > 0) {
            STATE.spawn.nextWaveCd -= dt;
            if (STATE.spawn.nextWaveCd <= 0) {
                spawnWave();
            }
        }
        return;
    }

    STATE.spawn.cooldown -= dt;
    if (STATE.spawn.cooldown > 0) return;

    if (STATE.spawn.queue.length > 0) {
        const next = STATE.spawn.queue.shift();
        STATE.enemies.push(makeEnemy(next.typeId));
        STATE.spawn.spawned += 1;
        STATE.spawn.cooldown = next.interval;
        return;
    }

    if (STATE.enemies.length === 0) {
        STATE.spawn.active = false;
        STATE.wave += 1;
        STATE.spawn.nextWaveCd = CONFIG.autoNextWaveDelay;
        setNote(`Wave clear. Next in ${CONFIG.autoNextWaveDelay.toFixed(1)}s`);
        syncUI();
    }
}

function updateEnemies(dt) {
    for (let i = STATE.enemies.length - 1; i >= 0; i--) {
        const e = STATE.enemies[i];

        const nextIndex = e.pathIndex + 1;
        if (nextIndex >= PATH_POINTS.length) {
            enemyReachedEnd(i);
            continue;
        }

        const target = PATH_POINTS[nextIndex];
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
    for (const t of STATE.towers) {
        t.fireCd -= dt;

        let best = null;
        let bestProgress = -1;

        for (const e of STATE.enemies) {
            const d = dist(t.pos, e.pos);
            if (d > t.range) continue;

            // prioritize enemies that progressed further along the path.
            const progress = e.pathIndex + (PATH_POINTS.length - 1 > 0 ? e.pathIndex / (PATH_POINTS.length - 1) : 0);
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

function syncUI() {
    UI.wave.textContent = String(STATE.wave);
    UI.lives.textContent = String(STATE.lives);
    UI.gold.textContent = String(STATE.gold);
    UI.enemies.textContent = String(STATE.enemies.length);

    const remain = STATE.spawn.active ? STATE.spawn.queue.length : 0;

    UI.debug.textContent = [
        `running: ${STATE.running}`,
        `build: ${TOWER_TYPES[STATE.selectedBuildType].name}`,
        `selected: ${findTowerById(STATE.selectedTowerId)?.type.name || "none"}`,
        `towers: ${STATE.towers.length}`,
        `bullets: ${STATE.bullets.length}`,
        `spawn: ${STATE.spawn.active ? "active" : "idle"} (${STATE.spawn.spawned} / ${STATE.spawn.spawned + remain})`,
        `next: ${STATE.spawn.nextWaveCd > 0 ? `${STATE.spawn.nextWaveCd.toFixed(1)}s` : "-"}`,
    ].join("\n");

    renderUpgradePanel();
    updateStartButtonLabel();
}

function tick(now) {
    const dt = clamp((now - STATE.tPrev) / 1000, 0, 0.05);
    STATE.tPrev = now;

    if (STATE.running) {
        updateSpawner(dt);
        updateEnemies(dt);
        updateTowers(dt);
        updateBullets(dt);

        if (STATE.spawn.active && STATE.spawn.queue.length === 0 && STATE.enemies.length === 0) {
            STATE.spawn.active = false;
            STATE.wave += 1;
            STATE.spawn.nextWaveCd = CONFIG.autoNextWaveDelay;
            setNote(`Wave clear. Next in ${CONFIG.autoNextWaveDelay.toFixed(1)}s`);
        }
    }

    syncUI();
    requestAnimationFrame(tick);
}

function resetAll() {
    for (const t of STATE.towers) {
        t.el.remove();
        t.ring.remove();
        t.selectRing.remove();
    }
    for (const e of STATE.enemies) e.el.remove();
    for (const b of STATE.bullets) b.el.remove();

    STATE.running = false;
    STATE.tPrev = performance.now();

    STATE.wave = 1;
    STATE.lives = CONFIG.livesStart;
    STATE.gold = CONFIG.goldStart;

    STATE.towers = [];
    STATE.enemies = [];
    STATE.bullets = [];
    STATE.towerMap = new Map();

    STATE.selectedTowerId = null;

    STATE.spawn = {
        active: false,
        queue: [],
        spawned: 0,
        cooldown: 0,
        nextWaveCd: 0,
    };

    STATE.startedOnce = false;
    setNote("Ready.");
    syncUI();
}

UI.btnStart.addEventListener("click", () => {
    if (STATE.lives <= 0) return;
    if (!STATE.running) {
        STATE.running = true;
        if (!STATE.startedOnce) {
            STATE.startedOnce = true;
        }
        if (!STATE.spawn.active && STATE.enemies.length === 0 && STATE.spawn.nextWaveCd <= 0) {
            spawnWave();
        } else {
            setNote("Running.");
        }
    } else {
        STATE.running = false;
        setNote("Paused.");
    }
    syncUI();
});

UI.btnNext.addEventListener("click", () => {
    if (!STATE.running) {
        setNote("Press Start.");
        return;
    }
    STATE.spawn.nextWaveCd = 0;
    spawnWave();
});

UI.btnReset.addEventListener("click", resetAll);

UI.btnUpgrade.addEventListener("click", () => {
    upgradeSelectedTower();
});

UI.btnSell.addEventListener("click", () => {
    const tower = findTowerById(STATE.selectedTowerId);
    if (!tower) return;
    removeTower(tower, true);
    syncUI();
});

scene.addEventListener("click", () => {
    if (STATE.selectedTowerId) {
        selectTower(null);
        syncUI();
    }
    hidePlacementPreview();
});

renderBuildOptions();
drawGrid();
drawPath();
resetAll();
requestAnimationFrame(tick);
