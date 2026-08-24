const { Server } = require('socket.io');
const { isValidSession } = require('./auth');
const config = require('./config');

let io = null;

function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      credentials: true,
    },
    // Use polling + websocket, allow upgrades
    transports: ['polling', 'websocket'],
  });

  io.use((socket, next) => {
    // Extract session token from cookie header or query
    const cookieHeader = socket.request.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [k, ...v] = c.trim().split('=');
        return [k, v.join('=')];
      })
    );
    const token = cookies[config.sessionCookie] || socket.handshake.auth?.token;

    if (isValidSession(token)) {
      return next();
    }
    next(new Error('unauthorized'));
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function broadcast(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}

function broadcastToAuthenticated(event, payload) {
  // All connected sockets are authenticated (middleware rejects unauthorized)
  broadcast(event, payload);
}

module.exports = { initRealtime, broadcast, broadcastToAuthenticated };
