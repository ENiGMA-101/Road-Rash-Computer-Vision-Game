# 🏍️ Road Rash Computer Vision Game

<p align="center">
  <b>A fast-paced Road Rash inspired racing game controlled with real-time hand gestures.</b><br>
  Steer, punch, kick, brake and boost using your webcam — no traditional controller required.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white">
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white">
  <img src="https://img.shields.io/badge/Electron-39-47848F?style=for-the-badge&logo=electron&logoColor=white">
  <img src="https://img.shields.io/badge/MediaPipe-Hand%20Tracking-FF6F00?style=for-the-badge">
</p>

---

## 🎮 Overview

**Road Rash Computer Vision Game** is a desktop racing and brawler game inspired by classic Road Rash gameplay, redesigned around **Computer Vision**.

Instead of relying only on a keyboard or traditional game controller, the game uses your webcam and **MediaPipe Hand Landmarker** to track hand movement and gestures in real time.

### 🚀 What This Project Includes

- 🏁 **Solo Campaign** with 5 themed levels
- 🤜 **Road Combat** with punches and kicks
- 🚓 **Rivals, Cops and Bosses**
- 🌦️ **Dynamic Weather Effects**
- 💨 **Nitro / Boost System**
- ❤️ **Health and Damage System**
- 🏆 **Score, Combo and Takedown System**
- 🤝 **Local 2-Player Split-Screen Mode**
- ✋ **Real-Time Hand Landmark Visualization**
- ⌨️ **Keyboard Fallback Controls**
- 🖥️ **Fullscreen Mode**
- 🔊 **Engine and Gameplay Sound Effects**

---

## 🎥 Demonstration Video

> 🚧 **Full Demonstration video will be added here.**

### ▶️ Watch the Demo

