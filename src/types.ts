import { ChatClient, ChatMessage } from '@twurple/chat';
import { ApiClient } from '@twurple/api';
import { PrismaClient } from '@prisma/client';

export interface CommandContext {
    chatClient: ChatClient;
    apiClient: ApiClient;
    prisma: PrismaClient;
    channel: string;
    channelId: string;
    user: string; 
    userId: string; 
    displayName: string; 
    message: ChatMessage; 
    args: string[];
    isMod: boolean;
    isBroadcaster: boolean;
}

export interface CommandAccess {
    global?: number;
    channel?: number;
    broadcaster?: boolean;
}

export interface CommandCooldown {
    global?: number;
    channel?: number;
    user?: number;
}

export interface CommandDefinition {
    name: string;
    aliases?: string[];
    description: string;
    access: CommandAccess;
    cooldown: CommandCooldown;
    reply?: boolean;
    showTyping?: boolean;
    execute: (context: CommandContext) => Promise<string | void | null>;
}