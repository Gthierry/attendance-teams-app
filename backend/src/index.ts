import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

import authRouter from './routes/auth';
import ueRouter from './routes/ue';
import attendanceRouter from './routes/attendance';
import exportRouter from './routes/export';
import { initializeSocket } from './websocket/attendanceSocket';

const app = express();
const httpServer = http.createServer(app);

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

// Configuration Socket.io
export const io = new SocketServer(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middlewares
app.use(helmet());
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes API
app.use('/api/auth', authRouter);
app.use('/api/ue', ueRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/export', exportRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialiser Socket.io
initializeSocket(io);

// Démarrer le serveur
httpServer.listen(PORT, () => {
  console.log(`🚀 Backend démarré sur le port ${PORT}`);
  console.log(`📡 Socket.io en écoute`);
});

export default app;
