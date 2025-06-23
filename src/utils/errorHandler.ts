import { ChatClient } from '@twurple/chat';

export class CommandError extends Error {
    public readonly isSilent: boolean;

    constructor(message: string, silent: boolean = false) {
        super(message);
        this.name = 'CommandError';
        this.isSilent = silent;
        Object.setPrototypeOf(this, CommandError.prototype);
    }
}

export async function handleCommandError(
    error: any,
    channel: string,
    chatClient: ChatClient,
    commandName?: string,
    msgId?: string
): Promise<void> {

    if (error instanceof CommandError) {
        if (!error.isSilent) {
            await chatClient.say(channel, `${error.message}`, { replyTo: msgId ?? "" });
        }
        console.warn(`CommandError in ${channel} for command ${commandName || 'N/A'}: ${error.message}`);
    } else if (error instanceof Error) {
        console.error(`Unhandled error in ${channel} for command ${commandName || 'N/A'}:`, error);
        await chatClient.say(channel, `An unexpected error occurred. Please try again later.`, { replyTo: msgId ?? "" });
    } else {
        console.error(`Unknown error in ${channel} for command ${commandName || 'N/A'}:`, error);
        await chatClient.say(channel, `An unknown error occurred.`, { replyTo: msgId ?? "" });
    }
}

export function setupGlobalErrorHandlers(chatClient: ChatClient): void {
    process.on('uncaughtException', (error: Error) => {
        console.error('UNCAUGHT EXCEPTION:', error);
    });

    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
        console.error('UNHANDLED REJECTION:', reason);
    });

    chatClient.onDisconnect((manually, reason) => {
        console.warn(`ChatClient disconnected ${manually ? 'manually' : 'unexpectedly'}. Reason: ${reason}`);
        if (!manually) {
            console.log('Attempting to reconnect...');
        }
    });

    chatClient.onAuthenticationFailure((text, retryCount) => {
        console.error(`Authentication failed: ${text}. Retry count: ${retryCount}`);
    });
}