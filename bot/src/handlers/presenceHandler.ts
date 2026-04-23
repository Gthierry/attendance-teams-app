import { TurnContext, CardFactory, MessageFactory } from 'botbuilder';
import axios from 'axios';
import { createPresenceConfirmedCard, createPresenceExpiredCard } from '../cards/presenceCard';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

/**
 * Gestionnaire des actions de présence depuis les Adaptive Cards.
 */
export class PresenceHandler {
  /**
   * Traite le clic sur le bouton "Je suis présent" d'une Adaptive Card.
   */
  async handlePresenceAction(context: TurnContext): Promise<void> {
    try {
      const action = context.activity.value;

      if (!action || !action.sessionId) {
        await context.sendActivity('Données de session invalides.');
        return;
      }

      const { sessionId } = action;
      const user = context.activity.from;

      if (!user || !user.id) {
        await context.sendActivity('Impossible d\'identifier l\'utilisateur.');
        return;
      }

      // Appeler l'API backend pour enregistrer la présence
      try {
        await axios.post(`${BACKEND_URL}/api/attendance/declare`, {
          sessionId,
          studentId: user.id,
          studentName: user.name || 'Étudiant inconnu',
          studentEmail: user.aadObjectId || user.id,
        });

        // Répondre avec une carte de confirmation
        await context.sendActivity(
          MessageFactory.attachment(
            CardFactory.adaptiveCard(createPresenceConfirmedCard(user.name || 'Étudiant'))
          )
        );
      } catch (error: any) {
        if (error.response?.status === 410) {
          // Session expirée
          await context.sendActivity(
            MessageFactory.attachment(
              CardFactory.adaptiveCard(createPresenceExpiredCard())
            )
          );
        } else if (error.response?.status === 409) {
          // Présence déjà enregistrée
          await context.sendActivity('✅ Votre présence a déjà été enregistrée pour ce cours.');
        } else {
          await context.sendActivity('❌ Une erreur est survenue. Veuillez réessayer.');
          console.error('Erreur lors de la déclaration de présence:', error);
        }
      }
    } catch (error) {
      console.error('Erreur dans handlePresenceAction:', error);
      await context.sendActivity('❌ Une erreur inattendue est survenue.');
    }
  }
}
