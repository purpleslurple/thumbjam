const playerScoreEl = document.getElementById('playerScore');
const cpuScoreEl = document.getElementById('cpuScore');
const playerLabelEl = document.getElementById('playerLabel');
const opponentLabelEl = document.getElementById('opponentLabel');
const playerTowerEl = document.getElementById('playerTower');
const cpuTowerEl = document.getElementById('cpuTower');
const statusEl = document.getElementById('status');
const playButton = document.getElementById('playButton');
const startButton = document.getElementById('startButton');
const resetButton = document.getElementById('resetButton');
const targetSelect = document.getElementById('targetSelect');
const difficultySelect = document.getElementById('difficultySelect');
const hostButton = document.getElementById('hostButton');
const joinButton = document.getElementById('joinButton');
const copyLinkButton = document.getElementById('copyLinkButton');
const roomCodeInput = document.getElementById('roomCodeInput');
const roomLinkInput = document.getElementById('roomLinkInput');

let playerScore = 0;
let cpuScore = 0;
let targetScore = Number(targetSelect.value);
let gameActive = false;
let cpuInterval = null;
let mode = 'solo';
let roomCode = null;
let localPlayerId = null;
let roomEvents = null;

const difficultySettings = {
  easy: { min: 600, max: 950, multiplier: 1 },
  medium: { min: 450, max: 800, multiplier: 1.1 },
  hard: { min: 300, max: 650, multiplier: 1.2 },
};

function updateDisplay() {
  playerScoreEl.textContent = playerScore;
  cpuScoreEl.textContent = cpuScore;
  const playerHeight = Math.min(100, (playerScore / targetScore) * 100);
  const cpuHeight = Math.min(100, (cpuScore / targetScore) * 100);
  playerTowerEl.style.height = `${playerHeight}%`;
  cpuTowerEl.style.height = `${cpuHeight}%`;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function setMode(nextMode) {
  mode = nextMode;
  opponentLabelEl.textContent = mode === 'room' ? 'Opponent' : 'CPU';
  playerLabelEl.textContent = 'You';
}

function setRoomLink(code) {
  const link = `${window.location.origin}${window.location.pathname}?room=${code}`;
  roomLinkInput.value = link;
}

async function postJson(url, body = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }
  return payload;
}

function endSoloGame(winner) {
  gameActive = false;
  clearTimeout(cpuInterval);
  cpuInterval = null;
  setStatus(winner === 'player' ? 'Winner! Your drops hit the target first.' : 'CPU wins! Try again for a better score.');
  playButton.disabled = true;
}

function checkSoloWinner() {
  if (playerScore >= targetScore && cpuScore >= targetScore) {
    endSoloGame(playerScore >= cpuScore ? 'player' : 'cpu');
  } else if (playerScore >= targetScore) {
    endSoloGame('player');
  } else if (cpuScore >= targetScore) {
    endSoloGame('cpu');
  }
}

function getCpuDelay() {
  const difficulty = difficultySelect.value;
  const settings = difficultySettings[difficulty];
  const base = Math.random() * (settings.max - settings.min) + settings.min;
  return base / settings.multiplier;
}

function cpuStep() {
  if (!gameActive || mode !== 'solo') return;
  cpuScore += 1;
  updateDisplay();
  checkSoloWinner();
  if (gameActive) {
    cpuInterval = setTimeout(cpuStep, getCpuDelay());
  }
}

function startSoloGame() {
  if (gameActive) return;
  setMode('solo');
  playerScore = 0;
  cpuScore = 0;
  targetScore = Number(targetSelect.value);
  gameActive = true;
  playButton.disabled = false;
  startButton.disabled = false;
  updateDisplay();
  setStatus('Game on! Tap the button to add drops before the CPU reaches the target.');
  clearTimeout(cpuInterval);
  cpuInterval = setTimeout(cpuStep, getCpuDelay());
}

function resetSoloGame() {
  setMode('solo');
  gameActive = false;
  clearTimeout(cpuInterval);
  cpuInterval = null;
  playerScore = 0;
  cpuScore = 0;
  targetScore = Number(targetSelect.value);
  startButton.disabled = false;
  resetButton.disabled = false;
  playButton.disabled = true;
  updateDisplay();
  setStatus('Press START to play');
}

