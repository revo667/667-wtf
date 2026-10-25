export type Badge = "developer";

export type Member = {
  discordId?: string;
  name: string;
  handle: string;
  avatar?: string;
  badges: Badge[];
  mood?: string;
  bio: string;
  discordBadges?: string[];
  quote?: string;
  tags: string[];
  banner: { image: string; label: string; href: string };
};

export const MEMBERS: Member[] = [
  {
    discordId: "1118833327307227236",
    name: "selim",
    handle: "beniyargilama",
    avatar: "/members/selim-itachi.png",
    badges: ["developer"],
    mood: "✦",
    bio: "6 digit daytrader, software engineer, victim of paranoia.",
    discordBadges: ["nitro_emerald", "boost_9"],
    quote: "audentes fortuna iuvat",
    tags: ["#667"],
    banner: { image: "/logo-667.png", label: "667.wtf", href: "https://667.wtf" },
  },
  {
    discordId: "292009962778132491",
    name: "esah667",
    handle: "esah667",
    avatar: "/members/esah.png",
    badges: [],
    discordBadges: [
      "nitro_bronze",
      "early_supporter",
    ],
    bio: "emek hırsızı,\nmy mercy prevails over my wrath",
    tags: ["#667"],
    banner: { image: "/logo-667.png", label: "discord.gg/667", href: "https://discord.gg/667" },
  },
];
