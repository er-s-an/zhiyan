"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { project, relabel, setIncluded } from "../../lib/project";
import { loadDraft, saveDraft } from "../../lib/storage";
import {
  ROLE_LABEL,
  STAGE_LABEL,
  type Role,
  type Study,
} from "../../lib/types";

const VIEWS = ["design", "sample", "analysis", "quality", "delivery"] as const;
type View = (typeof VIEWS)[number];

function isView(value: string | null): value is View {
  return VIEWS.includes(value as View);
}

function Workbench() {
  const params = useSearchParams();
  const view: View = isView(params.get("view")) ? (params.get("view") as View) : "design";
  const [study, setStudy] = useState<Study | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const draft = loadDraft();
    setStudy(draft?.study ?? null);
    setReady(true);
  }, []);

  function commit(next: Study) {
    const draft = loadDraft();
    if (!draft) return;
    saveDraft({ design: draft.design, study: next });
    setStudy(next);
  }

  const viewModel = useMemo(() => (study ? project(study) : null), [study]);

  if (!ready) return <p>Loading the workbench.</p>;
  if (!study || !viewModel) {
    return (
      <main>
        <h1>No sample yet.</h1>
        <p>
          Confirm a design before the workbench can show sources. <a href="/design">Go to the design</a>.
        </p>
      </main>
    );
  }

  return (
    <main>
      <p className="kicker">Workbench</p>
      <h1>Check the study.</h1>
      <p className="meta">
        <span>{study.sample.filter((item) => item.included).length} included</span>
        <span>{study.retrieval.filter((entry) => entry.kind === "zhihu_search" && !entry.error).length} search calls</span>
        <span>{study.retrieval.filter((entry) => entry.kind === "hot_list" && !entry.error).length} hot list call</span>
        <span>Zhida used as a finding: {String(study.auxiliary.usedAsFinding)}</span>
        <span>Zhida is an auxiliary gap hint. It is not the report.</span>
      </p>
      <nav className="tabs">
        {VIEWS.map((name) => (
          <a key={name} href={`/workbench?view=${name}`} aria-current={view === name ? "page" : undefined} data-testid={`tab-${name}`}>
            {name[0].toUpperCase() + name.slice(1)}
          </a>
        ))}
      </nav>

      {view === "design" ? <DesignView study={study} /> : null}
      {view === "sample" ? <SampleView study={study} onCommit={commit} /> : null}
      {view === "analysis" ? <AnalysisView study={study} viewModel={viewModel} /> : null}
      {view === "quality" ? <QualityView viewModel={viewModel} /> : null}
      {view === "delivery" ? <DeliveryView viewModel={viewModel} /> : null}
    </main>
  );
}

