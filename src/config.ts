import dotenv from 'dotenv';
dotenv.config();

export const config = {
    databaseUrl: process.env.DATABASE_URL!,
    twitch: {
        clientId: process.env.TWITCH_CLIENT_ID!,
        clientSecret: process.env.TWITCH_CLIENT_SECRET!,
        accessToken: process.env.TWITCH_ACCESS_TOKEN!,
        botUsername: process.env.TWITCH_BOT_USERNAME!,
        botUserId: process.env.TWITCH_BOT_USER_ID!,
    },
    bot: {
        prefix: process.env.COMMAND_PREFIX!,
        id: process.env.TWITCH_BOT_USER_ID!,
    },
    pasteee: {
        apiKey: process.env.PASTEEE_API_KEY!,
    },
};