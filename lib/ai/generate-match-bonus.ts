export type GeneratedBonus = {
  prompt_text: string;
  options: { label: string; value: string }[];
};

export type MatchBonusContext = {
  match_number: number;
  home_team: string;
  away_team: string;
  tournament_stage: string;
  match_time_utc: string;
};

function templateBonus(ctx: MatchBonusContext): GeneratedBonus {
  const opts = [
    { label: ctx.home_team, value: ctx.home_team },
    { label: ctx.away_team, value: ctx.away_team },
    { label: "Draw / Neither", value: "Neither" },
  ].filter((o, i, arr) => arr.findIndex((x) => x.value === o.value) === i);

  return {
    prompt_text: `Who will win ${ctx.home_team} vs ${ctx.away_team} (M${ctx.match_number})?`,
    options: opts.length >= 2 ? opts : [{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }],
  };
}

function parseLlmJson(text: string): GeneratedBonus | null {
  try {
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as { prompt_text?: string; options?: { label?: string; value?: string }[] };
    const prompt_text = parsed.prompt_text?.trim();
    const options = (parsed.options ?? [])
      .map((o) => ({
        label: String(o.label ?? "").trim(),
        value: String(o.value ?? o.label ?? "").trim(),
      }))
      .filter((o) => o.label && o.value);
    if (!prompt_text || options.length < 2) return null;
    return { prompt_text, options: options.slice(0, 5) };
  } catch {
    return null;
  }
}

export async function generateMatchBonus(ctx: MatchBonusContext): Promise<GeneratedBonus> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return templateBonus(ctx);

  const system = `You create short football match bonus questions. Reply JSON only: {"prompt_text":"...","options":[{"label":"...","value":"..."}]}. Use 3-5 sensible options referencing the teams or match outcome. No offensive content.`;
  const user = `Match M${ctx.match_number}, stage ${ctx.tournament_stage}, ${ctx.home_team} vs ${ctx.away_team}, kickoff ${ctx.match_time_utc}.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.4,
      }),
    });
    if (!res.ok) return templateBonus(ctx);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    return parseLlmJson(content) ?? templateBonus(ctx);
  } catch {
    return templateBonus(ctx);
  }
}
