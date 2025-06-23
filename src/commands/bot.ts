import { CommandDefinition, CommandContext } from '../types';

import prisma from '../prismaClient';
import { CommandError } from '../utils/errorHandler';

export const command: CommandDefinition = {
    name: 'bot',
    aliases: [],
    description: 'Bot administration (join/leave/channels)',
    access: {
        global: 1,
    },
    cooldown: {},
    reply: true,
    execute: async (context: CommandContext) => {
        const [action, channelNameArg] = context.args;

        if (!action) {
            return `Usage: ${context.message.text[0]}bot <join|leave|channels>`;
        }

        const channelName = channelNameArg?.toLowerCase().replace(/^#/, '');

        switch (action.toLowerCase()) {
            case 'join':
                if (!channelName) {
                    throw new CommandError('Please specify a channel');
                }

                try {
                    const twitchChannel = await context.apiClient.users.getUserByName(channelName);
                    if (!twitchChannel) {
                        throw new CommandError(`Twitch channel "${channelName}" not found.`);
                    }

                    if (context.chatClient.currentChannels.includes(`#${channelName}`)) {
                        context.chatClient.part(channelName);
                    }

                    context.chatClient.join(channelName);

                    await prisma.channel.upsert({
                        where: { name: channelName },
                        create: { id: twitchChannel.id, name: channelName },
                        update: {},
                    });

                    await context.chatClient.say(twitchChannel.name, `@${twitchChannel.displayName} FeelsOkayMan 👋🏻`)

                    return `Joined #${channelName}`;
                } catch (e: any) {
                    console.error(`Failed to join #${channelName}:`, e);
                    throw new CommandError(`Could not join #${channelName}. ${e.message || ''}`);
                }

            case 'leave':
                if (!channelName) {
                    throw new CommandError('Please specify a channel name to leave.');
                }
                try {
                    context.chatClient.part(channelName);

                    const dbChannel = await prisma.channel.findUnique({ where: { name: channelName } });
                    if (dbChannel) {
                        await prisma.channel.delete({ where: { name: channelName } });
                    }
                    return `Left #${channelName}`;
                } catch (e: any) {
                    console.error(`Failed to part #${channelName}:`, e);
                    throw new CommandError(`Could not leave #${channelName}. ${e.message || ''}`);
                }

            case 'channels':
                const joinedChannels = context.chatClient.currentChannels;
                if (joinedChannels.length === 0) {
                    return 'Not currently in any channels.';
                }
                return `Currently in: ${joinedChannels.join(', ')}`;

            default:
                return `Unknown bot action: ${action}. Available: join, leave, list.`;
        }
    },
};