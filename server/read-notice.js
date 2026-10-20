// Notice reader: asks an OpenAI-compatible chat model to turn a pasted notice, or a photo of one,
// into areas and outage times, checks the reply, and falls back to the built-in rules.
// The model only reads. It never places a job.
import { rulesRead, splitRange } from "../public/rules.js";

const SHAPE = `Return one JSON object and nothing else.
"areas" is an array of objects. Each has exactly two keys:
- "name": the area's name as written in the notice (a string). When one line or row names several areas, give each area its own object with the same outages. Leave out group labels such as "Group 2" and group numbers.
- "off": an array of outage periods for the day, each an object with exactly two keys, "start" and "end", both 24-hour times as "HH:MM" strings.
Convert wording like "from 4 in the afternoon until 8pm" to {"start":"16:00","end":"20:00"}. A period that runs past midnight keeps its real times, for example {"start":"22:00","end":"02:00"}.
Include only areas with at least one outage time stated in the notice. Do not invent areas or times.`;

const TEXT_PROMPT = `You read power outage notices and return JSON only.
Return one JSON object with exactly one key, "areas": an array of objects.
Each object has exactly two keys:
- "name": the area's name as written in the notice (a string). When one line names several areas, give each area its own object with the same outages. Leave out group labels such as "Group 2".
- "off": an array of outage periods for the day, each an object with exactly two keys, "start" and "end", both 24-hour times as "HH:MM" strings.
Convert wording like "from 4 in the afternoon until 8pm" to {"start":"16:00","end":"20:00"}. A period that runs past midnight keeps its real times, for example {"start":"22:00","end":"02:00"}.
Include only areas with at least one outage time stated in the notice. Do not invent areas or times. If the notice has none, return {"areas": []}.`;

const IMAGE_PROMPT = `You read a photo or screenshot of a power outage notice and return JSON only.
${SHAPE}
After "areas", add a second key, "transcript": the notice's words as written in the picture, one row per line, using single ordinary spaces only (never runs of spaces, never padding to line up columns) and no more than 1,500 characters. Do not add words that are not in the picture.
Write the keys in this order: "areas", then "transcript".
If the picture is not an outage notice, return {"areas":[],"transcript":""}.`;

export function aiConfigured(env) {
  return Boolean(env.LLM_BASE_URL && env.LLM_API_KEY && env.LLM_MODEL);
}

/** Photo reading needs the AI reader and a model that can see: LLM_VISION_MODEL, or LLM_VISION=1 to use LLM_MODEL. */
export function visionConfigured(env) {
  return aiConfigured(env) && Boolean(env.LLM_VISION_MODEL || /^(1|true|yes|on)$/i.test(env.LLM_VISION || ""));
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

/** The transcript the model read from a photo, tidied: plain spaces, no control characters, a sane length. */
export function cleanTranscript(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[   ]/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 8000);
}

function parseJson(content) {
  if (typeof content !== "string") return null;
  const fenced = content.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  try { return JSON.parse(fenced); } catch { return null; }
}

// A reply cut off in its long transcript still holds a finished "areas" array in front of it. Take that
// array alone; it goes through the same check as any other reply.
export function salvageAreas(content) {
  if (typeof content !== "string") return null;
  const key = content.indexOf('"areas"');
  const open = key < 0 ? -1 : content.indexOf("[", key);
  if (open < 0) return null;
  let depth = 0;
  let inString = false;
  for (let i = open; i < content.length; i++) {
    const c = content[i];
    if (inString) { if (c === "\\") i++; else if (c === '"') inString = false; continue; }
    if (c === '"') inString = true;
    else if (c === "[") depth++;
    else if (c === "]" && --depth === 0) {
      try { return { areas: JSON.parse(content.slice(open, i + 1)) }; } catch { return null; }
    }
  }
  return null;
}

async function callModel({ env, fetchImpl, model, system, user, maxTokens, timeoutMs }) {
  const base = env.LLM_BASE_URL.replace(/\/+$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${base}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.LLM_API_KEY}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    if (!res.ok) return { error: `model answered ${res.status}` };
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    return { json: parseJson(raw), raw };
  } catch (e) {
    return { error: e.name === "AbortError" ? "model timed out" : "model unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Read a text notice: AI first when configured, built-in rules otherwise or on failure.
 * @returns {Promise<{areas: object[], reader: "ai"|"rules", note?: string}>}
 */
export async function readNotice(text, env = process.env, fetchImpl = fetch) {
  if (aiConfigured(env)) {
    const r = await callModel({
      env, fetchImpl, model: env.LLM_MODEL, system: TEXT_PROMPT,
      user: `Notice:\n"""\n${text}\n"""`, maxTokens: 1200, timeoutMs: Number(env.LLM_TIMEOUT_MS) || 20000,
    });
    const areas = r.json ? validateAreas(r.json) : null;
    if (areas) return { areas, reader: "ai" };
    console.warn(`AI reader fell back to rules: ${r.error || "model reply did not match the agreed shape"}`);
    return { areas: rulesRead(text), reader: "rules", note: "The AI reader was unavailable, so the built-in rules read it." };
  }
  return { areas: rulesRead(text), reader: "rules" };
}

const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
export const MAX_IMAGE_CHARS = 2_500_000;

/** True when `value` looks like an image data URL small enough to send. */
export function isImageDataUrl(value) {
  return typeof value === "string" && value.length <= MAX_IMAGE_CHARS && DATA_URL.test(value);
}

/**
 * Read a photo of a notice with a vision model.
 * The photo is held in memory for this call only. It is never written or logged.
 * @returns {Promise<{areas: object[], reader: "ai"|"rules", from: "photo", transcript: string, note?: string} | {error: string}>}
 */
export async function readNoticeImage(dataUrl, env = process.env, fetchImpl = fetch) {
  if (!visionConfigured(env)) return { error: "Photo reading needs the AI reader, which is switched off here. Paste the text instead.", code: "off" };
  const r = await callModel({
    env, fetchImpl, model: env.LLM_VISION_MODEL || env.LLM_MODEL, system: IMAGE_PROMPT,
    user: [{ type: "text", text: "Read this notice." }, { type: "image_url", image_url: { url: dataUrl } }],
    maxTokens: 1800, timeoutMs: Number(env.LLM_VISION_TIMEOUT_MS) || 40000,
  });
  const reply = r.json || salvageAreas(r.raw);
  const transcript = reply ? cleanTranscript(reply.transcript) : "";
  const areas = reply ? validateAreas(reply) : null;
  // A reply that passes the check is trusted, even when it says "no outage times in this picture":
  // reading a transcript of something that is not a notice would invent areas.
  if (areas) return { areas, reader: "ai", from: "photo", transcript };
  // The areas failed the check. If the model still wrote down what it saw, the rules can read that.
  if (transcript) {
    const fromWords = rulesRead(transcript);
    if (fromWords.length) {
      return { areas: fromWords, reader: "rules", from: "photo", transcript, note: "The AI read the words in the photo and the built-in rules found the times." };
    }
    return { areas: [], reader: "ai", from: "photo", transcript };
  }
  console.warn(`Photo reader could not read the photo: ${r.error || "model reply did not match the agreed shape"}`);
  return { error: "I couldn't read that photo. Try again, or paste the text.", code: "unreadable" };
}
