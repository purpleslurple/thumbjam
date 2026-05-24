const playerScoreEl = document.getElementById('playerScore');
const cpuScoreEl = document.getElementById('cpuScore');
const playerLabelEl = document.getElementById('playerLabel');
const opponentLabelEl = document.getElementById('opponentLabel');
const playerLaneLabelEl = document.getElementById('playerLaneLabel');
const opponentLaneLabelEl = document.getElementById('opponentLaneLabel');
const playerTowerEl = document.getElementById('playerTower');
const cpuTowerEl = document.getElementById('cpuTower');
const statusEl = document.getElementById('status');
const setupStatusEl = document.getElementById('setupStatus');
const setupScreen = document.getElementById('setupScreen');
const gameScreen = document.getElementById('gameScreen');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownText = document.getElementById('countdownText');
const resultsOverlay = document.getElementById('resultsOverlay');
const resultTitle = document.getElementById('resultTitle');
const resultScoreSummary = document.getElementById('resultScoreSummary');
const resultPlayerName = document.getElementById('resultPlayerName');
const resultPlayerScore = document.getElementById('resultPlayerScore');
const resultOpponentName = document.getElementById('resultOpponentName');
const resultOpponentScore = document.getElementById('resultOpponentScore');
const resultDetail = document.getElementById('resultDetail');
const playAgainButton = document.getElementById('playAgainButton');
const setupButton = document.getElementById('setupButton');
const playButton = document.getElementById('playButton');
const playZone = document.querySelector('.play-zone');
const arenaEl = document.getElementById('arena');
const settingsButton = document.getElementById('settingsButton');
const doneSettingsButton = document.getElementById('doneSettingsButton');
const startButton = document.getElementById('startButton');
const playerNameInput = document.getElementById('playerNameInput');
const targetSelect = document.getElementById('targetSelect');
const difficultySelect = document.getElementById('difficultySelect');
const scoreDisplaySelect = document.getElementById('scoreDisplaySelect');
const hostButton = document.getElementById('hostButton');
const joinButton = document.getElementById('joinButton');
const copyLinkButton = document.getElementById('copyLinkButton');
const roomCodeInput = document.getElementById('roomCodeInput');
const roomLinkInput = document.getElementById('roomLinkInput');
const playerRaceCarEl = document.getElementById('playerRaceCar');
const cpuRaceCarEl = document.getElementById('cpuRaceCar');
const playerRaceLabelEl = document.getElementById('playerRaceLabel');
const opponentRaceLabelEl = document.getElementById('opponentRaceLabel');

let playerScore = 0;
let cpuScore = 0;
let targetScore = Number(targetSelect.value);
let gameActive = false;
let cpuInterval = null;
let soloCountdownTimer = null;
let mode = 'solo';
let roomCode = null;
let localPlayerId = null;
let roomEvents = null;

const skillProfileKey = 'thumbjamSoloSkillProfile';
const playerNameKey = 'thumbjamPlayerName';
const scoreDisplayKey = 'thumbjamScoreDisplay';
const defaultPlayerName = 'Kimmy';
const defaultScoreDisplay = 'tubes';
const adaptiveStep = 0.08;
const adaptiveMin = 0.72;
const adaptiveMax = 1.48;

const difficultySettings = {
  easy: { min: 420, max: 720, multiplier: 1 },
  medium: { min: 280, max: 520, multiplier: 1.15 },
  hard: { min: 140, max: 300, multiplier: 1.35 },
};

function defaultSkillProfile() {
  return Object.keys(difficultySettings).reduce((profile, difficulty) => {
    profile[difficulty] = {
      adjustment: 1,
      streakResult: null,
      streakCount: 0,
      gamesPlayed: 0,
    };
    return profile;
  }, {});
}

function loadSkillProfile() {
  const defaults = defaultSkillProfile();
  try {
    const savedProfile = JSON.parse(localStorage.getItem(skillProfileKey)) || {};
    return Object.keys(defaults).reduce((profile, difficulty) => {
      profile[difficulty] = { ...defaults[difficulty], ...savedProfile[difficulty] };
      return profile;
    }, {});
  } catch (error) {
    return defaults;
  }
}

let skillProfile = loadSkillProfile();

function loadPlayerName() {
  try {
    return localStorage.getItem(playerNameKey) || defaultPlayerName;
  } catch (error) {
    return defaultPlayerName;
  }
}

let playerName = loadPlayerName();
playerNameInput.value = playerName;

