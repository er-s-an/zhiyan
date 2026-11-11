import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {Desk} from "../components/Desk";
import {easeOut, enter} from "../motion";
import {BRIEF, CINNABAR, INK, MUTED, PAPER_CARD, PINE, RULE} from "../theme";

export const SceneBrief = () => {
  const frame = useCurrentFrame();
  const clamp = {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
    easing: easeOut,
  };
  const typed = Math.max(0, Math.min(BRIEF.length, Math.floor((frame - 150) / 2)));
  const shown = BRIEF.slice(0, typed);
  const caretOn = typed < BRIEF.length && Math.floor(frame / 8) % 2 === 0;

  return (
    <Desk beat="提交的是决策">
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: 88,
            top: 140,
            width: 1500,
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.18,
            ...enter(frame, 0, 0, 24),
          }}
        >
          用户提交的是商业决策，
          <br />
          不是搜索词。
        </div>

        <div
          style={{
            position: "absolute",
            left: 88,
            top: 380,
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 40,
            color: MUTED,
            opacity: interpolate(frame, [24, 40, 90, 120], [0, 1, 1, 0], clamp),
            translate: interpolate(frame, [24, 46, 90, 130], ["0px 16px", "0px 0px", "0px 0px", "-40px -20px"], clamp),
          }}
        >
          <span
            style={{
              border: `2px solid ${RULE}`,
              backgroundColor: PAPER_CARD,
              borderRadius: 999,
              padding: "12px 28px",
              color: INK,
              position: "relative",
            }}
          >
            搜索词 · 智能喂食器
            <span
              style={{
                position: "absolute",
                left: 16,
                right: 16,
                top: "50%",
                height: 4,
                backgroundColor: CINNABAR,
                transformOrigin: "left center",
                scale: interpolate(frame, [50, 78], ["0 1", "1 1"], clamp),
              }}
            />
          </span>
          <span>先放下</span>
        </div>

        <div
          style={{
            position: "absolute",
            left: 88,
            top: 400,
            width: 1640,
            minHeight: 420,
            borderRadius: 28,
            backgroundColor: PAPER_CARD,
            border: `1px solid ${RULE}`,
            boxSizing: "border-box",
            padding: "36px 48px 48px",
            opacity: interpolate(frame, [110, 136], [0, 1], clamp),
            translate: interpolate(frame, [110, 146], ["0px 70px", "0px 0px"], clamp),
          }}
        >
          <div style={{fontSize: 32, fontWeight: 700, color: PINE}}>决策简报</div>
          <div style={{marginTop: 28, fontSize: 48, lineHeight: 1.5, minHeight: 220}}>
            {shown}
            <span style={{color: CINNABAR, opacity: caretOn ? 1 : 0}}>|</span>
          </div>
        </div>
      </AbsoluteFill>
    </Desk>
  );
};
