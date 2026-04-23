import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AttendanceSummary {
  sessionId: string;
  ueName: string;
  startedAt: Date;
  expiresAt: Date;
  closedAt: Date | null;
  totalAttendances: number;
  attendances: Array<{
    id: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    declaredAt: Date;
  }>;
}

/**
 * Récupère le résumé complet d'une session de présence.
 */
export const getSessionSummary = async (sessionId: string): Promise<AttendanceSummary | null> => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      attendances: {
        orderBy: { declaredAt: 'asc' },
      },
    },
  });

  if (!session) return null;

  return {
    sessionId: session.id,
    ueName: session.ueName,
    startedAt: session.startedAt,
    expiresAt: session.expiresAt,
    closedAt: session.closedAt,
    totalAttendances: session.attendances.length,
    attendances: session.attendances.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      studentName: a.studentName,
      studentEmail: a.studentEmail,
      declaredAt: a.declaredAt,
    })),
  };
};

/**
 * Vérifie si une session est encore valide (non expirée et non fermée).
 */
export const isSessionActive = async (sessionId: string): Promise<boolean> => {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return false;

  const now = new Date();
  return !session.closedAt && now <= session.expiresAt;
};

/**
 * Récupère l'historique des sessions d'un professeur.
 */
export const getProfessorSessions = async (
  profId: string,
  page = 1,
  limit = 20
): Promise<{ sessions: any[]; total: number }> => {
  const [sessions, total] = await Promise.all([
    prisma.session.findMany({
      where: { profId },
      include: { _count: { select: { attendances: true } } },
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.session.count({ where: { profId } }),
  ]);

  return { sessions, total };
};