[roadrush-optionB-overview.webm](https://github.com/user-attachments/assets/bcc1a2fe-3bab-4a0f-bac1-d315977216f7)

---

## ✨ Key Features

### ✋ Computer Vision Controls

The game uses your webcam to detect hand landmarks and convert gestures into gameplay actions.

| Gesture | Action |
|---|---|
| 🤚 Open Hand | Normal control |
| ✊ Fist | Punch |
| 🤏 Pinch | Brake |
| 👍 Thumbs Up | Nitro / Boost |
| ☝️ Point | Wheelie / Jump |
| ✌️ Two Fingers | Kick |
| ↔️ Hand Movement | Steering |

The hand-control system includes:

- Real-time hand tracking
- Hand landmark detection
- Gesture classification
- Steering prediction
- Movement smoothing
- Gesture debouncing
- Hand tilt detection

---

## 🤝 2-Player Computer Vision Mode

Two players can play using **one webcam**.

### Player Mapping

```text
             WEBCAM
                │
       ┌────────┴────────┐
       │                 │
   RIGHT HAND         LEFT HAND
       │                 │
       ▼                 ▼
   PLAYER 1           PLAYER 2
```

- 👤 **Player 1** → Right hand
- 👤 **Player 2** → Left hand
- 🏍️ Split-screen racing
- ✊ Independent punch controls
- ↔️ Independent steering
- 🏁 Race to the finish
- ❤️ Last rider standing can also win

---

## ⌨️ Keyboard Fallback

The project also includes keyboard controls for testing without a webcam.

### Player 1

```text
A / D  → Steering
F      → Punch
```

### Player 2

```text
← / →  → Steering
L      → Punch
```

---

# 🕹️ Game Modes

## 🏁 Solo Campaign

The Solo Campaign contains **5 themed levels** with different gameplay environments.

Features include:

- Road traffic
- Rival riders
- Cops
- Boss encounters
- Road hazards
- Pickups
- Weather effects
- Nitro
- Combat
- Score system
- Combo system

### Difficulty Levels

```text
Easy
Normal
Hard
Extreme
```

---

## 🤜🤛 Local Versus

Play against a friend using one webcam.

Each player receives their own side of the split-screen.

```text
┌───────────────────────┬───────────────────────┐
│       PLAYER 1        │       PLAYER 2        │
│                       │                       │
│    RIGHT HAND ✋      │      ✋ LEFT HAND      │
│                       │                       │
│      🏍️               │               🏍️      │
│                       │                       │
└───────────────────────┴───────────────────────┘
```

---

# 🧠 Computer Vision Pipeline

The game uses **MediaPipe Tasks Vision** for real-time hand tracking.

```text
             WEBCAM
                │
                ▼
         Video Stream
                │
                ▼
     MediaPipe Hand Landmarker
                │
        ┌───────┴────────┐
        │                │
   Hand Landmarks    Hand Position
        │                │
        └───────┬────────┘
                ▼
       Gesture Detection
                │
     ┌──────────┼───────────┐
     │          │           │
     ▼          ▼           ▼
  Steering    Combat      Actions
     │          │           │
     │       Punch/Kick   Nitro/Brake
     │                       │
     └──────────┬────────────┘
                ▼
           Game Logic
                │
                ▼
          Canvas Renderer
                │
                ▼
             Gameplay
```

---

# 🧩 Technology Stack

| Technology | Purpose |
|---|---|
| ⚛️ **React** | UI and application structure |
| 🔷 **TypeScript** | Type-safe development |
| ⚡ **Vite** | Development and production build |
| 🎨 **Tailwind CSS** | UI styling |
| ✋ **MediaPipe Tasks Vision** | Hand tracking and gesture recognition |
| 🖼️ **HTML Canvas** | Game rendering |
| 🖥️ **Electron** | Desktop application |
| 🔊 **Web Audio API** | Sound effects and engine audio |

---

# 📁 Project Structure

```text
Road-Rash-Computer-Vision-Game/
│
├── build/
│   └── road-rash.ico
│
├── electron/
│   └── main.cjs
│
├── public/
│   ├── favicon-16.png
│   ├── favicon-32.png
│   ├── favicon-64.png
│   ├── icon-192.png
│   ├── icon-512.png
│   └── ...
│
├── src/
│   ├── App.tsx
│   ├── Game.tsx
│   ├── Versus.tsx
│   ├── levels.ts
│   ├── render.ts
│   ├── sound.ts
│   ├── useHandControl.ts
│   ├── useDualHandControl.ts
│   ├── main.tsx
│   └── ...
│
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts
```

---

# ⚙️ Requirements

Before running the project, make sure you have:

- **Node.js**
- **npm**
- A working **webcam**
- A modern browser or Chromium environment
- A system capable of running Electron

For the best computer-vision experience, use good lighting and keep your hands clearly visible.

---

# 🚀 Installation

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/ENiGMA-101/Road-Rash-Computer-Vision-Game.git
```

Enter the project directory:

```bash
cd Road-Rash-Computer-Vision-Game
```

---

## 2️⃣ Install Dependencies

```bash
npm install
```

---

## 3️⃣ Run Development Server

```bash
npm run dev
```

Vite will display the local development URL in the terminal.

Open that URL in your browser.

---

# 🖥️ Electron Development

To run the desktop version during development:

```bash
npm run electron:dev
```

This launches the game inside an Electron desktop window.

---

# 🏗️ Production Build

Build the web application:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

---

# 📦 Build Desktop Application

To create the packaged desktop application:

```bash
npm run dist
```

The generated release files will be available inside:

```text
release/
```

---

# 📷 Camera Setup

When computer-vision mode is enabled, the application requests permission to access your webcam.

For better hand tracking:

### ✅ Recommended

- Use good lighting
- Keep your hand inside the camera frame
- Keep fingers clearly separated when using gestures
- Avoid very dark environments
- Keep a reasonable distance from the webcam

### 👥 For 2 Players

Stand side-by-side and make sure both players' hands are visible.

```text
       CAMERA

   👤             👤
 Player 1       Player 2
   ✋               ✋
RIGHT HAND      LEFT HAND
```

---

# 🎯 Controls

## Solo Mode

| Input | Function |
|---|---|
| ↔️ Hand Movement | Steering |
| 🤚 Hand Tilt | Additional steering |
| ✊ Fist | Punch |
| ✌️ Two Fingers | Kick |
| 🤏 Pinch | Brake |
| 👍 Thumbs Up | Nitro |
| ☝️ Point | Wheelie / Jump |

---

## 2-Player Mode

| Player | Camera Hand | Keyboard |
|---|---|---|
| 🧑 Player 1 | Right Hand | `A / D` + `F` |
| 🧑 Player 2 | Left Hand | `← / →` + `L` |

---

# 🏗️ Main Architecture

## `App.tsx`

Controls the main menu and game-mode selection.

```text
Main Menu
   │
   ├── Solo Campaign
   │
   └── Play With Friends
```

---

## `useHandControl.ts`

Responsible for single-player computer vision.

Main responsibilities:

- Webcam access
- MediaPipe initialization
- Hand detection
- Hand landmark extraction
- Gesture classification
- Steering calculation
- Movement smoothing
- Gesture prediction

---

## `useDualHandControl.ts`

Responsible for 2-player hand tracking.

It detects up to two hands and maps them according to handedness:

```text
Right Hand → Player 1
Left Hand  → Player 2
```

---

## `Game.tsx`

Contains the main Solo Campaign game logic.

Includes:

- Player movement
- Rival riders
- Police
- Bosses
- Cars
- Pickups
- Hazards
- Combat
- Nitro
- Health
- Score
- Combo
- Level progression
- HUD
- Game-over system

---

## `Versus.tsx`

Contains the local multiplayer game.

Features:

- Split-screen rendering
- Two-hand tracking
- Two independent players
- Racing
- Combat
- Health
- Score
- Finish detection
- Winner detection

---

## `render.ts`

Responsible for drawing game objects onto the HTML Canvas.

Examples:

- 🏍️ Bikes
- 🚗 Cars
- 🌄 Scenery
- 🛣️ Roads
- 💥 Effects

---

## `sound.ts`

Handles game audio including:

- Engine sound
- Punch effects
- Collision sounds
- Game feedback
- Victory sounds

---

## `levels.ts`

Contains:

- Level configuration
- Difficulty parameters
- Level themes
- Weather
- Gameplay settings

---

# 🔬 Computer Vision Details

The project uses MediaPipe's hand landmarks to estimate:

```text
21 Hand Landmarks
       │
       ├── Finger Positions
       ├── Palm Position
       ├── Hand Openness
       ├── Hand Tilt
       └── Finger Configuration
```

These values are converted into gameplay commands.

For example:

```text
Hand moves LEFT
      ↓
Steering = -1
      ↓
Bike moves LEFT
```

And:

```text
Closed Fist
      ↓
Gesture = FIST
      ↓
Punch
      ↓
Opponent takes damage
```

---

# 📊 Gesture Recognition

The system identifies several hand configurations.

```text
OPEN HAND       → Normal
FIST            → Punch
PINCH           → Brake
THUMBS UP       → Nitro
POINT           → Wheelie
TWO FINGERS     → Kick
```

A short gesture history is used to reduce accidental gesture changes caused by individual noisy frames.

---

# 🎨 Game Design

The visual style combines:

- Dark futuristic backgrounds
- Neon highlights
- Arcade racing aesthetics
- Canvas-based game rendering
- Responsive HUD
- Fullscreen gameplay

The interface is designed to keep the gameplay area large and easy to see.

---

# 🧪 Development Concept

This project combines several areas of software engineering:

```text
Computer Vision
       +
Game Development
       +
Frontend Development
       +
Human-Computer Interaction
       +
Desktop Application Development
       │
       ▼
Road Rash Computer Vision Game
```

The project demonstrates how a webcam can be used as a natural game controller.

---

# 📌 Current Status

🚧 **Active Development**

Current implementation includes:

- ✅ Solo Campaign
- ✅ 5 themed levels
- ✅ Multiple difficulty levels
- ✅ Computer-vision steering
- ✅ Gesture recognition
- ✅ Punch
- ✅ Kick
- ✅ Brake
- ✅ Nitro
- ✅ Wheelie / Jump
- ✅ Rivals
- ✅ Cops
- ✅ Boss encounters
- ✅ Road traffic
- ✅ Weather effects
- ✅ Local 2-player mode
- ✅ Keyboard fallback
- ✅ Fullscreen mode
- ✅ Sound effects
- ✅ Electron desktop support

---

# 🔮 Future Improvements

Possible future development:

- 🌐 Online multiplayer
- 🏍️ More bikes
- 👤 More playable characters
- 🗺️ More environments
- 🏁 More race modes
- 🤖 Improved opponent AI
- ✋ More advanced gestures
- 🎮 Controller support
- 🏆 Online leaderboard
- 💾 Cloud save system
- 🎨 Improved graphics
- ⚡ Better low-end performance
- 📦 Improved installer and release system

---

# 🤝 Contributing

Contributions, ideas and improvements are welcome.

Create a feature branch:

```bash
git checkout -b feature/your-feature
```

Make your changes:

```bash
git add .
```

Commit:

```bash
git commit -m "Add your feature"
```

Push:

```bash
git push origin feature/your-feature
```

Then open a Pull Request.

---

# 👨‍💻 Author

### ENiGMA-101

GitHub:

https://github.com/ENiGMA-101

---

# ⭐ Support

If you find this project interesting, consider giving the repository a ⭐ on GitHub.

Your support helps encourage further development in:

- Computer Vision
- Game Development
- Human-Computer Interaction
- AI-powered applications
- Interactive software

---

# 📄 License

No explicit open-source license is currently specified in this repository.

If you plan to distribute or reuse this project, add an appropriate license such as:

- MIT
- Apache-2.0
- GPL-3.0

Choose the license according to your intended usage and distribution requirements.

---

<p align="center">
  🏍️ <b>ROAD RASH</b> × ✋ <b>COMPUTER VISION</b> × 🎮 <b>GAME DEVELOPMENT</b>
</p>

<p align="center">
  <i>Control the road with your hands.</i>
</p>
