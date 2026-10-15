import { createFileRoute } from "@tanstack/react-router";
import { Landing, landingHead, type LandingContent } from "@/components/skinchanger/Landing";

const PATH = "/lol-skin-changer-mac";

const CONTENT: LandingContent = {
  lang: "en",
  eyebrow: "League of Legends skin changer for macOS",
  h1: "LoL Skin Changer for Mac",
  lead: "667 LoL Skin is a free League of Legends skin changer that runs natively on Apple Silicon Macs. Use every official skin and chroma, 600+ custom skins and in-game 3D previews, without Boot Camp or a Windows virtual machine.",
  prefer: "mac",
  downloadLabel: (p) => `Download for ${p}`,
  allReleases: "All releases",
  back: "667 LOL SKIN",
  sections: [
    {
      h2: "A skin changer built for macOS",
      paragraphs: [
        "Most League of Legends skin changers and mod managers are Windows-only, so Mac players have been left to run Windows in a virtual machine or go without. 667 LoL Skin ships a native macOS app for Apple Silicon (M1, M2, M3, M4 and newer) next to its Windows version, with the same features on both.",
        "It is built on LTK (League Toolkit), the open mod tooling for League of Legends, with a macOS injection host of its own. Your game files are never modified: skins load from a separate overlay only while the game is running.",
      ],
      bullets: [
        "Native Apple Silicon app, no Rosetta, no virtual machine",
        "Every official skin and chroma, plus 600+ custom skins in the built-in market",
        "In-game 3D preview before you pick a skin",
        "Mods are checked before every start and repaired automatically when a patch breaks them",
        "Updates itself; new League patches do not require a reinstall",
      ],
    },
    {
      h2: "Why the admin password prompt on Mac?",
      paragraphs: [
        "To load skins into the running game, macOS requires a helper with administrator rights. 667 LoL Skin asks for your password (or Touch ID) once per session through the standard macOS prompt. The helper only patches the League of Legends game process and exits when you quit 667 LoL Skin.",
      ],
    },
    {
      h2: "Safe by design",
      paragraphs: [
        "Custom mod files (.fantome, .wad, .zip) are only ever read as game data: textures, models and sounds. Anything hidden inside a mod is never executed. Sign-in uses Discord's identify scope only, so the app sees your username and avatar, never your email, messages or password.",
      ],
    },
  ],
  stepsTitle: "How to install the LoL skin changer on Mac",
  steps: [
    {
      title: "Download the macOS version",
      body: "Download the .dmg file above and drag 667 LoL Skin into your Applications folder.",
    },
    {
      title: "Open the app and sign in",
      body: "Open 667 LoL Skin and sign in once with Discord. You stay signed in afterwards.",
    },
    {
      title: "Pick your skins",
      body: "Choose a champion, pick a skin or chroma and add it to your set. Add custom skins from the Market tab if you like.",
    },
    {
      title: "Press Start, then launch a game",
      body: "Press Start, confirm the administrator prompt, then start your game from the League client. Your skins are loaded as the game starts.",
    },
  ],
  faqTitle: "Mac skin changer FAQ",
  faq: [
    {
      q: "Does 667 LoL Skin work on Intel Macs?",
      a: "The macOS build targets Apple Silicon (M1 and newer). Intel Macs are not supported at the moment.",
    },
    {
      q: "Do other players see my skins?",
      a: "No. Skins are only visible on your own screen; other players see their own skins.",
    },
    {
      q: "Is it free?",
      a: "Yes. 667 LoL Skin is completely free, with no ads and no subscription.",
    },
    {
      q: "What happens when League updates?",
      a: "The app updates itself, and mods are checked and repaired if needed before you start, so you do not have to reinstall.",
    },
    {
      q: "Is there a risk to my account?",
      a: "Skins are only visible on your screen, game files are not modified and there are no cheat features. Riot does not officially support third-party tools, so use it at your own discretion.",
    },
  ],
  related: [
    { href: "/667skinchanger", label: "667 LoL Skin — Windows & Mac" },
    { href: "/tr/lol-skin-changer", label: "LoL Skin Changer (Türkçe)" },
  ],
};

export const Route = createFileRoute("/lol-skin-changer-mac")({
  component: () => <Landing c={CONTENT} />,
  head: () =>
    landingHead(
      CONTENT,
      PATH,
      "LoL Skin Changer for Mac (Apple Silicon) — Free | 667 LoL Skin",
      "Free League of Legends skin changer for Mac. Runs natively on Apple Silicon: every skin and chroma, 600+ custom skins, 3D preview, automatic repair and updates.",
      [],
    ),
});
