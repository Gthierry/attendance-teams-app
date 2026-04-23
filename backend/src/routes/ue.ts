import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import { getTeacherUEs } from '../services/graphService';

const router = Router();

/**
 * GET /api/ue
 * Récupère la liste des UE (groupes M365 avec préfixe "UE-") du professeur connecté.
 */
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const ues = await getTeacherUEs(user.token);
    res.json(ues);
  } catch (error) {
    console.error('Erreur lors de la récupération des UE:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des UE' });
  }
});

export default router;
