import fs from 'fs/promises';
import path from 'path';
import { ChatClient, ChatMessage } from '@twurple/chat';
import { ApiClient } from '@twurple/api';
import { CommandDefinition, CommandContext, CommandAccess } from './types'; 
import prisma from './prismaClient';
import { config } from './config';
import { handleCommandError } from './utils/errorHandler';

const cooldowns = {
    global: new Map<string, number>(),
    channel: new Map<string, Map<string, number>>(),
    user: new Map<string, Map<string, number>>()
};

export class CommandHandler {
    private commands = new Map<string, CommandDefinition>();
    private aliases = new Map<string, string>();
    private chatClient: ChatClient;
    private apiClient: ApiClient;
    private commandsDir: string;

    constructor(
        chatClient: ChatClient,
        apiClient: ApiClient,
        commandsDir: string = path.join(__dirname, 'commands')
    ) {
        this.chatClient = chatClient;
        this.apiClient = apiClient;
        this.commandsDir = commandsDir;
        
    }

    async initialize(): Promise<void> {
        await this.loadCommands();
        console.log('CommandHandler initialized and commands loaded.');
    }

    async loadCommands(): Promise<void> {
        try {
            const files = await fs.readdir(this.commandsDir);
            for (const file of files) {
                if (file.endsWith('.ts') || file.endsWith('.js')) {
                    const commandPath = path.join(this.commandsDir, file);
                    if (process.env.NODE_ENV === 'development') {
                        delete require.cache[require.resolve(commandPath)];
                    }
                    const { command } = await import(commandPath);
                    if (command && command.name && command.execute) {
                        this.registerCommand(command as CommandDefinition);
                    } else {
                        console.warn(`Could not load command from ${file}: missing name or execute function.`);
                    }
                }
            }
            console.log(`Loaded ${this.commands.size} commands.`);
        } catch (error) {
            console.error('Error loading commands:', error);
        }
    }

    private registerCommand(command: CommandDefinition): void {
        if (this.commands.has(command.name)) {
            console.warn(`Command ${command.name} is already registered. Overwriting.`);
        }

        this.commands.set(command.name, command);
        if (command.aliases) {
            for (const alias of command.aliases) {
                if (this.aliases.has(alias)) {
                    console.warn(`Alias ${alias} for command ${command.name} is already registered for another command. Overwriting.`);
                }
                this.aliases.set(alias, command.name);
            }
        }
    }

    async handleMessage(channel: string, user: string, text: string, msg: ChatMessage): Promise<void> {
        if (!text.startsWith(config.bot.prefix)) {
            return;
        }

        const [commandNameArg, ...args] = text.slice(config.bot.prefix.length).trim().split(/\s+/);
        const commandName = commandNameArg.toLowerCase();

        const actualCommandName = this.aliases.get(commandName) || commandName;
        const command = this.commands.get(actualCommandName);

        if (!command) return;

        try {
            let userGlobalAccess = 0;

            const dbUser = await prisma.user.findUnique({
                where: { id: msg.userInfo.userId },
                select: { permission: true }
            });

            if (dbUser) userGlobalAccess = dbUser.permission;


            if (!this.hasAccess(command.access, userGlobalAccess, msg.userInfo.isMod, msg.userInfo.isVip, msg.userInfo.isBroadcaster)) {
                if (command.reply) {
                    await this.chatClient.say(channel, `@${msg.userInfo.displayName}, du hast keine Berechtigung für diesen Befehl.`, { replyTo: msg });
                }
                return;
            }

            if (this.isOnCooldown(command, msg.userInfo.userId, channel)) {
                return;
            }

            const context: CommandContext = {
                chatClient: this.chatClient,
                apiClient: this.apiClient,
                prisma,
                channel: channel,
                channelId: msg.channelId!,
                user: msg.userInfo.userName,
                userId: msg.userInfo.userId,
                displayName: msg.userInfo.displayName,
                message: msg,
                args,
                isMod: msg.userInfo.isMod,
                isBroadcaster: msg.userInfo.isBroadcaster,
            };

            if (command.showTyping) {
                this.chatClient.action(channel, "Thinking...").catch(console.error);
            }

            const result = await command.execute(context);
            this.setCooldown(command, msg.userInfo.userId, channel);

            if (command.reply && result) {
		console.log(1)
                await this.chatClient.say(channel, String(result), { replyTo: msg });
            }

        } catch (error) {
            await handleCommandError(error, channel, this.chatClient, command.name, msg.id);
        }
    }

    private hasAccess(
        access: CommandAccess,
        userGlobalAccess: number,
        isMod: boolean,
        isVip: boolean,
        isBroadcaster: boolean
    ): boolean {
        if (isBroadcaster) return true;

        if (access.global !== undefined && userGlobalAccess < access.global) return false;

        if (access.broadcaster && !isBroadcaster) return false;

        if (access.channel !== undefined) {
            switch (access.channel) { // (oder höhere globale Perm)
                case 3: // Nur Broadcaster
                    if (!isBroadcaster) return false;
                    break;
                case 2: // Broadcaster, Mod
                    if (!isBroadcaster && !isMod) return false;
                    break;
                case 1: // Broadcaster, Mod, VIP
                    if (!isBroadcaster && !isMod && !isVip) return false;
                    break;
                case 0: // Jeder
                    break;
                default:
                    return false; // Ungültiger Wert
            }
        }

        return true;
    }

    private isOnCooldown(command: CommandDefinition, userId: string, channel: string): boolean {
        const now = Date.now();
        const { global, channel: channelCd, user: userCd } = command.cooldown || {};

        if (global) {
            const globalCooldown = cooldowns.global.get(command.name);
            if (globalCooldown && now < globalCooldown) return true;
        }
        if (channelCd) {
            const channelCommandCooldowns = cooldowns.channel.get(command.name);
            if (channelCommandCooldowns) {
                const channelTimestamp = channelCommandCooldowns.get(channel);
                if (channelTimestamp && now < channelTimestamp) return true;
            }
        }
        if (userCd) {
            const userCommandCooldowns = cooldowns.user.get(command.name);
            if (userCommandCooldowns) {
                const userTimestamp = userCommandCooldowns.get(userId);
                if (userTimestamp && now < userTimestamp) return true;
            }
        }
        return false;
    }

    private setCooldown(command: CommandDefinition, userId: string, channel: string): void {
        const now = Date.now();
        const { global, channel: channelCd, user: userCd } = command.cooldown || {};

        if (global && global > 0) {
            cooldowns.global.set(command.name, now + global * 1000);
        }
        if (channelCd && channelCd > 0) {
            if (!cooldowns.channel.has(command.name)) {
                cooldowns.channel.set(command.name, new Map());
            }
            cooldowns.channel.get(command.name)!.set(channel, now + channelCd * 1000);
        }
        if (userCd && userCd > 0) {
            if (!cooldowns.user.has(command.name)) {
                cooldowns.user.set(command.name, new Map());
            }
            cooldowns.user.get(command.name)!.set(userId, now + userCd * 1000);
        }
    }

    public clearCooldown(commandName: string, userId?: string, channel?: string): void {
        cooldowns.global.delete(commandName);
        if (channel) cooldowns.channel.get(commandName)?.delete(channel);
        if (userId) cooldowns.user.get(commandName)?.delete(userId);
        console.log(`Cooldowns cleared for ${commandName} (User: ${userId}, Channel: ${channel})`);
    }
}
