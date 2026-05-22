const fs = require('fs');
const http = require('http');
const path = require('path');

const port = Number(process.env.PORT || 3000);
const rootDir = __dirname;
const rooms = new Map();

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function roomCode() {
  let code = '';
  do {
    code = Math.random().toString(36).slice(2, 6).toUpperCase();
  } while (rooms.has(code));
  return code;
}

function roomState(room) {
  return {
    code: room.code,
    target: room.target,
    status: room.status,
    countdown: room.countdown,
    players: room.players,
    scores: room.scores,
    winner: room.winner,
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function broadcast(room) {
  const message = `data: ${JSON.stringify(roomState(room))}\n\n`;
  for (const client of room.clients) {
    client.write(message);
  }
}

function createRoom(target) {
  const code = roomCode();
  const room = {
    code,
    target,
    status: 'waiting',
    countdown: null,
    countdownTimer: null,
    players: { p1: true, p2: false },
    scores: { p1: 0, p2: 0 },
    winner: null,
    clients: new Set(),
  };
  rooms.set(code, room);
  return room;
}

function clearCountdown(room) {
  if (room.countdownTimer) {
    clearTimeout(room.countdownTimer);
    room.countdownTimer = null;
  }
  room.countdown = null;
}

function startCountdown(room) {
  clearCountdown(room);
  room.status = 'countdown';
  room.countdown = 5;
  room.scores = { p1: 0, p2: 0 };
  room.winner = null;
  broadcast(room);

  function tick() {
    if (room.status !== 'countdown') return;

    if (room.countdown > 1) {
      room.countdown -= 1;
      broadcast(room);
      room.countdownTimer = setTimeout(tick, 1000);
      return;
    }

    room.countdown = 'GO!';
    broadcast(room);
    room.countdownTimer = setTimeout(() => {
      room.status = 'active';
      room.countdown = null;
      room.countdownTimer = null;
      broadcast(room);
    }, 700);
  }

  room.countdownTimer = setTimeout(tick, 1000);
}

function getRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10000) {
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.resolve(rootDir, `.${requestPath}`);

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
    });
    response.end(content);
  });
}

async function handleApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const route = url.pathname.split('/').filter(Boolean);

  if (request.method === 'POST' && url.pathname === '/api/rooms') {
    const body = await getRequestBody(request);
    const room = createRoom(Number(body.target) || 35);
    sendJson(response, 201, { ...roomState(room), playerId: 'p1' });
    return;
  }

  if (route[0] !== 'api' || route[1] !== 'rooms' || !route[2]) {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  const code = route[2].toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    sendJson(response, 404, { error: 'Room not found' });
    return;
  }

  if (request.method === 'GET' && route[3] === 'events') {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    response.write(`data: ${JSON.stringify(roomState(room))}\n\n`);
    room.clients.add(response);
    request.on('close', () => {
      room.clients.delete(response);
    });
    return;
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const body = await getRequestBody(request);

  if (route[3] === 'join') {
    if (room.players.p2) {
      sendJson(response, 409, { error: 'Room is full' });
      return;
    }

    room.players.p2 = true;
    broadcast(room);
    sendJson(response, 200, { ...roomState(room), playerId: 'p2' });
    return;
  }

  if (route[3] === 'start') {
    room.target = Number(body.target) || room.target;
    startCountdown(room);
    sendJson(response, 200, roomState(room));
    return;
  }

  if (route[3] === 'reset') {
    clearCountdown(room);
    room.status = 'waiting';
    room.scores = { p1: 0, p2: 0 };
    room.winner = null;
    broadcast(room);
    sendJson(response, 200, roomState(room));
    return;
  }

  if (route[3] === 'tap') {
    const playerId = body.playerId === 'p2' ? 'p2' : 'p1';
    if (room.status !== 'active' || room.winner) {
      sendJson(response, 200, roomState(room));
      return;
    }

    room.scores[playerId] += 1;
    if (room.scores[playerId] >= room.target) {
      room.status = 'finished';
      room.winner = playerId;
    }
    broadcast(room);
    sendJson(response, 200, roomState(room));
    return;
  }

  sendJson(response, 404, { error: 'Not found' });
}

const server = http.createServer((request, response) => {
  if (request.url.startsWith('/api/')) {
    handleApi(request, response).catch(() => {
      sendJson(response, 400, { error: 'Bad request' });
    });
    return;
  }

  serveStatic(request, response);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`ThumbJam local server running at http://localhost:${port}`);
});
