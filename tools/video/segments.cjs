// Where each shot sits in the film, worked out from the narration timeline (submission/work/timeline.json),
// so the shot scripts (record.cjs) and the final build (compose.cjs) always agree with the voice.
const fs = require("fs");
const path = require("path");

const WORK = path.resolve(__dirname, "..", "..", "submission", "work");
const timeline = JSON.parse(fs.readFileSync(path.join(WORK, "timeline.json"), "utf8"));
const line = (id) => {
  const l = timeline.lines.find((x) => x.id === id);
  if (!l) throw new Error(`no narration line called ${id}`);
  return l;
};
/** Start of a narration line, plus d seconds. */
const S = (id, d = 0) => line(id).start + d;
/** End of a narration line, plus d seconds. */
const E = (id, d = 0) => line(id).end + d;
const TOTAL = timeline.total;

// The boundaries between shots.
const T = {
  chatEnd: E("s1b", 0.22),            // the chat gives way to the app once "the same sum in their head" is said
  deskStart: E("s2e", 0.4),           // the laptop takes over after the messy photo is read
  homeStart: S("s4b", -0.17),
  phoneCStart: S("s4b", 4.2),
  audienceStart: E("s5a", 0.67),
  planfirstStart: E("s6m", 0.5),
  closingStart: E("s6b", 0.7),
};

// Which shot fills which stretch, and which panel sits beside the phone.
const SEGMENTS = [
  { shot: "chat", t0: 0, t1: T.chatEnd, phone: true, panels: [[0, T.chatEnd, { eyebrow: "The problem", title: "The schedule arrives as <em>a picture</em>.", sub: "In the group chat, a few hours before the power goes.", time: "07:12" }]] },
  { shot: "phone-a", t0: T.chatEnd, t1: T.deskStart, phone: true, panels: [
    [T.chatEnd, E("s2b"), { eyebrow: "Photo in, plan out", title: "Take a photo. <em>Get a day.</em>", sub: "OnHours reads every area and its power cuts, then plans around them.", time: "08:00" }],
    [E("s2b"), S("s2d", -0.5), { eyebrow: "The plan", title: "Every job in <em>one stretch</em>.", sub: "Must-do jobs first. Nothing starts and then loses its power.", time: "08:00" }],
    [S("s2d", -0.5), E("s2d", 0.4), { eyebrow: "How it decides", title: "The AI reads. <em>Code decides.</em>", flow: "1", time: "08:00" }],
    [E("s2d", 0.4), T.deskStart, { eyebrow: "Not just the clean one", title: "A <em>messier</em> photo, read too.", sub: "Tilted, laid out differently, times in words. Check the names against the notice.", time: "08:00" }]] },
  { shot: "desk-b", t0: T.deskStart, t1: T.homeStart, phone: false },
  { shot: "home", t0: T.homeStart, t1: T.phoneCStart, phone: true, panels: [[T.homeStart, T.phoneCStart, { eyebrow: "Installed, not signed up", title: "On your <em>home screen</em>.", sub: "One visit online. After that it opens with no network.", time: "08:00" }]] },
  { shot: "phone-c", t0: T.phoneCStart, t1: T.audienceStart, phone: true, panels: [
    [T.phoneCStart, S("s4c", 1.4), { eyebrow: "When the lights go out", title: "Your plan, <em>saved</em> on the phone.", sub: "Jobs, area and last notice, kept in this browser only.", time: "08:00" }],
    [S("s4c", 1.4), S("s4d"), { eyebrow: "No power. No network.", title: "Still <em>there</em>.", sub: "Right now: power is off until 09:00. Next: sew the choir order at 09:00.", foot: "Demo clock set to 08:00.", time: "08:00", airplane: "1" }],
    [S("s4d"), S("s5a", -0.04), { eyebrow: "Yours alone", title: "No account. <em>Nothing tracked.</em>", sub: "Forget this device clears it all.", time: "08:00", airplane: "1" }],
    [S("s5a", -0.04), T.audienceStart, { eyebrow: "Into the family chat", title: "A picture, <em>or a calendar</em>.", sub: "A reminder ten minutes before every cut.", time: "08:00", airplane: "1" }]] },
  { shot: "audience", t0: T.audienceStart, t1: T.planfirstStart, phone: false },
  { shot: "planfirst", t0: T.planfirstStart, t1: T.closingStart, phone: false },
  { shot: "closing", t0: T.closingStart, t1: TOTAL, phone: false },
];

/** Seconds from the start of a shot to a narration moment, for the shot scripts: at(rel("phone-a", "s2b", 0.3)). */
const rel = (shot, id, d = 0) => S(id, d) - SEGMENTS.find((s) => s.shot === shot).t0;

module.exports = { timeline, TOTAL, S, E, T, SEGMENTS, rel };
