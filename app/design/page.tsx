"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmAndRetrieve, type RetrieveProgress } from "../../lib/confirmRun";
import { LOCKED_LIMITS, STAGE_LABEL, STAGES, SUBJECTS, type ResearchDesign, type Study } from "../../lib/types";
import { loadDraft, saveDraft } from "../../lib/storage";

function lines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function DesignPage() {
  const router = useRouter();
  const [design, setDesign] = useState<ResearchDesign | null>(null);
  const [study, setStudy] = useState<Study | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<RetrieveProgress | null>(null);

  useEffect(() => {
    const draft = loadDraft();
    if (!draft) {
      setReady(true);
      return;
    }
    setDesign(draft.design);
    setStudy(draft.study);
    setReady(true);
  }, []);

  function update(patch: Partial<ResearchDesign>) {
    setDesign((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      saveDraft({ design: next, study: null });
      return next;
    });
    setStudy(null);
  }

  async function confirm() {
    if (!design) return;
    setBusy(true);
    setError("");
    setProgress({ step: "Starting", finished: [] });
    try {
      const study = await confirmAndRetrieve(design, setProgress);
      saveDraft({ design: study.design, study });
      router.push("/workbench?view=sample");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Retrieval failed.";
      const readable =
        message === "SEARCH_FAILED"
          ? "Zhihu search did not return. Nothing was turned into a finding."
          : message === "HOT_LIST_FAILED"
            ? "The hot list did not return. Retrieval stopped before a sample was saved."
            : message;
      setError(readable);
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <p>Loading the design.</p>;
  if (!design) {
    return (
      <main>
        <h1>No design yet.</h1>
        <p>
          <a href="/">Submit a brief</a> before retrieval.
        </p>
      </main>
    );
  }

  const extraLimits = design.zhihuCannotAnswer.filter(
    (line) => !LOCKED_LIMITS.includes(line as (typeof LOCKED_LIMITS)[number]),
  );

  return (
    <main>
      <p className="kicker">Before retrieval</p>
      <h1>Research design</h1>
      <p className="lede" data-testid="design-panel">
        Edit the protocol. Zhihu search, the hot list, and Zhida stay idle until you confirm.
      </p>
      <p data-testid="zhihu-calls">Zhihu calls so far: {study ? study.retrieval.length : 0}</p>
      {study ? (
        <p className="callout">
          A sample already exists. Editing here clears it, and retrieval starts again only after you confirm.{" "}
          <a href="/workbench">Open the workbench</a>.
        </p>
      ) : (
        <p className="callout">Retrieval has not started.</p>
      )}

      <section className="sheet grid">
        <label>
          Decision this study will support
          <textarea data-testid="decision-input" value={design.decision} onChange={(event) => update({ decision: event.target.value })} />
        </label>
        <div className="two grid">
          <div>
            <div className="kicker">Subjects</div>
            <div className="checks">
              {SUBJECTS.map((subject) => (
                <label key={subject}>
                  <input
                    type="checkbox"
                    checked={design.subjects.includes(subject)}
                    onChange={(event) => {
                      const subjects = event.target.checked
                        ? [...design.subjects, subject]
                        : design.subjects.filter((item) => item !== subject);
                      update({ subjects });
                    }}
                  />
                  {subject}
                </label>
              ))}
            </div>
          </div>
          <label>
            Stage
            <select
              value={design.stage}
              onChange={(event) => update({ stage: event.target.value as ResearchDesign["stage"] })}
            >
              {STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {STAGE_LABEL[stage]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          What existing Zhihu discussion can answer
          <textarea value={design.zhihuCanAnswer.join("\n")} onChange={(event) => update({ zhihuCanAnswer: lines(event.target.value) })} />
        </label>
        <div>
          <div className="kicker">What existing Zhihu discussion cannot answer</div>
          <div className="locked" data-testid="locked-limits">
            {LOCKED_LIMITS.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <label>
            Further limits you want on the record
            <textarea value={extraLimits.join("\n")} onChange={(event) => update({ zhihuCannotAnswer: [...LOCKED_LIMITS, ...lines(event.target.value)] })} />
          </label>
        </div>

        <div className="grid">
          <div className="kicker">Scenes</div>
          {design.scenes.map((scene) => (
            <label key={scene.id}>
              {scene.label}
              <input
                type="text"
                value={scene.label}
                onChange={(event) =>
                  update({
                    scenes: design.scenes.map((item) => (item.id === scene.id ? { ...item, label: event.target.value } : item)),
                  })
                }
              />
              <span>Terms: {scene.keywords.join(", ")}</span>
            </label>
          ))}
        </div>

        <label>
          Populations
          <textarea value={design.populations.join("\n")} onChange={(event) => update({ populations: lines(event.target.value) })} />
        </label>
        <div className="two grid">
          <label>
            Window start
            <input
              type="date"
              value={design.timeWindow.start}
              onChange={(event) => update({ timeWindow: { ...design.timeWindow, start: event.target.value } })}
            />
          </label>
          <label>
            Window end
            <input
              type="date"
              value={design.timeWindow.end}
              onChange={(event) => update({ timeWindow: { ...design.timeWindow, end: event.target.value } })}
            />
          </label>
        </div>
        <p className="callout">{design.timeWindow.rationale}</p>
        <label>
          Inclusion
          <textarea value={design.inclusion.join("\n")} onChange={(event) => update({ inclusion: lines(event.target.value) })} />
        </label>
        <label>
          Exclusion
          <textarea value={design.exclusion.join("\n")} onChange={(event) => update({ exclusion: lines(event.target.value) })} />
        </label>
        <label>
          Stopping rule
          <textarea value={design.stoppingRule} onChange={(event) => update({ stoppingRule: event.target.value })} />
        </label>
        <label>
          Chinese retrieval queries
          <textarea data-testid="queries" value={design.queries.join("\n")} onChange={(event) => update({ queries: lines(event.target.value) })} />
        </label>
        <div className="row">
          <button className="btn primary" type="button" data-testid="confirm-button" disabled={busy} onClick={confirm}>
            {busy ? progress?.step || "Retrieving from Zhihu" : "Confirm design and retrieve"}
          </button>
        </div>
        {progress ? (
          <div data-testid="retrieve-progress">
            <p>{progress.step}</p>
            {progress.finished.length > 0 ? <p className="meta">Finished queries: {progress.finished.join(" · ")}</p> : null}
          </div>
        ) : null}
        {error ? (
          <p className="error" data-testid="form-error">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  );
}
