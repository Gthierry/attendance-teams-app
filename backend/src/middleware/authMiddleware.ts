import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    displayName: string;
    token: string;
  };
}

const TENANT_ID = process.env.AZURE_TENANT_ID || '';
const CLIENT_ID = process.env.AZURE_CLIENT_ID || '';

// Client JWKS pour valider les tokens Azure AD
const jwksClient = jwksRsa({
  jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000, // 10 minutes
});

/**
 * Récupère la clé publique Azure AD pour valider le token JWT.
 */
const getSigningKey = (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void => {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err || !key) {
      callback(err || new Error('Clé de signature introuvable'));
      return;
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
};

/**
 * Middleware d'authentification.
 * Valide le token JWT Azure AD/Teams SSO.
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token d\'authentification manquant' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Vérifier le token JWT
    const decoded = await new Promise<jwt.JwtPayload>((resolve, reject) => {
      jwt.verify(
        token,
        getSigningKey,
        {
          audience: CLIENT_ID,
          issuer: [
            `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
            `https://sts.windows.net/${TENANT_ID}/`,
          ],
          algorithms: ['RS256'],
        },
        (err, payload) => {
          if (err) reject(err);
          else resolve(payload as jwt.JwtPayload);
        }
      );
    });

    req.user = {
      id: decoded.oid || decoded.sub || '',
      email: decoded.preferred_username || decoded.email || '',
      displayName: decoded.name || '',
      token,
    };

    next();
  } catch (error) {
    console.error('Erreur de validation du token:', error);
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};
