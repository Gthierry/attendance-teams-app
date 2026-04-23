import { useState, useEffect } from 'react';
import * as microsoftTeams from '@microsoft/teams-js';

interface UserInfo {
  id: string;
  displayName: string;
  email: string;
  token: string;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  isTeacher: boolean;
  error: string | null;
  userInfo: UserInfo | null;
}

const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_TENANT_ID}`,
    redirectUri: window.location.origin,
  },
};

/**
 * Hook d'authentification SSO Teams + MSAL.
 * Vérifie si l'utilisateur est un professeur via l'API backend.
 */
export const useAuth = (): AuthState => {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    isTeacher: false,
    error: null,
    userInfo: null,
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialiser le SDK Teams
        await microsoftTeams.app.initialize();
        const context = await microsoftTeams.app.getContext();

        // Obtenir un token SSO via Teams
        const token = await new Promise<string>((resolve, reject) => {
          microsoftTeams.authentication.getAuthToken({
            successCallback: (t) => resolve(t),
            failureCallback: (err) => reject(new Error(err)),
          } as any);
        });

        // Valider le token et obtenir les informations utilisateur via le backend
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/auth/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Échec de la validation du token');
        }

        const userData = await response.json();

        setState({
          isLoading: false,
          isAuthenticated: true,
          isTeacher: userData.isTeacher,
          error: null,
          userInfo: {
            id: userData.id,
            displayName: userData.displayName,
            email: userData.email,
            token,
          },
        });
      } catch (err) {
        console.error('Erreur d\'authentification:', err);
        setState({
          isLoading: false,
          isAuthenticated: false,
          isTeacher: false,
          error: err instanceof Error ? err.message : 'Erreur d\'authentification inconnue',
          userInfo: null,
        });
      }
    };

    initialize();
  }, []);

  return state;
};
