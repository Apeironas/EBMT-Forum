const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const commentRoutes = require('./routes/commentRoutes');
const postRoutes = require('./routes/postRoutes');
const voteRoutes = require('./routes/voteRoutes');
const tagRoutes = require('./routes/tagRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const profileRoutes = require('./routes/profileRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const searchRoutes = require('./routes/searchRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const { globalLimiter, authLimiter } = require('./middlewares/security');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const { logger } = require('./config/logger');

const app = express();

app.set('trust proxy', 1);

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.debug(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.use(helmet());

// credentials: true ile origin: '*' birlikte tarayıcıda çalışmaz (CORS spec).
// Bu yüzden CORS_ORIGIN'i açık bir izin listesine çeviriyoruz; virgülle birden
// fazla origin verilebilir (örn. "http://localhost:5173,https://forum.example.com").
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // origin, tarayıcı dışı istemcilerde (curl, Postman, health check) undefined gelir.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: '${origin}' izinli origin listesinde değil.`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', commentRoutes);
app.use('/api/votes', voteRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'API is healthy!' });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
