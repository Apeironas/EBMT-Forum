const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const setupSockets = require('./sockets/socketHandler');
const { logger } = require('./config/logger');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// app.js'teki CORS izin listesiyle tutarlı olsun diye aynı mantık kullanılıyor
// (virgülle ayrılmış CORS_ORIGIN, credentials ile wildcard karışmasın).
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true
  }
});

app.set('io', io);
setupSockets(io);

server.listen(PORT, () => {
  logger.info(`BM-Forum API + Socket.io port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
});
