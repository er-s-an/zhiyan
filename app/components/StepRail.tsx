const STEPS = ["研究简报", "研究设计", "检索与样本", "分析与交付"];

export function StepRail({ current }: { current: number }) {
  return (
    <div className="step-rail" aria-label="研究进度">
      {STEPS.map((label, index) => {
        const state = index < current ? "is-done" : index === current ? "is-active" : "";
        return (
          <div key={label} style={{ display: "contents" }}>
            {index > 0 ? <span className="step-rail-sep" aria-hidden="true" /> : null}
            <span className={`step-rail-item ${state}`} aria-current={index === current ? "step" : undefined}>
              <span className="dot">{index < current ? "✓" : index + 1}</span>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
