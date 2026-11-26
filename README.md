# StarPhotobooth

Mobile-first photobooth camera app for iPhone and Android with live face-tracked AR effects, multi-shot strip layouts, and instant JPEG export.

## Features

- **6 Photobooth Layouts:** `2×2 Grid`, `3-Down Strip`, `4-Down Strip`, `3×2 Wide`, `2×3 Strip`, and `1×1 Solo`.
- **Live AR Face Effects:** Spinning 3D-illusion star, cowboy hat, pink shades, floating hearts, crown, bunny ears, and blush sparkles powered by open-source `@mediapipe/tasks-vision`.
- **3 Strip Themes:** Obsidian (`#0A0A0D`), True Pink (`#FF2D8B`), and White Bone (`#F5F0E6`).
- **JPEG Export & Retake:** Save directly to your device camera roll / downloads or discard and re-take.
- **Installable App:** Works as an offline-capable PWA on iOS & Android, with Capacitor config included for native `.apk` / `.ipa` builds.

---

## Quick Start (Development)

```bash
npm install
npm run dev:server   # Terminal 1: Node.js + Express backend (port 3000)
npm run dev          # Terminal 2: Vite frontend (port 5173)
```

Production build & run:

```bash
npm run build
npm start
```

---

## How to Install on Your Phone

### Option A: Direct Install (PWA — iPhone & Android)
Deploy the app to any HTTPS host (e.g. Render, Railway, Fly.io, or local HTTPS tunnel):

- **iPhone (Safari):**
  1. Open the app URL in **Safari**.
  2. Tap the **Share** button (`□↑`).
  3. Tap **Add to Home Screen** → **Add**.
  4. Launch **StarBooth** from your Home Screen and tap **Allow Camera & Continue**.

- **Android (Chrome):**
  1. Open the app URL in **Chrome**.
  2. Tap **Install App** on the prompt (or `⋮` menu → **Add to Home screen / Install app**).
  3. Launch **StarBooth** from your app drawer and grant camera permission.

### Option B: Native Android APK / iOS App (Capacitor)
The project includes `capacitor.config.ts` (`com.mingstar556.starphotobooth`).

```bash
npm run build
npm install @capacitor/cli @capacitor/android @capacitor/ios
npx cap add android   # Requires Android Studio / Android SDK
npx cap add ios       # Requires macOS + Xcode
npx cap sync
npx cap open android  # or: npx cap open ios
```

---

## License

MIT License © 2026 Mingstar556. See [LICENSE](./LICENSE).
