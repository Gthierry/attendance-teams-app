import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import { checkIsTeacher } from '../services/graphService';

const router = Router();

/**
 * POST /api/auth/validate
 * Valide le token SSO Teams et retourne les informations de l'utilisateur.
 * Vérifie également si l'utilisateur est un professeur via les groupes M365.
 */
router.post('/validate', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    // Vérifier le rôle professeur via Graph API
    const isTeacher = await checkIsTeacher(user.token);

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isTeacher,
    });
  } catch (error) {
    console.error('Erreur lors de la validation:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la validation' });
  }
});

export default router;
