export interface ValidationResult {
    result: boolean;
    action?: number;
    reason?: string;
    matchedPattern?: string;
}

export interface ModerationData {
    message: string;
    channelId: string;
    userId: string;
    username: string;
    messageId?: string;
}

export interface TwitchConfig {
    clientId: string;
    accessToken: string;
    moderatorUserId: string;
}

export interface ModerationResult {
    success: boolean;
    action: 'ban' | 'delete' | 'timeout' | 'none';
    duration?: number;
    reason: string;
    error?: string;
}
