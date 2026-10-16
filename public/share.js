// Copy plan: puts the plan text on the clipboard, or shows it selected when the browser blocks that.

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
