import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_ID = process.env.AZURE_TENANT_ID || '';
const CLIENT_ID = process.env.AZURE_CLIENT_ID || '';

const jwksClient = jwksRsa({
  jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 600000,
});

/**
 * Valide le token JWT fourni lors de la connexion Socket.io.
 */
const validateSocketToken = (token: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      (header, callback) => {
        jwksClient.getSigningKey(header.kid, (err, key) => {
          if (err || !key) {
            callback(err || new Error('Clé introuvable'));
            return;
          }
          callback(null, key.getPublicKey());
        });
      },
      {
        audience: CLIENT_ID,
        issuer: [
          `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
          `https://sts.windows.net/${TENANT_ID}/`,
        ],
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          reject(err);
          return;
        }
        const payload = decoded as jwt.JwtPayload;
        resolve(payload.oid || payload.sub || '');
      }
    );
  });
};

/**
 * Initialise le serveur Socket.io avec l'authentification et les gestionnaires d'événements.
 */
export const initializeSocket = (io: SocketServer): void => {
  // Middleware d'authentification Socket.io
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new Error('Token manquant');
      }
      await validateSocketToken(token);
      next();
    } catch (error) {
      console.error('Authentification Socket.io échouée:', error);
      next(new Error('Authentification requise'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connecté: ${socket.id}`);

    // Rejoindre la salle d'une session spécifique
    socket.on('join:session', async (sessionId: string) => {
      try {
        // Vérifier que la session existe
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
          include: { attendances: { orderBy: { declaredAt: 'asc' } } },
        });

        if (!session) {
          socket.emit('error', { message: 'Session introuvable' });
          return;
        }

        const roomName = `session:${sessionId}`;
        await socket.join(roomName);
        console.log(`👥 Socket ${socket.id} a rejoint la session ${sessionId}`);

        // Envoyer la liste des présences existantes
        socket.emit('attendance:list', session.attendances.map(a => ({
          id: a.id,
          studentId: a.studentId,
          studentName: a.studentName,
          studentEmail: a.studentEmail,
          declaredAt: a.declaredAt,
        })));

        // Indiquer si la session est déjà expirée
        const now = new Date();
        if (session.closedAt || now > session.expiresAt) {
          socket.emit('session:expired');
        }
      } catch (error) {
        console.error('Erreur lors du join session:', error);
        socket.emit('error', { message: 'Erreur lors de la connexion à la session' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client déconnecté: ${socket.id}`);
    });
  });
};
