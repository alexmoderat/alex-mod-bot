import axios from 'axios';
import { CommandDefinition, CommandContext } from '../types';
import { config } from '../config';

async function getModerationChannels(): Promise<string[]> {
    try {
        const response = await axios.get(`https://api.twitch.tv/helix/moderation/channels?user_id=${config.twitch.botUserId}`, {
            headers: {
                'Authorization': `Bearer ${config.twitch.accessToken}`,
                'Client-Id': config.twitch.clientId,
            },
        });

        const channels = response.data.data;
        return channels.map((ch: any) => ch.broadcaster_name); // Je nach API ggf. anpassen
    } catch (error: any) {
        console.error('[Twitch API] Error fetching moderation channels:', error.response?.data || error.message);
        return [];
    }
}

async function postToPoste(title: string, content: string): Promise<string | null> {
    try {
        const response = await axios.post('https://api.paste.ee/v1/pastes', {
            sections: [
                {
                    name: title,
                    syntax: "text",
                    contents: content
                }
            ]
        }, {
            headers: {
                'X-Auth-Token': config.pasteee.apiKey,
                'Content-Type': 'application/json'
            }
        });

        return `https://paste.ee/r/${response.data.id}`;
    } catch (error: any) {
        console.error('[Poste.ee] Error posting list:', error.response?.data || error.message);
        return null;
    }
}

export const command: CommandDefinition = {
    name: 'modcount',
    aliases: [],
    description: 'Zeigt, in wie vielen Kanälen Alex Mod ist.',
    access: {},
    cooldown: {
        user: 5,
    },
    reply: true,
    execute: async (context: CommandContext) => {
        try {
            const channels = await getModerationChannels();

            if (channels.length === 0) {
                return `Alex ist aktuell in keinen Channels als Moderator aktiv.`;
            }

            const list = channels.map(ch => `• ${ch}`).join('\n');
            const pasteUrl = await postToPoste('Alex Mod Channels', list);

            return `Alex ist in ${channels.length} Channel's Moderator. Liste: ${pasteUrl ?? 'Fehler beim Hochladen.'}`;
        } catch (error: any) {
            console.error('[modcount] Error:', error.response?.data || error.message);
            return `Fehler beim Abrufen der Mod-Kanäle.`;
        }
    },
};
