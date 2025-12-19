# Tauri Desktop App Setup

This project is configured to run as a native desktop app using Tauri.

## Prerequisites

- **Rust** (installed automatically via `rustup`)
- **Node.js** (v18+)
- **npm** or **yarn**

## Development

### Run as Desktop App (Development Mode)

```bash
npm run tauri:dev
```

This will:
1. Start the Next.js dev server on `http://localhost:3000`
2. Launch the Tauri desktop app window
3. Hot reload on code changes

### Run as Web App (Development Mode)

```bash
npm run dev
```

This runs the standard Next.js dev server in your browser.

## Building

### Build Desktop App

```bash
npm run tauri:build
```

This will:
1. Build Next.js as a static export
2. Compile the Rust backend
3. Create a native `.app` bundle (macOS) or `.exe` (Windows)

Output location: `src-tauri/target/release/bundle/`

### Build Web App

```bash
npm run build
npm run start
```

## Features

### Desktop Notifications

The app includes desktop notification support via `src/lib/desktop-notifications.ts`:

```typescript
import { sendNotification, requestNotificationPermission } from '@/lib/desktop-notifications';

// Request permission (usually on app startup)
await requestNotificationPermission();

// Send a notification
await sendNotification('Task Reminder', 'Your task is due soon!');
```

### Configuration

- **Tauri Config**: `src-tauri/tauri.conf.json`
- **Rust Code**: `src-tauri/src/lib.rs`
- **Permissions**: `src-tauri/capabilities/default.json`

## Troubleshooting

### Build Fails

1. Make sure Rust is installed: `rustc --version`
2. Clean build: `cd src-tauri && cargo clean`
3. Rebuild: `npm run tauri:build`

### App Won't Start

1. Check Next.js dev server is running: `npm run dev`
2. Check Tauri config: `src-tauri/tauri.conf.json`
3. Check console logs in the Tauri window

### Notifications Not Working

1. Check macOS System Preferences → Notifications
2. Ensure app has notification permissions
3. Check browser console for errors

## Project Structure

```
get-shit-done/
├── src/                    # Next.js app (your existing code)
├── src-tauri/              # Tauri backend
│   ├── src/
│   │   └── lib.rs          # Rust entry point
│   ├── tauri.conf.json    # Tauri configuration
│   └── Cargo.toml          # Rust dependencies
└── package.json            # Node.js dependencies + scripts
```

## Next Steps

1. **Test the desktop app**: `npm run tauri:dev`
2. **Add more native features** as needed (file system, system tray, etc.)
3. **Build for production**: `npm run tauri:build`
4. **Code sign** for distribution (required for macOS)

