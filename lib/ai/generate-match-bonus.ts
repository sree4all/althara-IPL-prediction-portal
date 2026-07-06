import {
  isWinnerDuplicateBonus,
  pickMatchBonusTemplate,
  type GeneratedBonus,
  type MatchBonusContext,
} from "@/lib/ai/match-bonus-templates";

export type { GeneratedBonus, MatchBonusContext };

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
  if (!key) return pickMatchBonusTemplate(ctx);

  const system = `You create short football match bonus questions. Reply JSON only: {"prompt_text":"...","options":[{"label":"...","value":"..."}]}. Use Yes/No or 3-5 sensible options about match events (first goal, cards, extra time, possession, etc.). Do NOT ask who will win the match — that is already the main prediction. No offensive content.`;
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
    if (!res.ok) return pickMatchBonusTemplate(ctx);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = parseLlmJson(content);
    if (parsed && !isWinnerDuplicateBonus(parsed.prompt_text)) return parsed;
    return pickMatchBonusTemplate(ctx);
  } catch {
    return pickMatchBonusTemplate(ctx);
  }
}
