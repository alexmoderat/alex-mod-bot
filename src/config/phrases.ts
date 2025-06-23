export interface phrase {
    word: string;
    action: number;
    reason: string;
}

export const phrases: phrase[] = [
    {
        word: "\\b(test123321)\\b",
        action: 1,
        reason: "Test"
    },
    {
        word: "\\b(spam|scam)\\b",
        action: 0,
        reason: "Spam oder Betrug"
    },
    {
        word: "\\b(toxic|hate)\\b",
        action: 300,
        reason: "Toxisches Verhalten - 5 Minuten Timeout"
    },
];