function renderRoomState(state) {
  setMode('room');
  targetScore = state.target;
  roomCode = state.code;

  const opponentId = localPlayerId === 'p2' ? 'p1' : 'p2';
  playerScore = state.scores[localPlayerId] || 0;
  cpuScore = state.scores[opponentId] || 0;
  opponentLabelEl.textContent = state.players[opponentId] ? 'Opponent' : 'Waiting';
  updateDisplay();

  playButton.disabled = state.status !== 'active';
  startButton.disabled = localPlayerId !== 'p1' || (state.status === 'waiting' && !state.players.p2);
  resetButton.disabled = false;

  if (state.status === 'active') {
    setStatus(`Room ${state.code} live! Tap fast.`);
  } else if (state.status === 'finished') {
    setStatus(state.winner === localPlayerId ? 'Winner! Your drops hit the target first.' : 'Opponent wins! Try again for a better score.');
    playButton.disabled = true;
  } else if (localPlayerId === 'p1') {
    setStatus(state.players.p2 ? `Room ${state.code} ready. Press START.` : `Room ${state.code} created. Share the link.`);
  } else {
    setStatus(`Joined room ${state.code}. Waiting for host.`);
  }
}

function connectToRoom(code) {
  if (roomEvents) {
    roomEvents.close();
  }

  roomEvents = new EventSource(`/api/rooms/${code}/events`);
  roomEvents.addEventListener('message', (event) => {
    renderRoomState(JSON.parse(event.data));
  });
  roomEvents.addEventListener('error', () => {
    setStatus('Lost the room connection. Check that the server is still running.');
  });
}

async function hostRoom() {
  try {
    const state = await postJson('/api/rooms', { target: Number(targetSelect.value) });
    localPlayerId = state.playerId;
    roomCodeInput.value = state.code;
    setRoomLink(state.code);
    connectToRoom(state.code);
    renderRoomState(state);
  } catch (error) {
    setStatus(`Could not host a room: ${error.message}`);
  }
}

async function joinRoom(code) {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    setStatus('Enter a room code to join.');
    return;
  }

  try {
    const state = await postJson(`/api/rooms/${normalizedCode}/join`);
    localPlayerId = state.playerId;
    roomCodeInput.value = state.code;
    setRoomLink(state.code);
    connectToRoom(state.code);
    renderRoomState(state);
  } catch (error) {
    setStatus(`Could not join room: ${error.message}`);
  }
}

async function startRoomGame() {
  if (!roomCode || localPlayerId !== 'p1') return;
  try {
    await postJson(`/api/rooms/${roomCode}/start`, { target: Number(targetSelect.value) });
  } catch (error) {
    setStatus(`Could not start room: ${error.message}`);
  }
}

async function resetRoomGame() {
  if (!roomCode) return;
  try {
    await postJson(`/api/rooms/${roomCode}/reset`);
  } catch (error) {
    setStatus(`Could not reset room: ${error.message}`);
  }
}

async function tapRoom() {
  if (!roomCode || !localPlayerId) return;
  try {
    await postJson(`/api/rooms/${roomCode}/tap`, { playerId: localPlayerId });
  } catch (error) {
    setStatus(`Tap did not register: ${error.message}`);
  }
}

playButton.addEventListener('click', () => {
  if (mode === 'room') {
    tapRoom();
    return;
  }

  if (!gameActive) return;
  playerScore += 1;
  updateDisplay();
  checkSoloWinner();
});

playButton.addEventListener('dblclick', (event) => {
  event.preventDefault();
});

startButton.addEventListener('click', () => {
  if (mode === 'room') {
    startRoomGame();
  } else {
    startSoloGame();
  }
});

resetButton.addEventListener('click', () => {
  if (mode === 'room') {
    resetRoomGame();
  } else {
    resetSoloGame();
  }
});

hostButton.addEventListener('click', hostRoom);

joinButton.addEventListener('click', () => {
  joinRoom(roomCodeInput.value);
});

copyLinkButton.addEventListener('click', async () => {
  if (!roomLinkInput.value) return;

  try {
    await navigator.clipboard.writeText(roomLinkInput.value);
    setStatus('Join link copied.');
  } catch (error) {
    roomLinkInput.select();
    setStatus('Join link selected. Use Copy from the edit menu.');
  }
});

targetSelect.addEventListener('change', () => {
  targetScore = Number(targetSelect.value);
  if (!gameActive && mode === 'solo') updateDisplay();
});

difficultySelect.addEventListener('change', () => {
  if (gameActive && mode === 'solo') {
    clearTimeout(cpuInterval);
    cpuInterval = setTimeout(cpuStep, getCpuDelay());
  }
});

const roomFromUrl = new URLSearchParams(window.location.search).get('room');
resetSoloGame();
if (roomFromUrl) {
  joinRoom(roomFromUrl);
}
