export type BotKey = "panel" | "mod" | "user" | "voice";

export const BOTS: { value: BotKey; label: string }[] = [
  { value: "panel", label: "Panel" },
  { value: "mod", label: "Mod" },
  { value: "user", label: "User" },
  { value: "voice", label: "Voice" },
];
