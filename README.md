# Platypus vs Pharmacist: Tri‑State Throwdown 🥊🦫💊

A lightweight, *Street Fighter / Smash‑ish* 2D fighting game you can host on **GitHub Pages** (or any static web host).  
Includes:

- Health bars + Focus meter
- 6 parody/original fighters (platypus + pharmacist + “genius summer kids” spoofs)
- Light / Heavy / Special moves (+ an Ultimate if you press **Special + Heavy/Light** when Focus is full)
- Local multiplayer on one keyboard (**WASD** vs **Arrow Keys**)
- Mobile friendly with on‑screen touch controls (single or split‑screen 2P)
- CPU opponent option with difficulty slider
- Stages + match rules (timer, best‑of, damage scaling)
- No external dependencies

> Parody characters, original art. No affiliation with any TV show/studio.

---

## Controls

### Player 1
- Move: **WASD**
- Light: **F**
- Heavy: **G**
- Special: **H**
- Guard: **E**

### Player 2
- Move: **Arrow Keys**
- Light: **J** (or Numpad 1)
- Heavy: **K** (or Numpad 2)
- Special: **L** (or Numpad 3)
- Guard: **I** (or Numpad 0)

### Ultimate
- Press **Special + Heavy** (or **Special + Light**) when Focus is full.

---

## Run locally

Because this project uses ES Modules, you should run it from a local server (not by double‑clicking the HTML file).

### Option A: VS Code “Live Server”
1. Open this folder in VS Code
2. Install the “Live Server” extension
3. Right‑click `index.html` → “Open with Live Server”

### Option B: Python
```bash
python -m http.server 8080
```
Then open `http://localhost:8080`

---

## Deploy to GitHub Pages

1. Create a new GitHub repo (public or private)
2. Upload the contents of this folder to the repo root (so `index.html` is in the root)
3. In GitHub:
   - **Settings → Pages**
   - Source: **Deploy from a branch**
   - Branch: **main** (or master) / **root**
4. Save — your game will appear at your GitHub Pages URL.

---

## Customize

- Add characters in `roster.js`
- Tweak physics in `config.js`
- Add stages in `stage.js`

Have fun and feel free to remix 🤘
