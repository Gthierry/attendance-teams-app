import {
  ActivityHandler,
  TurnContext,
  CardFactory,
  MessageFactory,
} from 'botbuilder';
import { createPresenceCard } from './cards/presenceCard';
import { PresenceHandler } from './handlers/presenceHandler';

/**
 * Bot principal de gestion des présences.
 * Gère l'envoi des Adaptive Cards et les réponses des étudiants.
 */
export class AttendanceBot extends ActivityHandler {
  private presenceHandler: PresenceHandler;

  constructor() {
    super();
    this.presenceHandler = new PresenceHandler();

    // Gérer les messages entrants
    this.onMessage(async (context: TurnContext, next) => {
      const text = context.activity.text?.trim().toLowerCase();

      // Commande pour envoyer une carte de présence (depuis le système)
      if (text?.startsWith('!presence')) {
        const parts = text.split(' ');
        const sessionId = parts[1];
        const ueName = parts.slice(2).join(' ');

        if (sessionId && ueName) {
          const card = createPresenceCard({
            sessionId,
            ueName,
            profName: context.activity.from?.name || 'Professeur',
            startTime: new Date().toLocaleTimeString('fr-FR'),
            expiresIn: '5 minutes',
          });

          await context.sendActivity(
            MessageFactory.attachment(CardFactory.adaptiveCard(card))
          );
        }
      }

      await next();
    });

    // Gérer les actions des Adaptive Cards (clic sur "Je suis présent")
    this.onEvent(async (context: TurnContext, next) => {
      if (context.activity.name === 'adaptiveCard/action') {
        await this.presenceHandler.handlePresenceAction(context);
      }
      await next();
    });

    // Message de bienvenue lors de l'installation
    this.onMembersAdded(async (context: TurnContext, next) => {
      const membersAdded = context.activity.membersAdded || [];
      for (const member of membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity(
            '👋 Bonjour ! Je suis le bot de gestion des présences. ' +
            'Un professeur peut lancer une session de présence depuis l\'application Teams.'
          );
        }
      }
      await next();
    });
  }
}
