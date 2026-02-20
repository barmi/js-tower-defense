# JS Tower Defense

Simple browser-based grid tower defense game (vanilla HTML/CSS/JS, no frameworks).

Korean version: [README.ko.md](./README.ko.md)

## Run

1. Open `./index.html` in a browser.
2. Build towers on empty tiles.
3. Press `Start` to begin the first wave.

## Current Features

### Core Gameplay
- Grid-based map with a multi-turn path.
- Enemy waves with progressive difficulty.
- Gold/lives/wave progression loop.
- Pause/resume support with one button.

### Tower System
- 3 tower types: `Rifle`, `Rapid`, `Sniper`.
- Type-based stats: cost, damage, fire rate, range, projectile speed.
- Build selection panel.
- Placement range preview before building (distinct color).
- Turret aims toward target direction when firing.

### Tower Interaction and Upgrades
- Click tower to select it.
- Selected tower highlight and range display.
- Upgrade panel with current stats and next upgrade cost.
- Sell tower with partial refund.
- Visual level differences by upgrade level.

### Enemy System
- 5 enemy types: `Scout`, `Grunt`, `Raider`, `Tank`, `Juggernaut`.
- Type-based simplified shapes (not circles).
- Per-type stats (HP/speed/reward/leak damage).
- Wave composition changes by wave number.

### Wave Flow
- `Start` begins gameplay and immediately starts a wave.
- After wave clear, next wave auto-starts after short delay.
- `Skip Wait` starts the next wave immediately.

### UI / Language
- In-game UI text uses concise English.
- Build list shows tower-type icons.

## Main Files

- `./index.html`: layout and UI structure
- `./style.css`: visual styles
- `./app.js`: full game logic
