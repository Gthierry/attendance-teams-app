import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import { PrismaClient } from '@prisma/client';
import { io } from '../index';
import { scheduleSessionExpiry } from '../services/timerService';

const router = Router();
const prisma = new PrismaClient();

const SESSION_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * POST /api/attendance/session
 * Crée une nouvelle session de présence pour une UE.
 * Envoie également la carte de présence via le bot Teams.
 */
router.post('/session', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { ueId, ueName } = req.body;
    const user = req.user!;

    if (!ueId || !ueName) {
      res.status(400).json({ error: 'ueId et ueName sont requis' });
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

    // Créer la session en base de données
    const session = await prisma.session.create({
      data: {
        ueId,
        ueName,
        profId: user.id,
        startedAt: now,
        expiresAt,
      },
    });

    // Programmer l'expiration automatique de la session
    scheduleSessionExpiry(session.id, expiresAt, io);

    res.status(201).json({
      id: session.id,
      ueId: session.ueId,
      ueName: session.ueName,
      profId: session.profId,
      startedAt: session.startedAt,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error('Erreur lors de la création de la session:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création de la session' });
  }
});

/**
 * PATCH /api/attendance/session/:sessionId/close
 * Ferme une session de présence.
 */
router.patch('/session/:sessionId/close', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const user = req.user!;

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      res.status(404).json({ error: 'Session introuvable' });
      return;
    }

    if (session.profId !== user.id) {
      res.status(403).json({ error: 'Vous n\'êtes pas autorisé à fermer cette session' });
      return;
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { closedAt: new Date() },
    });

    // Notifier via Socket.io que la session est fermée
    io.to(`session:${sessionId}`).emit('session:closed');

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la fermeture de la session:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la fermeture' });
  }
});

/**
 * GET /api/attendance/session/:sessionId
 * Récupère la liste des présences pour une session.
 */
router.get('/session/:sessionId', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const attendances = await prisma.attendance.findMany({
      where: { sessionId },
      orderBy: { declaredAt: 'asc' },
    });

    res.json(attendances.map(a => ({
      id: a.id,
      sessionId: a.sessionId,
      studentId: a.studentId,
      studentName: a.studentName,
      studentEmail: a.studentEmail,
      declaredAt: a.declaredAt,
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des présences:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/attendance/declare
 * Enregistre la présence d'un étudiant.
 * Vérifie que la session est toujours active (< 5 minutes).
 */
router.post('/declare', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId, studentId, studentName, studentEmail } = req.body;

    if (!sessionId || !studentId || !studentName || !studentEmail) {
      res.status(400).json({ error: 'Tous les champs sont requis' });
      return;
    }

    // Vérifier que la session existe et est encore valide
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      res.status(404).json({ error: 'Session introuvable' });
      return;
    }

    const now = new Date();
    if (now > session.expiresAt || session.closedAt) {
      res.status(410).json({ error: 'La session de présence a expiré' });
      return;
    }

    // Vérifier si l'étudiant a déjà déclaré sa présence
    const existing = await prisma.attendance.findUnique({
      where: { sessionId_studentId: { sessionId, studentId } },
    });

    if (existing) {
      res.status(409).json({ error: 'Présence déjà enregistrée pour cette session' });
      return;
    }

    // Enregistrer la présence
    const attendance = await prisma.attendance.create({
      data: {
        sessionId,
        studentId,
        studentName,
        studentEmail,
        declaredAt: now,
      },
    });

    // Émettre l'événement en temps réel via Socket.io
    io.to(`session:${sessionId}`).emit('attendance:new', {
      id: attendance.id,
      studentId: attendance.studentId,
      studentName: attendance.studentName,
      studentEmail: attendance.studentEmail,
      declaredAt: attendance.declaredAt,
    });

    res.status(201).json({
      id: attendance.id,
      sessionId: attendance.sessionId,
      studentId: attendance.studentId,
      studentName: attendance.studentName,
      studentEmail: attendance.studentEmail,
      declaredAt: attendance.declaredAt,
    });
  } catch (error) {
    console.error('Erreur lors de la déclaration de présence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
