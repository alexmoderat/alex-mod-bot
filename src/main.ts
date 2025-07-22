import { ModerationSystem } from './config/moderationSystem';
import { TwitchAPI } from './config/twitchAPI';  // Großes API hier
import { ChatClient } from '@twurple/chat';
import { RefreshingAuthProvider } from '@twurple/auth';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

// Twitch-Zugangsdaten
const clientId = process.env.TWITCH_CLIENT_ID!;
const clientSecret = process.env.TWITCH_CLIENT_SECRET!;
const tokenData = JSON.parse(readFileSync('./tokens.json', 'utf8'));

// AuthProvider
const authProvider = new RefreshingAuthProvider(
  { clientId, clientSecret },
  tokenData
);

const chatClient = new ChatClient({
  authProvider,
  channels: ['testaccountalexmoderat']
});

// TwitchAPI-Instanz mit config (z.B. aus env oder tokenData)
const twitchApi = new TwitchAPI({
  accessToken: tokenData.accessToken,
  clientId,
  botUserId: tokenData.userId,
});

const moderationSystem = new ModerationSystem(twitchApi);
const prisma = new PrismaClient();

chatClient.onMessage(async (channel, user, message, msg) => {
  const validation = moderationSystem.validateMessage(message);
  const result = await moderationSystem.executeModerationAction(validation, {
    channelId: msg.channelId,
    userId: msg.userInfo.userId,
    messageId: msg.id,
  });

  if (!result.success && result.error) {
    console.error(`[ERROR] ${result.error}`);
  } else if (result.action !== 'none') {
    console.log(`[INFO] Action: ${result.action}, Reason: ${result.reason}`);
  }
});

(async () => {
  await chatClient.connect();
  console.log(`[READY] Verbunden als ${tokenData.userName}`);
})();
