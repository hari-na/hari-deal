# Hari Deal 🃏
### Bengaluru's Favorite Real-Estate Trading Card Game

Hari Deal is a 100% faithful digital reskin of the official Monopoly Deal card game, set in the vibrant streets of Bengaluru. Trade properties from MG Road to Hebbal, build houses in Jayanagar, and use "Sly Deals" to steal the competition's coffee shop empire.

## Features
- **Faithful Rules**: Exactly matches Monopoly Deal card counts, values, and effects.
- **Bengaluru Reskin**: All properties are iconic local spots (Indiranagar, Church Street, BESCOM, etc.).
- **Solo Mode**: Play against "Namma AI".
- **Local Multiplay**: Pass-and-play with friends on one device.
- **Online Multiplayer**: Real-time play over the internet using WebSockets.
- **Responsive Design**: Play on Desktop, Tablet, or Mobile.

---

## Deployment & Usage Guide

### 1. Prerequisite
- You need [Node.js](https://nodejs.org/) installed on your computer.

### 2. Playing Locally (Solo / Pass-and-Play)
1. Navigate to the project folder.
2. Open `client/index.html` directly in any modern web browser.
3. Select **Solo vs AI** or **Local Pass-and-Play** to start immediately.

### 3. Hosting Online Multiplayer
To play with friends over the internet, you must run the WebSocket server.

#### Step 1: Install Dependencies
Open your terminal in the `server` folder and run:
```bash
cd server
npm install
```

#### Step 2: Start the Server
Run the following command in the `server` folder:
```bash
node server.js
```
The server will start on port `8080`.

#### Step 3: Configure the Client
1. Open `client/game.js`.
2. Find the line (or add it if missing): `const SERVER_URL = 'ws://localhost:8080';`
3. If you are hosting on a public service (like Render or Railway), replace `localhost:8080` with your deployed URL.

#### Step 4: Expose to Internet
- **Option A (Easy):** Use a service like [Localtunnel](https://theboroer.github.io/localtunnel-www/) or [Ngrok](https://ngrok.com/) to expose your local port 8080.
- **Option B (Permanent):** Deploy the `server` folder to [Render](https://render.com/), [Fly.io](https://fly.io/), or [Railway](https://railway.app/). Most of these have a free tier that supports WebSockets.

#### Step 5: Join the Room
1. One player clicks **Create Online Room**.
2. They will see a **Room Code** (e.g., `ABCD`).
3. Share this code with friends.
4. Friends click **Join Online Room**, enter the code, and join the lobby!

---

## Technical Details
- **Frontend**: Vanilla HTML5, CSS3, and JavaScript.
- **Backend**: Node.js with `ws` (WebSockets).
- **Game Engine**: Custom-built JS rules engine following official Monopoly Deal PDF rules.

---
*Created by Hari Deal Team - Inspired by the Garden City.*