function loadScoreDisplay() {
  try {
    const savedDisplay = localStorage.getItem(scoreDisplayKey);
    return savedDisplay === 'race' ? 'race' : defaultScoreDisplay;
  } catch (error) {
    return defaultScoreDisplay;
  }
}

function applyScoreDisplay(display) {
  const safeDisplay = display === 'race' ? 'race' : defaultScoreDisplay;
  scoreDisplaySelect.value = safeDisplay;
  arenaEl.classList.toggle('score-display-race', safeDisplay === 'race');
}

function saveScoreDisplay(display) {
  const safeDisplay = display === 'race' ? 'race' : defaultScoreDisplay;
  try {
    localStorage.setItem(scoreDisplayKey, safeDisplay);
  } catch (error) {
    // Keep the setting optional if storage is unavailable.
  }
  applyScoreDisplay(safeDisplay);
}

applyScoreDisplay(loadScoreDisplay());

function playerDisplayName() {
  const name = playerName.trim();
  return name || defaultPlayerName;
}

function playerShortName() {
  const name = playerDisplayName();
  if (name.toLowerCase() === 'kimmy') return 'Kim';
  return name.split(/\s+/)[0] || defaultPlayerName;
}

function savePlayerName(value) {
  playerName = value.trim();
  try {
    if (playerName) {
      localStorage.setItem(playerNameKey, playerName);
    } else {
      localStorage.removeItem(playerNameKey);
    }
  } catch (error) {
    // Keep personalization optional if storage is unavailable.
  }
  updatePlayerLabels();
}

function updatePlayerLabels() {
  playerLabelEl.textContent = playerDisplayName();
  playerLaneLabelEl.textContent = playerDisplayName();
  playerRaceLabelEl.textContent = playerDisplayName();
}

function updateDisplay() {
  playerScoreEl.textContent = playerScore;
  cpuScoreEl.textContent = cpuScore;
  const playerHeight = Math.min(100, (playerScore / targetScore) * 100);
  const cpuHeight = Math.min(100, (cpuScore / targetScore) * 100);
  playerTowerEl.style.height = `${playerHeight}%`;
  cpuTowerEl.style.height = `${cpuHeight}%`;
  playerTowerEl.closest('.lane').style.setProperty('--progress', `${playerHeight}%`);
  cpuTowerEl.closest('.lane').style.setProperty('--progress', `${cpuHeight}%`);
  playerRaceCarEl.style.setProperty('--turn', `${playerHeight * 3.6}deg`);
  cpuRaceCarEl.style.setProperty('--turn', `${cpuHeight * 3.6}deg`);
}

function setStatus(text) {
  statusEl.textContent = text;
  setupStatusEl.textContent = text;
}

function setSectionVisible(element, isVisible) {
  element.classList.toggle('is-hidden', !isVisible);
}

function setPlayingLock(isPlaying) {
  document.body.classList.toggle('is-playing', isPlaying);
}

function setScreen(screen) {
  const isGame = screen === 'game';
  setSectionVisible(setupScreen, !isGame);
  setSectionVisible(gameScreen, isGame);
  setPlayingLock(isGame);
}

function setCountdown(value) {
  const isVisible = value !== null && value !== undefined;
  countdownText.textContent = isVisible ? value : '';
  setSectionVisible(countdownOverlay, isVisible);
}

function setResults(isVisible, title = '', detail = '', scoreSummary = null) {
  resultTitle.textContent = title;
  resultDetail.textContent = detail;
  if (scoreSummary) {
    resultPlayerName.textContent = scoreSummary.playerName;
    resultPlayerScore.textContent = scoreSummary.playerScore;
    resultOpponentName.textContent = scoreSummary.opponentName;
    resultOpponentScore.textContent = scoreSummary.opponentScore;
  }
  setSectionVisible(resultScoreSummary, Boolean(scoreSummary));
  setSectionVisible(resultsOverlay, isVisible);
}

function setResultActionsVisible(isVisible, showSetup = isVisible) {
  setSectionVisible(playAgainButton, isVisible);
  setSectionVisible(setupButton, showSetup);
}

function setSetupStartLabel(text) {
  startButton.textContent = text;
}

function setPlayButtonLabel(text) {
  playButton.textContent = text;
}

function setSettingsAvailable(isAvailable) {
  settingsButton.disabled = !isAvailable;
}

