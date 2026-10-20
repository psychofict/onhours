// Sharing the plan: copy as text, a plan picture to share or download, and a calendar file.
import { drawPlanCard, loadCardFonts, cardBlob } from "./card.js";
import { buildIcs, icsFileName } from "./ics.js";

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function wireCopy(button, statusEl, textArea, getText) {
  button.addEventListener("click", async () => {
    const text = getText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      statusEl.textContent = "Copied. Paste it into your family chat.";
      textArea.hidden = true;
    } catch {
      textArea.hidden = false;
      textArea.value = text;
      textArea.focus();
      textArea.select();
      statusEl.textContent = "Your browser blocked copying. The plan is selected below: copy it by hand.";
    }
  });
}

/** @param {{pictureBtn, icsBtn, dialog, canvas, shareBtn, downloadBtn, statusEl, get: () => ({plan, areaName, dayLabel, date}|null)}} o */
export function wireShare({ pictureBtn, icsBtn, dialog, canvas, shareBtn, downloadBtn, statusEl, get }) {
  let blob = null;

  pictureBtn.addEventListener("click", async () => {
    const ctx = get();
    if (!ctx) return;
    await loadCardFonts();
    drawPlanCard(canvas, ctx.plan, { areaName: ctx.areaName, dayLabel: ctx.dayLabel });
    blob = await cardBlob(canvas);
    const file = new File([blob], "onhours-plan.png", { type: "image/png" });
    shareBtn.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
    if (!dialog.open) dialog.showModal();
  });

  downloadBtn.addEventListener("click", () => { if (blob) download(blob, "onhours-plan.png"); });

  shareBtn.addEventListener("click", async () => {
    if (!blob) return;
    const file = new File([blob], "onhours-plan.png", { type: "image/png" });
    try { await navigator.share({ files: [file], title: "Power plan" }); } catch { /* cancelled */ }
  });

  icsBtn.addEventListener("click", () => {
    const ctx = get();
    if (!ctx) return;
    const text = buildIcs(ctx.plan, { areaName: ctx.areaName, date: ctx.date });
    download(new Blob([text], { type: "text/calendar;charset=utf-8" }), icsFileName(ctx.date));
    statusEl.textContent = "Calendar file saved. Open it to add the plan, with a reminder ten minutes before each job and each cut.";
  });
}
