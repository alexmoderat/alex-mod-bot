import { phrase } from "./phrases";
import { TwitchAPI } from "./twitchApi";
import { ModerationData, ModerationResult, TwitchConfig, ValidationResult } from "./types";

export class TwitchModerationSystem {
    private phrases: phrase[];
    private twitchApi: TwitchAPI;

    constructor(phrases: phrase[], twitchConfig: TwitchConfig) {
        this.phrases = phrases;
        this.twitchApi = new TwitchAPI(twitchConfig);
    }

    private validateMessage(message: string): ValidationResult {
        for (const rule of this.phrases) {
            try {
                const regex = new RegExp(rule.word, 'i');
                
                if (regex.test(message)) {
                    return {
                        result: true,
                        action: rule.action,
                        reason: rule.reason,
                        matchedPattern: rule.word
                    };
                }
            } catch (error) {
                console.warn(`Ungültige Regex in Regel: ${rule.word}`, error);
                continue;
            }
        }

        return {
            result: false
        };
    }

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

        let reason = validation.reason = " - automated by Alexmoderat";
        
        try {
            if (action === 0) {
                const success = await this.twitchApi.banUser(channelId, userId, reason || 'Regelverstoß');
                return {
                    success,
                    action: 'ban',
                    reason: reason || 'Regelverstoß - automated by Alexmoderat',
                    error: success ? undefined : 'Ban fehlgeschlagen'
                };
            }
            
            else if (action === 1) {
                if (!messageId) {
                    return {
                        success: false,
                        action: 'delete',
                        reason: reason || 'Nachricht löschen - automated by Alexmoderat',
                        error: 'Message ID fehlt für das Löschen'
                    };
                }
                
                const success = await this.twitchApi.deleteMessage(messageId, channelId);
                return {
                    success,
                    action: 'delete',
                    reason: reason || 'Nachricht löschen - automated by Alexmoderat',
                    error: success ? undefined : 'Löschen fehlgeschlagen'
                };
            }
            
            else if (action > 1) {
                const success = await this.twitchApi.timeoutUser(channelId, userId, action, reason || 'Timeout');
                return {
                    success,
                    action: 'timeout',
                    duration: action,
                    reason: reason || 'Timeout - automated by Alexmoderat',
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
                reason: reason || 'Fehler - automated by Alexmoderat',
                error: `API Fehler: ${error}`
            };
        }
    }

    async moderateMessage(moderationData: ModerationData): Promise<ModerationResult> {
        const validation = this.validateMessage(moderationData.message);
        
        if (!validation.result) {
            console.log('✅ Nachricht ist sauber');
            return {
                success: true,
                action: 'none',
                reason: 'Keine Regelverstoß erkannt - automated by Alexmoderat'
            };
        }

        console.log(`⚠️ Regelverstoß erkannt: ${validation.reason} (Action: ${validation.action})`);
        
        const result = await this.executeModerationAction(validation, moderationData);
        
        if (result.success) {
            console.log(`✅ Moderation erfolgreich: ${result.action.toUpperCase()}`);
            if (result.duration) {
                console.log(`⏱️ Timeout Dauer: ${result.duration} Sekunden`);
            }
        } else {
            console.log(`❌ Moderation fehlgeschlagen: ${result.error}`);
        }

        return result;
    }

    getPhrases(): phrase[] {
        return [...this.phrases];
    }
}
