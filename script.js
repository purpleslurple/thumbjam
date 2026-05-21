const playerScoreEl = document.getElementById('playerScore');
const cpuScoreEl = document.getElementById('cpuScore');
const playerTowerEl = document.getElementById('playerTower');
const cpuTowerEl = document.getElementById('cpuTower');
const statusEl = document.getElementById('status');
const playButton = document.getElementById('playButton');
const startButton = document.getElementById('startButton');
const resetButton = document.getElementById('resetButton');
const targetSelect = document.getElementById('targetSelect');
const difficultySelect = document.getElementById('difficultySelect');

let playerScore = 0;
let cpuScore = 0;
let targetScore = Number(targetSelect.value);
let gameActive = false;
let cpuInterval = null;

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

function endGame(winner) {
  gameActive = false;
  clearTimeout(cpuInterval);
  cpuInterval = null;
  setStatus(winner === 'player' ? 'Winner! Your drops hit the target first.' : 'CPU wins! Try again for a better score.');
  playButton.disabled = true;
}

function checkWinner() {
  if (playerScore >= targetScore && cpuScore >= targetScore) {
    endGame(playerScore >= cpuScore ? 'player' : 'cpu');
  } else if (playerScore >= targetScore) {
    endGame('player');
  } else if (cpuScore >= targetScore) {
    endGame('cpu');
  }
}

function getCpuDelay() {
  const difficulty = difficultySelect.value;
  const settings = difficultySettings[difficulty];
  const base = Math.random() * (settings.max - settings.min) + settings.min;
  return base / settings.multiplier;
}

function cpuStep() {
  if (!gameActive) return;
  cpuScore += 1;
  updateDisplay();
  checkWinner();
  if (gameActive) {
    cpuInterval = setTimeout(cpuStep, getCpuDelay());
  }
}

function startGame() {
  if (gameActive) return;
  playerScore = 0;
  cpuScore = 0;
  targetScore = Number(targetSelect.value);
  gameActive = true;
  playButton.disabled = false;
  updateDisplay();
  setStatus('Game on! Tap the button to add drops before the CPU reaches the target.');
  clearTimeout(cpuInterval);
  cpuInterval = setTimeout(cpuStep, getCpuDelay());
}

function resetGame() {
  gameActive = false;
  clearTimeout(cpuInterval);
  cpuInterval = null;
  playerScore = 0;
  cpuScore = 0;
  updateDisplay();
  setStatus('Press START to play');
  playButton.disabled = true;
}

playButton.addEventListener('click', () => {
  if (!gameActive) return;
  playerScore += 1;
  updateDisplay();
  checkWinner();
});

startButton.addEventListener('click', startGame);
resetButton.addEventListener('click', resetGame);

targetSelect.addEventListener('change', () => {
  targetScore = Number(targetSelect.value);
  if (!gameActive) updateDisplay();
});

difficultySelect.addEventListener('change', () => {
  if (gameActive) {
    clearTimeout(cpuInterval);
    cpuInterval = setTimeout(cpuStep, getCpuDelay());
  }
});

resetGame();
