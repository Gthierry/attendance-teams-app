import { Client } from '@microsoft/microsoft-graph-client';

interface UE {
  id: string;
  displayName: string;
}

interface GraphGroup {
  id: string;
  displayName: string;
}

/**
 * Crée un client Microsoft Graph authentifié avec le token fourni.
 */
const getGraphClient = (token: string): Client => {
  return Client.init({
    authProvider: (done) => {
      done(null, token);
    },
  });
};

/**
 * Vérifie si l'utilisateur est professeur en vérifiant ses groupes M365.
 * Un professeur est membre d'au moins un groupe dont le nom commence par "PROF-".
 */
export const checkIsTeacher = async (token: string): Promise<boolean> => {
  try {
    const client = getGraphClient(token);
    const response = await client.api('/me/memberOf').get();
    const groups: GraphGroup[] = response.value || [];
    return groups.some((g) => g.displayName?.startsWith('PROF-'));
  } catch (error) {
    console.error('Erreur lors de la vérification du rôle professeur:', error);
    return false;
  }
};

/**
 * Récupère la liste des UE (Unités d'Enseignement) dont le prof est membre.
 * Les UE sont des groupes M365 dont le nom commence par "UE-".
 */
export const getTeacherUEs = async (token: string): Promise<UE[]> => {
  try {
    const client = getGraphClient(token);
    const response = await client.api('/me/memberOf').get();
    const groups: GraphGroup[] = response.value || [];
    return groups
      .filter((g) => g.displayName?.startsWith('UE-'))
      .map((g) => ({ id: g.id, displayName: g.displayName }));
  } catch (error) {
    console.error('Erreur lors de la récupération des UE:', error);
    return [];
  }
};
