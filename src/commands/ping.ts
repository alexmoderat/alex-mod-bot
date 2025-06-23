import { CommandDefinition, CommandContext } from '../types';

export const command: CommandDefinition = {
    name: 'ping',
    aliases: [],
    description: 'Checks bot latency.',
    access: {},
    cooldown: {
        user: 5,
    },
    reply: true,
    execute: async (context: CommandContext) => {
        return `Pong! Latency: ${Date.now() - context.message.date.getTime()}ms`;
    },
};