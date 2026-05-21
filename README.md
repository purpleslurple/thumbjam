# ThumbJam

A simple browser game inspired by the state fair water gun challenge. Tap the button to add drops, and race the CPU to fill your tower first.

## How to run

### Solo mode

1. Open `index.html` in your browser.
2. Press `START` to begin.
3. Tap `Add Drop` as fast as you can.
4. The CPU will also accumulate drops automatically.

### Local head-to-head mode

1. Run `npm start`.
2. Find your Mac's Wi-Fi IP address, for example `ipconfig getifaddr en1`.
3. Open `http://YOUR_MAC_IP:3000` on a phone.
4. Tap `Host Game`.
5. Share the generated `http://YOUR_MAC_IP:3000/?room=ABCD` join link with another phone on the same Wi-Fi.
6. Press `START` once both players are connected.

## Features

- Local single-player mode vs CPU
- Local Wi-Fi head-to-head rooms
- Target drop selection
- Difficulty settings
- Responsive layout for desktop and mobile

## Next steps

- Add multiplayer via WebSocket / server
- Add sound effects and animations
- Add themes, streak counters, and power-ups
