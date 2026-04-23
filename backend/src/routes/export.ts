import { Router, Response } from 'express';
import ExcelJS from 'exceljs';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/export/:sessionId
 * Exporte la liste des présences d'une session en fichier Excel.
 */
router.get('/:sessionId', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const user = req.user!;

    // Récupérer la session
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { attendances: { orderBy: { declaredAt: 'asc' } } },
    });

    if (!session) {
      res.status(404).json({ error: 'Session introuvable' });
      return;
    }

    if (session.profId !== user.id) {
      res.status(403).json({ error: 'Accès non autorisé à cette session' });
      return;
    }

    // Créer le workbook Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Attendance Teams App';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Présences');

    // En-têtes du tableau
    worksheet.columns = [
      { header: 'Nom complet', key: 'studentName', width: 30 },
      { header: 'Email', key: 'studentEmail', width: 35 },
      { header: 'Heure de déclaration', key: 'declaredAt', width: 25 },
      { header: 'Statut', key: 'status', width: 15 },
    ];

    // Style de l'en-tête
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Ajouter les données de présences
    session.attendances.forEach((attendance) => {
      worksheet.addRow({
        studentName: attendance.studentName,
        studentEmail: attendance.studentEmail,
        declaredAt: new Date(attendance.declaredAt).toLocaleString('fr-FR'),
        status: 'Présent',
      });
    });

    // Ajouter les métadonnées en bas
    worksheet.addRow([]);
    worksheet.addRow([`UE: ${session.ueName}`]);
    worksheet.addRow([`Date: ${new Date(session.startedAt).toLocaleDateString('fr-FR')}`]);
    worksheet.addRow([`Total présents: ${session.attendances.length}`]);

    // Générer le nom du fichier
    const date = new Date(session.startedAt).toISOString().slice(0, 10);
    const filename = `presences_${session.ueName.replace(/\s+/g, '_')}_${date}.xlsx`;

    // Envoyer le fichier
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Erreur lors de l\'export:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'export' });
  }
});

export default router;
