import { CommandDefinition, CommandContext } from '../types';
import humanizeDuration from 'humanize-duration';

const humanizer = humanizeDuration.humanizer({
    language: 'en',
    round: true,
    units: ['d', 'h', 'm', 's'],
});

const botStartedAt = new Date();

export const command: CommandDefinition = {
    name: 'ping',
    aliases: [],
    description: 'Checks bot latency and status info.',
    access: {},
    cooldown: {
        user: 5,
    },
    reply: true,
    execute: async (context: CommandContext) => {
        const latency = Date.now() - context.message.date.getTime();
        const uptime = humanizer(Date.now() - botStartedAt.getTime());

        return `Pong! Latency: ${latency}ms | Uptime: ${uptime} | Channels: ${context.chatClient.currentChannels.length}`;
    },
};
