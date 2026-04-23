/**
 * Interface des données pour la carte de présence.
 */
export interface PresenceCardData {
  sessionId: string;
  ueName: string;
  profName: string;
  startTime: string;
  expiresIn: string;
}

/**
 * Crée une Adaptive Card de confirmation de présence.
 * Cette carte est envoyée dans le canal Teams de l'UE.
 * Les étudiants ont 5 minutes pour cliquer sur le bouton "Je suis présent".
 */
export const createPresenceCard = (data: PresenceCardData): object => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  const presenceUrl = `${frontendUrl}?sessionId=${data.sessionId}`;

  return {
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'Container',
        style: 'emphasis',
        items: [
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: 'auto',
                items: [
                  {
                    type: 'Image',
                    url: 'https://adaptivecards.io/content/cats/1.png',
                    size: 'Small',
                    style: 'Person',
                  },
                ],
              },
              {
                type: 'Column',
                width: 'stretch',
                items: [
                  {
                    type: 'TextBlock',
                    text: '📋 Feuille de présence',
                    weight: 'Bolder',
                    size: 'Large',
                    color: 'Accent',
                  },
                  {
                    type: 'TextBlock',
                    text: data.ueName,
                    weight: 'Bolder',
                    size: 'Medium',
                    spacing: 'None',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'FactSet',
        facts: [
          {
            title: '👨‍🏫 Professeur',
            value: data.profName,
          },
          {
            title: '🕐 Début du cours',
            value: data.startTime,
          },
          {
            title: '⏱️ Durée de validation',
            value: data.expiresIn,
          },
        ],
      },
      {
        type: 'TextBlock',
        text: '⚠️ **Attention** : Vous avez **5 minutes** pour confirmer votre présence.',
        wrap: true,
        color: 'Warning',
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: '✅ Je suis présent',
        url: presenceUrl,
        style: 'positive',
      },
    ],
  };
};

/**
 * Crée une carte de confirmation après déclaration de présence.
 */
export const createPresenceConfirmedCard = (studentName: string): object => {
  return {
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        text: `✅ Présence confirmée pour ${studentName}`,
        weight: 'Bolder',
        size: 'Medium',
        color: 'Good',
      },
      {
        type: 'TextBlock',
        text: `Enregistré à ${new Date().toLocaleTimeString('fr-FR')}`,
        color: 'Good',
      },
    ],
  };
};

/**
 * Crée une carte d'erreur si la session a expiré.
 */
export const createPresenceExpiredCard = (): object => {
  return {
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        text: '⏰ Session expirée',
        weight: 'Bolder',
        size: 'Medium',
        color: 'Warning',
      },
      {
        type: 'TextBlock',
        text: 'La fenêtre de 5 minutes est passée. Votre présence n\'a pas pu être enregistrée.',
        wrap: true,
        color: 'Warning',
      },
    ],
  };
};
