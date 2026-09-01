import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inviteResponseSchema = z.object({
  guild: z.object({ id: z.string() }).optional(),
  profile: z
    .object({
      member_count: z.number().optional(),
      online_count: z.number().optional(),
    })
    .optional(),
  approximate_member_count: z.number().optional(),
  approximate_presence_count: z.number().optional(),
});

async function fetchInvite() {
  const response = await fetch("https://discord.com/api/v10/invites/667?with_counts=true", {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Discord API returned ${response.status}`);
  }
  const data = await response.json();
  return inviteResponseSchema.parse(data);
}

export const getDiscordMemberCount = createServerFn({ method: "GET" }).handler(async () => {
  const parsed = await fetchInvite();

  const total = parsed.profile?.member_count ?? parsed.approximate_member_count ?? 0;

  const online = parsed.profile?.online_count ?? parsed.approximate_presence_count ?? 0;

  return { total, online };
});
