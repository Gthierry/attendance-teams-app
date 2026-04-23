import { Server as SocketServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Map des timers actifs par session ID
const activeTimers = new Map<string, NodeJS.Timeout>();

/**
 * Programme l'expiration automatique d'une session de présence.
 * Lorsque la session expire, émet un événement Socket.io et met à jour la base de données.
 */
export const scheduleSessionExpiry = (
  sessionId: string,
  expiresAt: Date,
  io: SocketServer
): void => {
  const now = Date.now();
  const expiryTime = expiresAt.getTime();
  const delay = Math.max(0, expiryTime - now);

  // Annuler le timer existant si présent
  if (activeTimers.has(sessionId)) {
    clearTimeout(activeTimers.get(sessionId)!);
  }

  const timer = setTimeout(async () => {
    try {
      console.log(`⏰ Session ${sessionId} expirée`);

      // Mettre à jour la session comme expirée
      await prisma.session.updateMany({
        where: { id: sessionId, closedAt: null },
        data: { closedAt: new Date() },
      });

      // Notifier les clients connectés
      io.to(`session:${sessionId}`).emit('session:expired');
      activeTimers.delete(sessionId);
    } catch (error) {
      console.error(`Erreur lors de l'expiration de la session ${sessionId}:`, error);
    }
  }, delay);

  activeTimers.set(sessionId, timer);
  console.log(`⏱️ Session ${sessionId} expire dans ${Math.round(delay / 1000)}s`);
};

/**
 * Annule le timer d'expiration d'une session (si fermée manuellement).
 */
export const cancelSessionTimer = (sessionId: string): void => {
  if (activeTimers.has(sessionId)) {
    clearTimeout(activeTimers.get(sessionId)!);
    activeTimers.delete(sessionId);
    console.log(`🔴 Timer annulé pour la session ${sessionId}`);
  }
};
