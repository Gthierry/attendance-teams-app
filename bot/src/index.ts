import express from 'express';
import { BotFrameworkAdapter } from 'botbuilder';
import dotenv from 'dotenv';
import { AttendanceBot } from './bot';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.BOT_PORT || 3978;

// Créer l'adaptateur Bot Framework
const adapter = new BotFrameworkAdapter({
  appId: process.env.BOT_APP_ID || process.env.BOT_ID || '',
  appPassword: process.env.BOT_PASSWORD || '',
});

// Gestionnaire d'erreurs global du bot
adapter.onTurnError = async (context, error) => {
  console.error(`Erreur du bot: ${error}`);
  await context.sendActivity('Une erreur est survenue. Veuillez réessayer.');
};

const bot = new AttendanceBot();

// Point d'entrée des messages du bot
app.post('/api/messages', (req, res) => {
  adapter.processActivity(req, res, async (context) => {
    await bot.run(context);
  });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🤖 Bot démarré sur le port ${PORT}`);
  console.log(`📨 Endpoint: /api/messages`);
});

export default app;
