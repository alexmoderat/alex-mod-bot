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
      console.log(`BanUser called with broadcaster_id=${channelId}, moderator_id=${this.config.botUserId}, user_id=${userId}`);

      const response = await fetch(
        `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${channelId}&moderator_id=${this.config.botUserId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Client-Id': this.config.clientId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: userId,
            reason: reason
          })
        }
      );

      const json = await response.json();
      console.log('Ban Response:', response.status, json);

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
      console.log(`TimeoutUser called with broadcaster_id=${channelId}, moderator_id=${this.config.botUserId}, user_id=${userId}, duration=${duration}`);

      const response = await fetch(
        `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${channelId}&moderator_id=${this.config.botUserId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Client-Id': this.config.clientId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: userId,
            duration: duration,
            reason: reason
          })
        }
      );

      const json = await response.json();
      console.log('Timeout Response:', response.status, json);

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
    console.log(`deleteMessage called with messageId=${messageId}, broadcaster_id=${channelId}, moderator_id=${this.config.botUserId}`);
    try {
      const response = await fetch(
        `https://api.twitch.tv/helix/moderation/chat?broadcaster_id=${channelId}&moderator_id=${this.config.botUserId}&message_id=${messageId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Client-Id': this.config.clientId,
          }
        }
      );

      const json = await response.json();
      console.log('Delete message response:', response.status, json);

      return response.ok;
    } catch (error) {
      console.error('Fehler beim Löschen der Nachricht:', error);
      return false;
    }
  }
}