function setMode(nextMode) {
  mode = nextMode;
  opponentLabelEl.textContent = mode === 'room' ? 'Opponent' : 'CPU';
  opponentLaneLabelEl.textContent = mode === 'room' ? 'Opponent' : 'CPU';
  opponentRaceLabelEl.textContent = mode === 'room' ? 'Opponent' : 'CPU';
  updatePlayerLabels();
}

function setRoomLink(code) {
  const link = `${window.location.origin}${window.location.pathname}?room=${code}`;
  roomLinkInput.value = link;
}

function closeRoomConnection() {
  if (roomEvents) {
    roomEvents.close();
    roomEvents = null;
  }
}

function returnToSetup() {
  closeRoomConnection();
  roomCode = null;
  localPlayerId = null;
  roomCodeInput.value = '';
  roomLinkInput.value = '';
  resetSoloGame('setup');
}

function returnToGame() {
  if (mode === 'room') return;
  setScreen('game');
  setStatus(`Ready, ${playerDisplayName()}? Press START.`);
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

function saveSkillProfile() {
  try {
    localStorage.setItem(skillProfileKey, JSON.stringify(skillProfile));
  } catch (error) {
    // Keep adaptive difficulty optional if storage is unavailable.
  }
}

function currentDifficultyProfile() {
  const difficulty = difficultySelect.value;
  const defaults = defaultSkillProfile()[difficulty];
  skillProfile[difficulty] = { ...defaults, ...skillProfile[difficulty] };
  return skillProfile[difficulty];
}

function recordSoloResult(winner) {
  const difficulty = difficultySelect.value;
  const profile = currentDifficultyProfile();
  const result = winner === 'player' ? 'win' : 'loss';

  profile.gamesPlayed += 1;
  profile.streakCount = profile.streakResult === result ? profile.streakCount + 1 : 1;
  profile.streakResult = result;

  if (profile.streakCount >= 3) {
    const direction = result === 'win' ? 1 : -1;
    profile.adjustment = Math.min(adaptiveMax, Math.max(adaptiveMin, profile.adjustment + adaptiveStep * direction));
    profile.streakCount = 0;
    profile.streakResult = null;
  }

  skillProfile[difficulty] = profile;
  saveSkillProfile();
}

function clearSoloCountdown() {
  if (soloCountdownTimer) {
    clearTimeout(soloCountdownTimer);
    soloCountdownTimer = null;
  }
}

function beginSoloRound() {
  setScreen('game');
  gameActive = true;
  playButton.disabled = false;
  setSettingsAvailable(false);
  setPlayButtonLabel('TAP');
  setCountdown(null);
  setResults(false);
  setStatus(`Go, ${playerShortName()}! Tap the button.`);
  cpuInterval = setTimeout(cpuStep, getCpuDelay());
}

function startSoloCountdown() {
  clearSoloCountdown();
  setScreen('game');
  setResults(false);
  let countdown = 3;
  setCountdown(countdown);
  setPlayButtonLabel('GET READY');
  setSettingsAvailable(false);
  setStatus(`Get ready, ${playerShortName()}...`);

  function tick() {
    if (mode !== 'solo') return;

    if (countdown > 1) {
      countdown -= 1;
      setCountdown(countdown);
      soloCountdownTimer = setTimeout(tick, 1000);
      return;
    }

    setCountdown('GO!');
    soloCountdownTimer = setTimeout(() => {
      soloCountdownTimer = null;
      beginSoloRound();
    }, 350);
  }

  soloCountdownTimer = setTimeout(tick, 1000);
}

function endSoloGame(winner) {
  gameActive = false;
  clearSoloCountdown();
  clearTimeout(cpuInterval);
  cpuInterval = null;
  recordSoloResult(winner);
  playButton.disabled = true;
  setSettingsAvailable(true);
  setPlayButtonLabel('START');
  setResultActionsVisible(true, false);
  setStatus('Round complete.');
  setResults(
    true,
    winner === 'player' ? 'You did it!' : 'Good try',
    winner === 'player' ? `Great tapping, ${playerDisplayName()}.` : `Nice try, ${playerShortName()}.`,
    {
      playerName: playerDisplayName(),
      playerScore,
      opponentName: 'CPU',
      opponentScore: cpuScore,
    }
  );
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
  const profile = currentDifficultyProfile();
  const base = Math.random() * (settings.max - settings.min) + settings.min;
  return base / (settings.multiplier * profile.adjustment);
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
  if (gameActive || soloCountdownTimer) return;
  setMode('solo');
  setSetupStartLabel('START SOLO');
  playerScore = 0;
  cpuScore = 0;
  targetScore = Number(targetSelect.value);
  gameActive = false;
  playButton.disabled = true;
  setPlayButtonLabel('GET READY');
  updateDisplay();
  clearTimeout(cpuInterval);
  cpuInterval = null;
  startSoloCountdown();
}

function resetSoloGame(screen = 'game') {
  setMode('solo');
  setScreen(screen);
  setSetupStartLabel('START SOLO');
  clearSoloCountdown();
  setCountdown(null);
  setResults(false);
  setResultActionsVisible(true);
  gameActive = false;
  clearTimeout(cpuInterval);
  cpuInterval = null;
  playerScore = 0;
  cpuScore = 0;
  targetScore = Number(targetSelect.value);
  startButton.disabled = false;
  playButton.disabled = false;
  setSettingsAvailable(true);
  setPlayButtonLabel('START');
  updateDisplay();
  setStatus(`Ready, ${playerDisplayName()}? Press START.`);
}

function renderRoomState(state) {
  setMode('room');
  targetScore = state.target;
  roomCode = state.code;

  const opponentId = localPlayerId === 'p2' ? 'p1' : 'p2';
  playerScore = state.scores[localPlayerId] || 0;
  cpuScore = state.scores[opponentId] || 0;
  opponentLabelEl.textContent = state.players[opponentId] ? 'Opponent' : 'Waiting';
  opponentRaceLabelEl.textContent = state.players[opponentId] ? 'Opponent' : 'Waiting';
  updateDisplay();

  playButton.disabled = state.status !== 'active';
  setSettingsAvailable(state.status !== 'countdown' && state.status !== 'active');
  setPlayButtonLabel(state.status === 'active' ? 'TAP' : 'WAIT');
  startButton.disabled = localPlayerId !== 'p1' || state.status === 'countdown' || state.status === 'active' || (state.status === 'waiting' && !state.players.p2);
  setSetupStartLabel('START ROOM');
  setCountdown(state.countdown);

  if (state.status === 'countdown') {
    setScreen('game');
    setResults(false);
    setStatus(`Room ${state.code} starting...`);
  } else if (state.status === 'active') {
    setScreen('game');
    setResults(false);
    setStatus(`Room ${state.code} live! Tap fast.`);
  } else if (state.status === 'finished') {
    setScreen('game');
    setStatus('Round complete.');
    playButton.disabled = true;
    setResultActionsVisible(localPlayerId === 'p1');
    setResults(
      true,
      state.winner === localPlayerId ? 'Winner!' : 'Opponent Wins',
      localPlayerId === 'p1'
        ? state.winner === localPlayerId ? 'Your drops hit the target first.' : 'Try again for a better score.'
        : 'Waiting for host to start another round.',
      {
        playerName: playerDisplayName(),
        playerScore,
        opponentName: 'Opponent',
        opponentScore: cpuScore,
      }
    );
  } else if (localPlayerId === 'p1') {
    setScreen('setup');
    setResults(false);
    setResultActionsVisible(true);
    setStatus(state.players.p2 ? `Room ${state.code} ready. Press START.` : `Room ${state.code} created. Share the link.`);
  } else {
    setScreen('game');
    setResults(false);
    setResultActionsVisible(false);
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
    setSetupStartLabel('START ROOM');
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
    setSetupStartLabel('START SOLO');
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

  if (!gameActive) {
    startSoloGame();
    return;
  }

  playerScore += 1;
  updateDisplay();
  checkSoloWinner();
});

playButton.addEventListener('dblclick', (event) => {
  event.preventDefault();
});

playZone.addEventListener('dblclick', (event) => {
  event.preventDefault();
});

startButton.addEventListener('click', () => {
  if (mode === 'room') {
    startRoomGame();
  } else {
    startSoloGame();
  }
});

playAgainButton.addEventListener('click', () => {
  if (mode === 'room') {
    startRoomGame();
  } else {
    resetSoloGame('game');
  }
});

setupButton.addEventListener('click', returnToSetup);

settingsButton.addEventListener('click', returnToSetup);

doneSettingsButton.addEventListener('click', returnToGame);

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

playerNameInput.addEventListener('input', () => {
  savePlayerName(playerNameInput.value);
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

scoreDisplaySelect.addEventListener('change', () => {
  saveScoreDisplay(scoreDisplaySelect.value);
});

const roomFromUrl = new URLSearchParams(window.location.search).get('room');
resetSoloGame();
if (roomFromUrl) {
  joinRoom(roomFromUrl);
}
