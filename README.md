# Color Flow Maze

A sliding-puzzle mobile game built with React Native and Expo. Navigate a player token across a grid-based maze — you slide until you hit a wall, and you must stop exactly on the gold tile to win. Beat all 50 procedurally generated levels to complete the game.

---

## Gameplay

| Element | Color | Description |
|---|---|---|
| Player | White dot | Your current position |
| Start | Green | Where you begin each level |
| Goal | Gold/Amber | Stop here to win |
| Wall | Purple | Blocks movement |
| Trail | Blue | Path you've traveled |

### Rules

- Press a direction button (Up / Down / Left / Right) to move.
- You slide in that direction **until you hit a wall** — you cannot stop mid-cell.
- You win only if you **stop on the gold tile**.
- Each level has a **move limit** (starts at 10, decreases every 4 levels, minimum 6).
- If you use all your moves without reaching the goal, you lose.
- You get **3 undos** per level to revert your last move.
- **Reset** restarts the current level. **Long-press Reset** restarts the entire game from Level 1.

---

## Features

- **50 levels** of increasing difficulty
- **Procedural level generation** — seeded RNG ensures reproducible layouts per level
- **BFS solvability check** — every generated level is guaranteed to be beatable
- **Trail painting** — your path is visually marked as you slide
- **Undo system** — up to 3 undos per level
- **Haptic feedback** on win (iOS / Android)
- **Sound effects** — win chime and full game completion fanfare
- **Board shake animation** when movement is blocked
- **Player pulse animation** on each move and on winning
- **Bilingual intro screen** — instructions in both Korean and English
- Grid scales from 8×8 up to 12×12 as levels progress

---

## Tech Stack

| | |
|---|---|
| Framework | React Native 0.83.2 |
| Toolchain | Expo ~55.0.5 |
| Language | TypeScript ~5.9.2 |
| React | 19.2.0 |
| Audio | expo-audio ~55.0.8 |
| Haptics | expo-haptics ~55.0.8 |
| Status bar | expo-status-bar ~55.0.4 |

---

## Project Structure

```
color-flow-maze/
├── App.tsx          # All game logic and UI (single-file app)
├── index.ts         # Expo entry point
├── app.json         # Expo configuration (name, icons, bundle IDs)
├── package.json
├── tsconfig.json
├── assets/
│   ├── icon.png
│   ├── splash-icon.png
│   ├── favicon.png
│   ├── android-icon-*.png
│   └── sounds/
│       ├── win.mp3        # Plays on level win
│       └── congrats.mp3   # Plays on full game completion
├── android/         # Native Android project
└── ios/             # Native iOS project
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- For iOS: Xcode + CocoaPods
- For Android: Android Studio + SDK

### Install

```bash
npm install
```

### Run

```bash
# Start the Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator / device
npm run android

# Run in a web browser
npm run web
```

---

## Configuration

Key constants in `App.tsx`:

| Constant | Default | Description |
|---|---|---|
| `MAX_LEVEL` | `50` | Total number of levels |
| `DEFAULT_MOVE_LIMIT` | `10` | Starting move limit |
| `UNDO_LIMIT` | `3` | Undos allowed per level |
| `LEVEL_TIME_SECONDS` | `60` | Per-level timer (currently disabled) |
| `TIMER_ENABLED` | `false` | Toggle countdown timer |
