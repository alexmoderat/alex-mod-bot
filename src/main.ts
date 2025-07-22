import { ValidationResult, ModerationData, ModerationResult } from '../types';
import { phrases } from './phrases';

interface TwitchApiService {
    banUser: (channelId: string, userId: string, reason: string) => Promise<boolean>;
    deleteMessage: (messageId: string, channelId: string) => Promise<boolean>;
    timeoutUser: (channelId: string, userId: string, duration: number, reason: string) => Promise<boolean>;
}

export class ModerationSystem {
    constructor(private twitchApi: TwitchApiService) {}

    public validateMessage(message: string): ValidationResult {
        const lowered = message.toLowerCase();

        for (const phrase of phrases.ban) {
            if (lowered.includes(phrase.toLowerCase())) {
                return { result: true, action: 0, reason: `Banned phrase: ${phrase}` };
            }
        }

        for (const phrase of phrases.timeout) {
            if (lowered.includes(phrase.toLowerCase())) {
                return { result: true, action: 600, reason: `Timeout phrase: ${phrase}` };
            }
        }

        for (const phrase of phrases.delete) {
            if (lowered.includes(phrase.toLowerCase())) {
                return { result: true, action: 1, reason: `Deleted phrase: ${phrase}` };
            }
        }

        return { result: false, action: undefined };
    }

    public async executeModerationAction(
        validation: ValidationResult, 
        moderationData: ModerationData
    ): Promise<ModerationResult> {
        if (!validation.result || validation.action === undefined) {
            return {
                success: true,
                action: 'none',
                reason: 'Keine Regelverstoß erkannt - automated by Alexmoderat'
            };
        }

        const { action } = validation;
        const { channelId, userId, messageId } = moderationData;

        const reason = (validation.reason ?? 'Regelverstoß') + ' - automated by Alexmoderat';

        try {
            if (action === 0) {
                const success = await this.twitchApi.banUser(channelId, userId, reason);
                return {
                    success,
                    action: 'ban',
                    reason,
                    error: success ? undefined : 'Ban fehlgeschlagen'
                };
            } else if (action === 1) {
                if (!messageId) {
                    return {
                        success: false,
                        action: 'delete',
                        reason,
                        error: 'Message ID fehlt für das Löschen'
                    };
                }

                const success = await this.twitchApi.deleteMessage(messageId, channelId);
                return {
                    success,
                    action: 'delete',
                    reason,
                    error: success ? undefined : 'Löschen fehlgeschlagen'
                };
            } else if (action > 1) {
                const success = await this.twitchApi.timeoutUser(channelId, userId, action, reason);
                return {
                    success,
                    action: 'timeout',
                    duration: action,
                    reason,
                    error: success ? undefined : 'Timeout fehlgeschlagen'
                };
            }

            return {
                success: false,
                action: 'none',
                reason: 'Unbekannte Action - automated by Alexmoderat',
                error: `Unbekannte Action: ${action}`
            };
        } catch (error) {
            return {
                success: false,
                action: action === 0 ? 'ban' : action === 1 ? 'delete' : 'timeout',
                reason,
                error: `API Fehler: ${error}`
            };
        }
    }
}
