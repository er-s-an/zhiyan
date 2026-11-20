import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const home = read("app/page.tsx");
const shell = read("app/components/AppShell.tsx");
const dock = read("app/components/InterviewDock.tsx");
const interview = read("app/interview/page.tsx");
const workbench = read("app/workbench/page.tsx");
const actionPlan = read("app/action-plan/page.tsx");
const css = read("app/v2.css");

assert.ok(shell.includes('href: "/interview"'), "main navigation must include the interview");
assert.ok(shell.includes('href: "/action-plan"'), "main navigation must include the action plan");
assert.ok(home.includes('window.dispatchEvent(new Event("zhiyan:clarify"))'), "home must open the existing clarify flow");
assert.ok(home.includes("briefInputRef") && home.includes("focusBrief"), "home must focus the brief entry");
assert.ok(dock.includes('addEventListener("zhiyan:clarify"'), "dock must listen for the home clarify event");
assert.ok(dock.includes('removeEventListener("zhiyan:clarify"'), "dock must clean up the clarify listener");
assert.ok(interview.indexOf("v2-assess-next") < interview.indexOf("v2-dim-list"), "interview actions must precede the dimension details");
assert.ok(interview.includes("v2-assess-dimensions"), "interview dimensions must be collapsible");
assert.ok(workbench.includes('href="/action-plan"'), "workbench must link to the action plan");
assert.ok(actionPlan.indexOf("v2-plan-next") < actionPlan.indexOf("v2-plan-mvp"), "next seven days must precede the MVP details");
assert.ok(actionPlan.includes("v2-plan-more"), "secondary plan actions must be grouped");
assert.ok(css.includes("--z-muted: #627084"), "muted text must meet readable contrast");
assert.ok(css.includes(".v2-dock-launcher span"), "mobile dock label must have a compact treatment");

console.log("core UX hierarchy, entries, action order and mobile styles verified");
