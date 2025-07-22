import { ModerationSystem } from './config/moderationSystem';
import { TwitchApi } from './config/twitchApi';
import { phrases } from './config/phrases'; // ← korrigierter Import
import { ChatClient } from '@twurple/chat';
import { RefreshingAuthProvider } from '@twurple/auth';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { TokenData } from './config/types';
import dotenv from 'dotenv';
dotenv.config();

// Twitch-Zugangsdaten laden
const clientId = process.env.TWITCH_CLIENT_ID!;
const clientSecret = process.env.TWITCH_CLIENT_SECRET!;
const tokenData: TokenData = JSON.parse(readFileSync('./tokens.json', 'utf8'));

const authProvider = new RefreshingAuthProvider(
  {
    clientId,
    clientSecret
  },
  tokenData
);

// ChatClient starten
const chatClient = new ChatClient({
  authProvider,
  channels: ['testaccountalexmoderat']
});

// Twitch API-Service
const twitchApi = new TwitchApi(authProvider);
const moderationSystem = new ModerationSystem(twitchApi);

// Prisma DB
const prisma = new PrismaClient();

chatClient.onMessage(async (channel, user, message, msg) => {
  const validation = moderationSystem.validateMessage(message);
  const result = await moderationSystem.executeModerationAction(validation, {
    channelId: msg.channelId,
    userId: msg.userInfo.userId,
    messageId: msg.id
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
