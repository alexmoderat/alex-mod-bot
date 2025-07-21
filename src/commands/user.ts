import { CommandDefinition, CommandContext } from '../types';
import humanizeDuration from 'humanize-duration';
import axios from 'axios';

const humanizer = humanizeDuration.humanizer({
    language: 'en',
    round: true,
    units: ['y', 'mo', 'd', 'h', 'm'],
});

interface TwitchUser {
    banned: boolean;
    banReason?: string;
    displayName: string;
    login: string;
    id: string;
    bio: string | null;
    follows: number | null;
    followers: number;
    profileViewCount: number | null;
    chatColor: string | null;
    logo: string;
    banner: string | null;
    verifiedBot: boolean | null;
    createdAt: string;
    updatedAt: string;
    emotePrefix: string;
    roles: {
        isAffiliate: boolean;
        isPartner: boolean;
        isStaff: boolean | null;
    };
    badges: string[];
    chatterCount: number;
    chatSettings: {
        chatDelayMs: number;
        followersOnlyDurationMinutes: number | null;
        slowModeDurationSeconds: number | null;
        blockLinks: boolean;
        isSubscribersOnlyModeEnabled: boolean;
        isEmoteOnlyModeEnabled: boolean;
        isFastSubsModeEnabled: boolean;
        isUniqueChatModeEnabled: boolean;
        requireVerifiedAccount: boolean;
        rules: string[];
    };
    stream: any;
    lastBroadcast: {
        startedAt: string | null;
        title: string | null;
    };
    panels: any[];
}

export const command: CommandDefinition = {
    name: 'user',
    aliases: ['u'],
    description: 'Shows detailed information about a Twitch user.',
    access: {},
    cooldown: {
        user: 3,
    },
    reply: true,
    execute: async (context: CommandContext) => {
        const args = context.args;

        if (args.length === 0) {
            return '❌ Please provide a username! Usage: !user <username>';
        }

        const username = args[0].toLowerCase().replace('@', '');

        try {
            const apiResponse = await axios.get(`https://api.ivr.fi/v2/twitch/user?login=${username}`, {
                timeout: 2500,
            });

            const userData: TwitchUser[] = apiResponse.data;

            if (!userData || userData.length === 0) {
                return `❌ User "${username}" not found!`;
            }

            const user = userData[0];

            const createdDate = new Date(user.createdAt);
            const accountAge = humanizer(Date.now() - createdDate.getTime());

            const updatedDate = new Date(user.updatedAt);
            const lastUpdated = humanizer(Date.now() - updatedDate.getTime());

            const roles = [];
            if (user.roles.isPartner) roles.push('Partner');
            if (user.roles.isAffiliate) roles.push('Affiliate');
            if (user.roles.isStaff) roles.push('Staff');
            if (user.verifiedBot) roles.push('Verified Bot');

            const rolesText = roles.length > 0 ? roles.join(', ') : 'None';

            let statusEmoji = '✅';
            let banInfo = '';

            if (user.banned) {
                statusEmoji = '⛔';

                const banReasons: { [key: string]: string } = {
                    'TOS_INDEFINITE': 'Indefinite TOS Ban',
                    'TOS_TEMPORARY': 'Temporary TOS Ban',
                    'DMCA': 'DMCA Violation'
                };

                if (user.banReason) {
                    const reasonText = banReasons[user.banReason] || user.banReason;
                    banInfo = ` (${reasonText})`;
                }
            }

            let streamInfo = '';
            if (user.stream) {
                streamInfo = ' 🔴 LIVE';
            } else if (user.lastBroadcast?.startedAt) {
                const lastStreamDate = new Date(user.lastBroadcast.startedAt);
                const timeSinceStream = humanizer(Date.now() - lastStreamDate.getTime());
                streamInfo = ` ● Last live: ${timeSinceStream} ago`;
            }

            let responseText = `${statusEmoji} @${user.displayName}${banInfo}${streamInfo} ● ID: ${user.id} ● Roles: ${rolesText} ● Chatters: ${user.chatterCount}`;

            if (user.bio) {
                responseText += ` ● Bio: ${user.bio}`;
            }

            responseText += ` ● Created: ${accountAge} ago ● Last Updated: ${lastUpdated} ago`;

            return responseText;
        } catch (error) {
            console.error('Error fetching user data:', error);

            if (axios.isAxiosError(error)) {
                if (error.response?.status === 404) {
                    return `❌ User "${username}" not found!`;
                } else if (error.code === 'ECONNABORTED') {
                    return '❌ Request timed out. Please try again later.';
                }
            }

            return '❌ An error occurred while fetching user data. Please try again later.';
        }
    },
};
