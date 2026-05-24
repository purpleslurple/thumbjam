# ThumbJam

A simple browser game inspired by the state fair water gun challenge. Tap the button to add drops, and race the CPU to fill your tower first.

## How to run

### Solo mode

1. Open `index.html` in your browser.
2. Press `START` to begin.
3. Tap `Add Drop` as fast as you can.
4. The CPU will also accumulate drops automatically.

### Offline iPhone solo mode

1. Open `https://purpleslurple.github.io/thumbjam/` in Safari while online.
2. Tap Share, then Add to Home Screen.
3. Launch ThumbJam from the Home Screen once while still online so Safari can cache the app.
4. Solo mode should continue to open from the Home Screen without a network connection.

Head-to-head rooms still require a reachable local server and Wi-Fi connection.

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
- Adaptive solo difficulty based on win/loss streaks
- Player name, target drops, difficulty, and score display saved locally
- Responsive layout for desktop and mobile

## Next steps

- Add an optional debug view for localStorage settings during play
- Clean up abandoned local rooms after a period of inactivity
- Add sound effects and animations
- Add themes, streak counters, and power-ups
