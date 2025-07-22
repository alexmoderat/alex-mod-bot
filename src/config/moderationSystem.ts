import { ValidationResult, ModerationData, ModerationResult } from '../types';
import { TwitchApiService } from '../services/twitchApi';

// Beispiel: phrases importieren oder im Konstruktor übergeben (hier importiert)
import { phrases } from '../config/phrases';

export class ModerationSystem {
    constructor(private twitchApi: TwitchApiService) {}

    private async executeModerationAction(
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

    // Neue öffentliche Methode für den Aufruf aus main.ts
    public async moderateMessage(moderationData: ModerationData): Promise<ModerationResult> {
        // Beispiel-Regel: Prüfe, ob irgendeine Phrase aus `phrases` in der Nachricht enthalten ist
        const foundPhrase = phrases.find(phrase => moderationData.message.includes(phrase));

        const validation: ValidationResult = {
            result: !!foundPhrase,
            action: foundPhrase ? 600 : undefined,  // z.B. 600 Sekunden Timeout
            reason: foundPhrase ? `Verstoß gegen Phrase: ${foundPhrase}` : undefined
        };

        return this.executeModerationAction(validation, moderationData);
    }
}
