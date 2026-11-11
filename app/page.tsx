"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FEEDER_BRIEF_EN, FEEDER_BRIEF_ZH } from "../lib/examples";
import { saveDraft } from "../lib/storage";
import type { ResearchDesign } from "../lib/types";

export default function HomePage() {
  const router = useRouter();
  const [brief, setBrief] = useState(FEEDER_BRIEF_ZH);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function compile() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const body = (await response.json()) as { design?: ResearchDesign; error?: string; zhihuCalls?: number };
      if (!response.ok || !body.design) {
        setError(body.error || "The design could not be compiled.");
        return;
      }
      if (body.zhihuCalls !== 0) {
        setError("Retrieval started before confirmation. Stopped.");
        return;
      }
      saveDraft({ design: body.design, study: null });
      router.push("/design");
    } catch {
      setError("The design request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <p className="kicker">Method compiler</p>
      <h1>Hand over the decision.</h1>
      <p className="lede">
        Write the business decision in English or Chinese. Zhiyan compiles a research design. Nothing is retrieved from Zhihu until you confirm that design.
      </p>
      <section className="sheet">
        <div className="grid">
          <label>
            Research brief
            <textarea
              className="brief"
              data-testid="brief-input"
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
            />
          </label>
          <div className="row">
            <button className="btn quiet" type="button" onClick={() => setBrief(FEEDER_BRIEF_ZH)}>
              Multi-cat feeder, Chinese
            </button>
            <button className="btn quiet" type="button" onClick={() => setBrief(FEEDER_BRIEF_EN)}>
              Multi-cat feeder, English
            </button>
          </div>
          <div className="row">
            <button className="btn primary" type="button" data-testid="compile-button" disabled={busy} onClick={compile}>
              {busy ? "Compiling the design" : "Compile research design"}
            </button>
            <span data-testid="pre-retrieval">Zhihu calls so far: 0</span>
          </div>
          {error ? (
            <p className="error" data-testid="form-error">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
