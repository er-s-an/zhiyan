import {continueRender, delayRender} from "remotion";

const handle = delayRender("Waiting for Noto Sans CJK SC");

const waitForCjk = async () => {
  if (typeof document === "undefined") {
    continueRender(handle);
    return;
  }
  await document.fonts.ready;
  const probe = document.createElement("span");
  probe.textContent = "知研台";
  probe.style.fontFamily = '"Noto Sans CJK SC", "Noto Sans SC", sans-serif';
  probe.style.fontSize = "64px";
  probe.style.position = "absolute";
  probe.style.left = "-9999px";
  document.body.appendChild(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  if (width < 40) {
    throw new Error("Noto Sans CJK SC did not paint Chinese glyphs");
  }
  continueRender(handle);
};

void waitForCjk();
