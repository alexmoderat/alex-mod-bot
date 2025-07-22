import { ApiClient } from '@twurple/api';
import { ChatClient } from '@twurple/chat';
import { StaticAuthProvider } from '@twurple/auth';

import { CommandHandler } from './commandHandler';
import { config } from './config';
import prisma from './prismaClient';
import { setupGlobalErrorHandlers } from './utils/errorHandler';
import { ModerationSystem } from './config/moderationSystem'; // ✅ Korrigierter Import
import { ModerationData } from './config/types';

async function main() {
    console.log('Starting Twitch Bot...');

    try {
        await prisma.$connect();
        console.log('Successfully connected to the database.');
    } catch (error) {
        console.error('Failed to connect to the database:', error);
        process.exit(1);
    }

    const authProvider = new StaticAuthProvider(config.twitch.clientId, config.twitch.accessToken);

    const apiClient = new ApiClient({ authProvider });

    const chatClient = new ChatClient({
        authProvider,
        channels: [],
        requestMembershipEvents: true,
        botLevel: 'verified',
        authIntents: ['chat']
    });

    setupGlobalErrorHandlers(chatClient);

    const commandHandler = new CommandHandler(chatClient, apiClient);
    await commandHandler.initialize();

    // ➕ Twitch-API-Wrapper für Moderation
    const twitchApi = {
        banUser: async (channelId: string, userId: string, reason: string) => {
            try {
                await apiClient.moderation.banUser(channelId, config.twitch.botUserId, {
                    userId,
                    reason
                });
                return true;
            } catch {
                return false;
            }
        },
        deleteMessage: async (messageId: string, channelId: string) => {
            try {
                await apiClient.moderation.deleteChatMessages(channelId, config.twitch.botUserId, messageId);
                return true;
            } catch {
                return false;
            }
        },
        timeoutUser: async (channelId: string, userId: string, duration: number, reason: string) => {
            try {
                await apiClient.moderation.timeoutUser(channelId, config.twitch.botUserId, {
                    userId,
                    duration,
                    reason
                });
                return true;
            } catch {
                return false;
            }
        }
    };

    // ✅ Richtiger Klassenname + Konstruktor
    const moderationSystem = new ModerationSystem(twitchApi);
    console.log('✅ Moderation System initialized');

    chatClient.onMessage(async (channel, user, text, msg) => {
        console.log(`[${channel}] ${user}: ${text}`);
        const channelName = channel.startsWith('#') ? channel.substring(1) : channel;

        if (user.toLowerCase() !== config.twitch.botUsername.toLowerCase()) {
            try {
                const channelData = await prisma.channel.findUnique({
                    where: { name: channelName },
                    select: { id: true, name: true }
                });

                if (channelData) {
                    const moderationData: ModerationData = {
                        message: text,
                        channelId: msg.channelId!,
                        userId: msg.userInfo.userId,
                        username: user,
                        messageId: msg.id
                    };

                    const moderationResult = await moderationSystem.executeModerationAction(
                        await moderationSystem.validateMessage(text),
                        moderationData
                    );

                    if (moderationResult.success && moderationResult.action !== 'none') {
                        console.log(`🔨 Moderation Action executed: ${moderationResult.action.toUpperCase()}`);
                        console.log(`   User: ${user} | Reason: ${moderationResult.reason}`);
                        if (moderationResult.duration) {
                            console.log(`   Duration: ${moderationResult.duration} seconds`);
                        }
                    }
                }
            } catch (moderationError) {
                console.error('Moderation system error:', moderationError);
            }
        }

        await commandHandler.handleMessage(channelName, user, text, msg);
    });

    chatClient.onJoin(async (channel, user) => {
        const channelName = channel.startsWith('#') ? channel.substring(1) : channel;
        if (user.toLowerCase() === config.twitch.botUsername.toLowerCase()) {
            console.log(`Successfully joined channel: #${channelName}`);
            console.log(`   Moderation status: ENABLED (global)`);
        }
    });

    chatClient.onPart((channel, user) => {
        const channelName = channel.startsWith('#') ? channel.substring(1) : channel;
        if (user.toLowerCase() === config.twitch.botUsername.toLowerCase()) {
            console.log(`Left channel: #${channelName}`);
        }
    });

    try {
        console.log('Connecting to Twitch chat...');
        chatClient.connect();
        console.log('Successfully connected to Twitch chat.');
    } catch (error) {
        console.error('Failed to connect to Twitch chat:', error);
        process.exit(1);
    }

    const gracefulShutdown = async (signal: string) => {
        console.log(`Received ${signal}. Shutting down gracefully...`);
        if (chatClient.isConnected) {
            chatClient.quit();
            console.log('Chat client disconnected.');
        }
        try {
            await prisma.$disconnect();
            console.log('Database connection closed.');
        } catch (error) {
            console.error('Error closing database connection:', error);
        }
        process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    const channelsFromDB = await prisma.channel.findMany({ 
        select: { name: true } 
    });

    for (const channelData of channelsFromDB) {
        if (!chatClient.currentChannels.includes(`#${channelData.name}`)) {
            console.log(`Attempting to join persisted channel: #${channelData.name}`);
            try {
                await chatClient.join(channelData.name);
            } catch (error) {
                console.error(`Failed to join #${channelData.name} from DB:`, error);
            }
        }
    }
}

main().catch(error => {
    console.error("Unhandled error in main function:", error);
    process.exit(1);
});
