import { config } from '../config';
import { TwitchConfig } from './types';

export class TwitchAPI {
        private config: TwitchConfig;

    constructor(config: TwitchConfig) {
        this.config = config;
    }

    /**
     * Bannt einen User permanent
     */
    async banUser(channelId: string, userId: string, reason: string): Promise<boolean> {
        try {
            const response = await fetch(`https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${channelId}&moderator_id=${config.bot.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.twitch.accessToken}`,
                    'Client-Id': config.twitch.clientId,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: {
                        user_id: userId,
                        reason: reason
                    }
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Fehler beim Bannen:', error);
            return false;
        }
    }

    /**
     * Gibt einem User einen Timeout
     */
    async timeoutUser(channelId: string, userId: string, duration: number, reason: string): Promise<boolean> {
        try {
            const response = await fetch(`https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${channelId}&moderator_id=${config.bot.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.twitch.accessToken}`,
                    'Client-Id': config.twitch.clientId,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: {
                        user_id: userId,
                        duration: duration,
                        reason: reason
                    }
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Fehler beim Timeout:', error);
            return false;
        }
    }

    /**
     * Löscht eine spezifische Nachricht
     */
    async deleteMessage(messageId: string, channelId: string): Promise<boolean> {
        console.log(messageId, channelId);
        try {
            const response = await fetch(`https://api.twitch.tv/helix/moderation/chat?broadcaster_id=${channelId}&moderator_id=${config.bot.id}&message_id=${messageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${config.twitch.accessToken}`,
                    'Client-Id': config.twitch.clientId,
                }
            });

            console.log('Delete message response:', await response.json());

            return response.ok;
        } catch (error) {
            console.error('Fehler beim Löschen der Nachricht:', error);
            return false;
        }
    }
}
