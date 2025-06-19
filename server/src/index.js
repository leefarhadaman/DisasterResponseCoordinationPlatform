import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import pino from 'pino';

// Import routes
import disasterRoutes from './routes/disasters.js';
import geocodeRoutes from './routes/geocode.js';
import socialMediaRoutes from './routes/socialMedia.js';
import resourceRoutes from './routes/resources.js';

// Import middleware
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

// Import services
import { initializeSupabase } from './services/supabase.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Initialize logger
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

// Initialize Supabase
const supabase = initializeSupabase();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info({
    msg: `${req.method} ${req.path}`,
    module: 'server',
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Mock auth middleware (injects req.user)
app.use(authMiddleware);

// Make supabase and io available to routes
app.use((req, res, next) => {
  req.supabase = supabase;
  req.io = io;
  req.logger = logger;
  next();
});

// Routes
app.use('/disasters', disasterRoutes);
app.use('/geocode', geocodeRoutes);
app.use('/social-media', socialMediaRoutes);
app.use('/resources', resourceRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info({
    msg: 'Client connected',
    module: 'socket',
    socketId: socket.id
  });

  socket.on('disconnect', () => {
    logger.info({
      msg: 'Client disconnected',
      module: 'socket',
      socketId: socket.id
    });
  });

  // Join disaster room for real-time updates
  socket.on('join-disaster', (disasterId) => {
    socket.join(`disaster-${disasterId}`);
    logger.info({
      msg: 'Client joined disaster room',
      module: 'socket',
      socketId: socket.id,
      disasterId
    });
  });

  socket.on('leave-disaster', (disasterId) => {
    socket.leave(`disaster-${disasterId}`);
    logger.info({
      msg: 'Client left disaster room',
      module: 'socket',
      socketId: socket.id,
      disasterId
    });
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info({
    msg: `Server running on port ${PORT}`,
    module: 'server',
    port: PORT,
    environment: process.env.NODE_ENV
  });
});

export { io, logger }; 