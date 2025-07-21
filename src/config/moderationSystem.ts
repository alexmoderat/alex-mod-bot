import { ValidationResult, ModerationData, ModerationResult } from './types';

export class TwitchModerationSystem {
  private twitchApi: any;

  constructor(twitchApi: any) {
    this.twitchApi = twitchApi;
  }

  // Beispiel-Validierung: Hier musst du deine Regeln prüfen und ein ValidationResult zurückgeben.
  private validateMessage(moderationData: ModerationData): ValidationResult {
    // TODO: Deine Validierungslogik hier
    // Beispiel: Keine Regelverstoß:
    return { result: false };
  }

  public async moderateMessage(moderationData: ModerationData): Promise<ModerationResult> {
    const validation = this.validateMessage(moderationData);
    return await this.executeModerationAction(validation, moderationData);
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
