# 🎮 PicoPark 2P — Cooperative Puzzle Game

A 2-player cooperative web game inspired by Pico Park. Both players must work together to collect the key and reach the door!

## 🕹️ How to Play

- **Player 1:** `A` / `D` to move, `W` to jump
- **Player 2:** `← →` to move, `↑` to jump
- Collect the 🔑 key, then **both players** must reach the 🚪 door to complete the level!
- 3 levels total

---

## 🚀 Deploying to Render.com (Step-by-Step)

### Step 1 — Push to GitHub

1. Create a new repo on [github.com](https://github.com)
2. Run these commands in your project folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2 — Deploy on Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Fill in the settings:
   - **Name:** picopark-game (or anything you like)
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Click **"Create Web Service"**
6. Wait ~2 minutes — Render gives you a public URL like `https://picopark-game.onrender.com`

### Step 3 — Play!

Share the URL with a friend, pick the same room code, and play together! 🎉

---

## 📁 File Structure

```
picopark-game/
├── server.js        ← Node.js + Socket.io server
├── package.json     ← Dependencies
├── .gitignore
└── public/
    └── index.html   ← Game (frontend)
```

## 🛠️ Run Locally

```bash
npm install
npm start
# Open http://localhost:3000
```