function DesignView({ study }: { study: Study }) {
  const design = study.design;
  return (
    <section className="sheet" data-testid="locked-design">
      <h2>Locked design</h2>
      <p>Confirmed at {study.confirmedAt}. This is the protocol the retrieval followed.</p>
      <dl>
        <dt>Decision</dt>
        <dd>{design.decision}</dd>
        <dt>Subjects</dt>
        <dd>{design.subjects.join(", ")}</dd>
        <dt>Stage</dt>
        <dd>{STAGE_LABEL[design.stage]}</dd>
        <dt>Window</dt>
        <dd>
          {design.timeWindow.start} to {design.timeWindow.end}
        </dd>
        <dt>Stopping rule</dt>
        <dd>{design.stoppingRule}</dd>
      </dl>
      <h3>Can answer</h3>
      <ul>
        {design.zhihuCanAnswer.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <h3>Cannot answer</h3>
      <ul>
        {design.zhihuCannotAnswer.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <h3>Queries</h3>
      <ul>
        {design.queries.map((query) => (
          <li key={query}>{query}</li>
        ))}
      </ul>
      <p>
        <a href="/design">Edit the design and run again</a>
      </p>
    </section>
  );
}

function SampleView({ study, onCommit }: { study: Study; onCommit: (study: Study) => void }) {
  return (
    <section data-testid="sample-view">
      <div className="sheet">
        <h2>Sample and sources</h2>
        <p data-testid="in-sample-banner">Counts downstream are in this sample only.</p>
        <p className="meta">
          <span>Hot list scanned {study.hotScan.scanned}</span>
          <span>Hot list included {study.hotScan.included}</span>
          <span>Hot list dropped {study.hotScan.droppedTitles.length}</span>
        </p>
        {study.retrieval.map((entry, index) => (
          <p key={`${entry.kind}-${index}`} className="meta">
            {entry.kind} · {entry.query} · {entry.resultCount} results{entry.error ? ` · ${entry.error}` : ""}
          </p>
        ))}
      </div>
      {study.sample.map((item) => (
        <article key={item.id} className="card" data-testid="sample-item">
          <h3>{item.title}</h3>
          <p className="row">
            <span className={item.included ? "pill ok" : "pill"}>{item.included ? "Included" : "Held out"}</span>
            <span className={item.flags.marketing ? "pill on" : "pill"}>Marketing {item.flags.marketing ? "yes" : "no"}</span>
            <span className={item.flags.duplicate ? "pill on" : "pill"}>Duplicate {item.flags.duplicate ? "yes" : "no"}</span>
            <span className={item.flags.secondhand ? "pill on" : "pill"}>Secondhand {item.flags.secondhand ? "yes" : "no"}</span>
          </p>
          <dl>
            <dt>Why included</dt>
            <dd>{item.whyIncluded}</dd>
            <dt>Query</dt>
            <dd>{item.query}</dd>
            <dt>Published</dt>
            <dd>{item.publishDate}</dd>
            <dt>Scene</dt>
            <dd>{item.sceneLabel}</dd>
            <dt>Role</dt>
            <dd>{ROLE_LABEL[item.role]}</dd>
            <dt>Source</dt>
            <dd>
              {item.source} · <a href={item.url}>{item.url}</a>
            </dd>
          </dl>
          <div className="excerpt">
            <p className="zh">{item.excerptZh}</p>
            <p className="en">{item.excerptEn}</p>
          </div>
          <div className="row">
            {item.included ? (
              <button className="btn danger" type="button" data-testid="exclude-button" onClick={() => onCommit(setIncluded(study, item.id, false))}>
                Exclude
              </button>
            ) : (
              <button className="btn" type="button" data-testid="restore-button" onClick={() => onCommit(setIncluded(study, item.id, true))}>
                Restore
              </button>
            )}
            <label>
              Role
              <select
                value={item.role}
                onChange={(event) => onCommit(relabel(study, item.id, { role: event.target.value as Role }))}
              >
                {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABEL[role]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Scene
              <select
                value={item.sceneId}
                onChange={(event) => onCommit(relabel(study, item.id, { sceneId: event.target.value }))}
              >
                <option value="unassigned">Unassigned</option>
                {study.design.scenes.map((scene) => (
                  <option key={scene.id} value={scene.id}>
                    {scene.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="checks">
            {study.design.codebook.map((code) => (
              <label key={code.id}>
                <input
                  type="checkbox"
                  checked={item.codeIds.includes(code.id)}
                  onChange={(event) => {
                    const codeIds = event.target.checked
                      ? [...item.codeIds, code.id]
                      : item.codeIds.filter((id) => id !== code.id);
                    onCommit(relabel(study, item.id, { codeIds }));
                  }}
                />
                {code.label}
              </label>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function AnalysisView({
  study,
  viewModel,
}: {
  study: Study;
  viewModel: ReturnType<typeof project>;
}) {
  return (
    <section className="sheet" data-testid="analysis-view">
      <h2>Analysis</h2>
      <p data-testid="in-sample-banner">Counts are in this sample only. They are not a market estimate.</p>
      <h3>Codebook</h3>
      {study.design.codebook.map((code) => (
        <article key={code.id} className="card">
          <h3>{code.label}</h3>
          <p>{code.definition}</p>
          <p className="meta">Terms: {code.keywords.join(", ")}</p>
        </article>
      ))}
      <h3>Themes</h3>
      {viewModel.themes.map((theme) => (
        <article key={theme.codeId} className="card" data-testid="theme-row">
          <h3>
            {theme.label}: {theme.count} included {theme.count === 1 ? "item" : "items"}
          </h3>
          <p>{theme.definition}</p>
          <p>Basis: {theme.basis}.</p>
        </article>
      ))}
    </section>
  );
}

function QualityView({ viewModel }: { viewModel: ReturnType<typeof project> }) {
  return (
    <section data-testid="quality-view">
      <div className="honest" data-testid="honest-call">
        <p>{viewModel.honest.canSupport}</p>
        <p>{viewModel.honest.cannotProve}</p>
        <p>Covered scenes: {viewModel.honest.coveredScenes.join(", ") || "none"}.</p>
        <p>Missing scenes: {viewModel.honest.missingScenes.join(", ") || "none"}.</p>
        <p>Covered roles: {viewModel.honest.coveredRoles.join(", ") || "none"}.</p>
        <p>Missing roles: {viewModel.honest.missingRoles.join(", ")}.</p>
        <p>{viewModel.honest.nextMethod}</p>
      </div>
      {viewModel.quality.map((flag) => (
        <article key={`${flag.kind}-${flag.title}`} className="card" data-testid={`quality-${flag.kind}`}>
          <h3>{flag.title}</h3>
          <p>{flag.detail}</p>
          {flag.itemIds.length > 0 ? <p className="meta">Items: {flag.itemIds.join(", ")}</p> : null}
        </article>
      ))}
    </section>
  );
}

function DeliveryView({ viewModel }: { viewModel: ReturnType<typeof project> }) {
  return (
    <section data-testid="delivery-view">
      <div className="honest" data-testid="honest-call">
        <p>{viewModel.honest.canSupport}</p>
        <p>{viewModel.honest.cannotProve}</p>
        <p>{viewModel.honest.nextMethod}</p>
      </div>
      <article className="sheet report" data-testid="report">
        {viewModel.report}
      </article>
      <section className="sheet">
        <h2>China-internet context</h2>
        <p>{viewModel.chinaContext}</p>
      </section>
      <section className="sheet">
        <h2>Bilingual excerpts</h2>
        {viewModel.excerpts.map((excerpt) => (
          <article key={excerpt.itemId} className="card excerpt" data-testid="excerpt">
            <h3>{excerpt.title}</h3>
            <p className="meta">
              {excerpt.date} · {excerpt.scene}
            </p>
            <p className="zh">{excerpt.zh}</p>
            <p className="en">{excerpt.en}</p>
            <p>
              <a href={excerpt.url}>{excerpt.url}</a>
            </p>
          </article>
        ))}
      </section>
    </section>
  );
}

export default function WorkbenchPage() {
  return (
    <Suspense fallback={<p>Loading the workbench.</p>}>
      <Workbench />
    </Suspense>
  );
}
