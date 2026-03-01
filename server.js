const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(express.static('public'));

// Game levels
const LEVELS = [
  {
    id: 1,
    platforms: [
      { x: 0, y: 550, w: 800, h: 20 },       // ground
      { x: 150, y: 420, w: 120, h: 16 },
      { x: 530, y: 420, w: 120, h: 16 },
      { x: 330, y: 300, w: 140, h: 16 },
    ],
    key: { x: 370, y: 260 },
    door: { x: 360, y: 490 },
    spawns: [{ x: 100, y: 500 }, { x: 650, y: 500 }],
    hint: "Both players must reach the door together!"
  },
  {
    id: 2,
    platforms: [
      { x: 0, y: 550, w: 300, h: 20 },
      { x: 500, y: 550, w: 300, h: 20 },
      { x: 200, y: 430, w: 120, h: 16 },
      { x: 480, y: 430, w: 120, h: 16 },
      { x: 330, y: 310, w: 140, h: 16 },
      { x: 50, y: 300, w: 100, h: 16 },
      { x: 650, y: 300, w: 100, h: 16 },
    ],
    key: { x: 370, y: 270 },
    door: { x: 50, y: 510 },
    spawns: [{ x: 80, y: 500 }, { x: 650, y: 500 }],
    hint: "One player grabs the key, the other waits at the door!"
  },
  {
    id: 3,
    platforms: [
      { x: 0, y: 550, w: 180, h: 20 },
      { x: 620, y: 550, w: 180, h: 20 },
      { x: 100, y: 440, w: 100, h: 16 },
      { x: 300, y: 470, w: 100, h: 16 },
      { x: 500, y: 440, w: 100, h: 16 },
      { x: 200, y: 340, w: 100, h: 16 },
      { x: 400, y: 310, w: 100, h: 16 },
      { x: 330, y: 200, w: 140, h: 16 },
    ],
    key: { x: 370, y: 160 },
    door: { x: 640, y: 500 },
    spawns: [{ x: 50, y: 500 }, { x: 680, y: 500 }],
    hint: "Reach the top together - teamwork makes the dream work!"
  }
];

// Rooms storage
const rooms = {};

function getOrCreateRoom(roomCode) {
  if (!rooms[roomCode]) {
    rooms[roomCode] = {
      players: {},
      level: 0,
      keyCollected: false,
      keyHolder: null,
      gameWon: false,
      bothAtDoor: { p1: false, p2: false }
    };
  }
  return rooms[roomCode];
}

function resetLevel(room, levelIndex) {
  const level = LEVELS[levelIndex];
  room.level = levelIndex;
  room.keyCollected = false;
  room.keyHolder = null;
  room.gameWon = false;
  room.bothAtDoor = { p1: false, p2: false };
  const playerIds = Object.keys(room.players);
  playerIds.forEach((id, i) => {
    const spawn = level.spawns[i] || level.spawns[0];
    room.players[id].x = spawn.x;
    room.players[id].y = spawn.y;
    room.players[id].vy = 0;
    room.players[id].onGround = false;
  });
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('joinRoom', ({ roomCode, nickname }) => {
    const room = getOrCreateRoom(roomCode);
    const playerCount = Object.keys(room.players).length;

    if (playerCount >= 2) {
      socket.emit('roomFull');
      return;
    }

    const playerNum = playerCount === 0 ? 1 : 2;
    const level = LEVELS[room.level];
    const spawn = level.spawns[playerNum - 1];

    room.players[socket.id] = {
      id: socket.id,
      nickname: nickname || `Player ${playerNum}`,
      playerNum,
      x: spawn.x,
      y: spawn.y,
      vy: 0,
      onGround: false,
      color: playerNum === 1 ? '#FF6B6B' : '#4ECDC4',
    };

    socket.join(roomCode);
    socket.roomCode = roomCode;

    socket.emit('joined', {
      playerNum,
      playerId: socket.id,
      level: LEVELS[room.level],
      gameState: room
    });

    const totalPlayers = Object.keys(room.players).length;
    if (totalPlayers === 1) {
      // Start immediately - no need to wait for player 2
      socket.emit('gameStart', {
        level: LEVELS[room.level],
        gameState: room
      });
    } else if (totalPlayers === 2) {
      // Second player joined - restart game for both
      io.to(roomCode).emit('gameStart', {
        level: LEVELS[room.level],
        gameState: room
      });
      io.to(roomCode).emit('player2Joined', { nickname: room.players[socket.id].nickname });
    }
  });

  socket.on('playerUpdate', (data) => {
    const roomCode = socket.roomCode;
    if (!roomCode || !rooms[roomCode]) return;
    const room = rooms[roomCode];
    const player = room.players[socket.id];
    if (!player) return;

    // Update player state
    player.x = data.x;
    player.y = data.y;
    player.vy = data.vy;
    player.onGround = data.onGround;

    const level = LEVELS[room.level];

    // Check key pickup
    if (!room.keyCollected) {
      const dx = player.x + 16 - (level.key.x + 16);
      const dy = player.y + 16 - (level.key.y + 16);
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        room.keyCollected = true;
        room.keyHolder = socket.id;
        io.to(roomCode).emit('keyCollected', { byPlayer: socket.id });
      }
    }

    // Check door proximity
    const doorDx = player.x + 16 - (level.door.x + 20);
    const doorDy = player.y + 16 - (level.door.y + 30);
    const nearDoor = Math.sqrt(doorDx * doorDx + doorDy * doorDy) < 45;

    const pKey = `p${player.playerNum}`;
    room.bothAtDoor[pKey] = nearDoor;

    // Win condition: key collected and all present players near door
    const playerCount = Object.keys(room.players).length;
    const allAtDoor = playerCount === 1 ? room.bothAtDoor[pKey] : (room.bothAtDoor.p1 && room.bothAtDoor.p2);
    if (room.keyCollected && allAtDoor && !room.gameWon) {
      room.gameWon = true;
      const nextLevel = room.level + 1;
      if (nextLevel < LEVELS.length) {
        setTimeout(() => {
          resetLevel(room, nextLevel);
          io.to(roomCode).emit('nextLevel', {
            level: LEVELS[nextLevel],
            gameState: room
          });
        }, 2000);
        io.to(roomCode).emit('levelComplete', { nextLevel });
      } else {
        io.to(roomCode).emit('gameComplete');
      }
    }

    // Broadcast to other players
    socket.to(roomCode).emit('playerMoved', {
      id: socket.id,
      x: player.x,
      y: player.y,
      vy: player.vy,
      onGround: player.onGround,
      playerNum: player.playerNum
    });
  });

  socket.on('requestRestart', () => {
    const roomCode = socket.roomCode;
    if (!roomCode || !rooms[roomCode]) return;
    const room = rooms[roomCode];
    resetLevel(room, 0);
    io.to(roomCode).emit('gameRestart', {
      level: LEVELS[0],
      gameState: room
    });
  });

  socket.on('disconnect', () => {
    const roomCode = socket.roomCode;
    if (roomCode && rooms[roomCode]) {
      delete rooms[roomCode].players[socket.id];
      io.to(roomCode).emit('playerLeft');
      if (Object.keys(rooms[roomCode].players).length === 0) {
        delete rooms[roomCode];
      }
    }
    console.log('Player disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 PicoPark server running on port ${PORT}`);
});
