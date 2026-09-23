"use strict";

// Supports local files and browsers where the Clipboard API is unavailable.
function copyWithSelection(text) {
  const focusedElement = document.activeElement;
  const selection = window.getSelection();
  const savedRanges = [];
  if (selection) {
    for (let index = 0; index < selection.rangeCount; index += 1) {
      savedRanges.push(selection.getRangeAt(index).cloneRange());
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.readOnly = true;
  textarea.tabIndex = -1;
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.cssText = "position:fixed;left:-9999px;top:0;font-size:16px;";
  document.body.append(textarea);

  try {
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    if (!document.execCommand("copy")) {
      throw new Error("Copy command was unavailable.");
    }
  } finally {
    textarea.remove();
    if (focusedElement instanceof HTMLElement) {
      focusedElement.focus({ preventScroll: true });
    }
    if (selection) {
      selection.removeAllRanges();
      savedRanges.forEach((range) => selection.addRange(range));
    }
  }
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // A browser may deny Clipboard API access but allow a user-initiated copy.
    }
  }
  copyWithSelection(text);
}

document.querySelectorAll("[data-copy-target]").forEach((button) => {
  const code = document.getElementById(button.dataset.copyTarget)?.querySelector("code");
  const status = button.closest(".prompt")?.querySelector(".copy-status");
  if (!code || !status) return;

  button.hidden = false;
  const toolbar = button.closest(".copy-toolbar");
  if (toolbar) toolbar.hidden = false;
  let resetTimer;

  button.addEventListener("click", async () => {
    if (button.getAttribute("aria-busy") === "true") return;
    window.clearTimeout(resetTimer);
    status.textContent = "";
    button.setAttribute("aria-busy", "true");

    try {
      // textContent preserves every line, including text outside the scroll area.
      await copyText(code.textContent);
      status.textContent = "コピーしました。";
      resetTimer = window.setTimeout(() => { status.textContent = ""; }, 3000);
    } catch {
      status.textContent = "コピーできませんでした。本文を選択してコピーしてください。";
    } finally {
      button.removeAttribute("aria-busy");
    }
  });
});
