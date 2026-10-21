export type Project = {
  name: string;
  description: string;
  platforms: string;
  href: string;
  image: string;
  external?: boolean;
  wide?: boolean;
};

export const PROJECTS: Project[] = [
  {
    name: "667 LoL Skin",
    description:
      "Every League of Legends skin and chroma, plus 600+ custom skins with a 3D preview.",
    platforms: "macOS · Windows",
    href: "/667skinchanger",
    image: "/shots/champions.jpg",
  },
  {
    name: "Cecen Client",
    description:
      "DDNet client with the best fast inputs, social profiles and Spotify listen along.",
    platforms: "macOS · Windows · Linux",
    href: "/cecenclient",
    image: "/projects/cecenclient.jpg",
    wide: true,
  },
  {
    name: "667 Tool",
    description: "DM cleaner, exporter, profile lookup and more for Discord.",
    platforms: "macOS · Windows",
    href: "/667tool",
    image: "/projects/667tool.png",
  },
  {
    name: "667 Utility",
    description: "Install, uninstall and clean up apps from one window.",
    platforms: "macOS · Windows · Linux",
    href: "/667utility",
    image: "/projects/667utility.png",
  },
  {
    name: "Universe",
    description: "Music, chat, files, notes and a terminal on one desktop.",
    platforms: "macOS · Windows · Linux",
    href: "/universe",
    image: "/projects/universe.png",
  },
  {
    name: "Trading Journal",
    description: "Log trades and track performance.",
    platforms: "Web",
    href: "https://trading.revo667.com",
    image: "/projects/trading.png",
    external: true,
  },
];
