// Notice reader: asks an OpenAI-compatible chat model to turn the pasted notice into
// areas and outage times, checks the reply, and falls back to the built-in rules.
import { rulesRead, splitRange } from "./rules.js";

const SYSTEM_PROMPT = `You read power outage notices and return JSON only.
Return one JSON object with exactly one key, "areas": an array of objects.
Each object has exactly two keys:
- "name": the area's name as written in the notice (a string). When one line names several areas, give each area its own object with the same outages. Leave out group labels such as "Group 2".
- "off": an array of outage periods for the day, each an object with exactly two keys, "start" and "end", both 24-hour times as "HH:MM" strings.
Convert wording like "from 4 in the afternoon until 8pm" to {"start":"16:00","end":"20:00"}. A period that runs past midnight keeps its real times, for example {"start":"22:00","end":"02:00"}.
Include only areas with at least one outage time stated in the notice. Do not invent areas or times. If the notice has none, return {"areas": []}.`;

export function aiConfigured(env) {
  return Boolean(env.LLM_BASE_URL && env.LLM_API_KEY && env.LLM_MODEL);
}

const HHMM = /^([01]?\d|2[0-4]):([0-5]\d)$/;
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

/** Check the model's reply has the agreed shape; return clean areas or null. */
export function validateAreas(value) {
  const list = value && Array.isArray(value.areas) ? value.areas : null;
  if (!list) return null;
  const out = [];
  for (const a of list) {
    if (!a || typeof a.name !== "string" || !a.name.trim() || !Array.isArray(a.off)) return null;
    const off = [];
    for (const o of a.off) {
      if (!o || typeof o.start !== "string" || typeof o.end !== "string") return null;
      const s = o.start.trim().padStart(5, "0");
      const e = o.end.trim().padStart(5, "0");
      if (!HHMM.test(s) || !HHMM.test(e)) return null;
      off.push(...splitRange(toMin(s), toMin(e) === 0 ? 24 * 60 : toMin(e)));
    }
    if (off.length) out.push({ name: a.name.trim().slice(0, 80), off: off.sort((x, y) => x.start.localeCompare(y.start)) });
  }
  return out;
}

function parseJson(content) {
  if (typeof content !== "string") return null;
  const fenced = content.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  try { return JSON.parse(fenced); } catch { return null; }
}

async function askModel(text, env, fetchImpl) {
  const base = env.LLM_BASE_URL.replace(/\/+$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(env.LLM_TIMEOUT_MS) || 20000);
  try {
    const res = await fetchImpl(`${base}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.LLM_API_KEY}` },
      body: JSON.stringify({
        model: env.LLM_MODEL,
        temperature: 0,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Notice:\n"""\n${text}\n"""` },
        ],
      }),
    });
    if (!res.ok) return { error: `model answered ${res.status}` };
    const data = await res.json();
    const areas = validateAreas(parseJson(data?.choices?.[0]?.message?.content));
    if (!areas) return { error: "model reply did not match the agreed shape" };
    return { areas };
  } catch (e) {
    return { error: e.name === "AbortError" ? "model timed out" : "model unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Read a notice: AI first when configured, built-in rules otherwise or on failure.
 * @returns {Promise<{areas: object[], reader: "ai"|"rules", note?: string}>}
 */
export async function readNotice(text, env = process.env, fetchImpl = fetch) {
  if (aiConfigured(env)) {
    const ai = await askModel(text, env, fetchImpl);
    if (ai.areas) return { areas: ai.areas, reader: "ai" };
    console.warn(`AI reader fell back to rules: ${ai.error}`);
    return { areas: rulesRead(text), reader: "rules", note: "The AI reader was unavailable, so the built-in rules read it." };
  }
  return { areas: rulesRead(text), reader: "rules" };
}
