// src/config/phrases.ts

export interface Phrase {
  words: string[];
  action: number;
  reason: string;
}

export const phrases: Phrase[] = [
  {
    words: [
      "cheap viewers",
      "Best viewers on",
      "smmdex.ru",
      "streamboo.com",
      "NEZHNA.COM",
      "Live Viewers on",
      "Best viewers on 2222222"
    ],
    action: 0,
    reason: "triggered banphrase viewbot service",
  },
  {
    words: ["separate"],
    action: 1,
    reason: "please treat with respect",
  },
  {
    words: ["kdidfneienixne8nf38r"],
    action: 300,
    reason: "Toxic behavior 5 minute timeout",
  },
];
