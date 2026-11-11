import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {Desk} from "../components/Desk";
import {easeOut, enter} from "../motion";
import {CINNABAR, INK, PAPER, PAPER_CARD, PINE, RULE} from "../theme";

export const SceneExecute = () => {
  const frame = useCurrentFrame();
  const clamp = {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
    easing: easeOut,
  };

  return (
    <Desk beat="确认之后才执行">
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: 88,
            top: 140,
            fontSize: 80,
            fontWeight: 700,
            ...enter(frame, 0, 0, 20),
          }}
        >
          确认之后，才执行
        </div>
        <div
          style={{
            position: "absolute",
            right: 230,
            top: 146,
            width: 180,
            height: 180,
            borderRadius: "50%",
            border: `8px solid ${CINNABAR}`,
            color: CINNABAR,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
            fontWeight: 700,
            rotate: interpolate(frame, [8, 28], ["-16deg", "-8deg"], clamp),
            scale: interpolate(frame, [8, 30], [1.4, 1], {
              ...clamp,
              output: "perceptual-scale",
            }),
            opacity: interpolate(frame, [8, 20], [0, 1], clamp),
            backgroundColor: PAPER,
          }}
        >
          已确认
        </div>

        <Lane
          frame={frame}
          start={40}
          x={88}
          title="知乎搜索"
          role="承重"
          note="召回讨论"
          strong
          grow
        />
        <Lane
          frame={frame}
          start={58}
          x={656}
          title="热榜"
          role="承重"
          note="看见正在热的题"
          strong
          grow
        />
        <Lane
          frame={frame}
          start={80}
          x={1224}
          title="直答"
          role="只提示"
          note="可能漏掉的场景"
          strong={false}
          grow={false}
        />

        <div
          style={{
            position: "absolute",
            left: 88,
            top: 760,
            width: 1280,
            fontSize: 42,
            lineHeight: 1.35,
            ...enter(frame, 140, 0, 20),
          }}
        >
          直答不能成为综合答案。
        </div>
        <div
          style={{
            position: "absolute",
            left: 88,
            top: 840,
            height: 84,
            padding: "0 32px",
            borderRadius: 16,
            border: `3px solid ${CINNABAR}`,
            color: CINNABAR,
            display: "flex",
            alignItems: "center",
            fontSize: 42,
            fontWeight: 700,
            backgroundColor: PAPER_CARD,
            ...enter(frame, 170, 24, 0),
          }}
        >
          不自动发帖
        </div>
      </AbsoluteFill>
    </Desk>
  );
};

const Lane = ({
  frame,
  start,
  x,
  title,
  role,
  note,
  strong,
  grow,
}: {
  readonly frame: number;
  readonly start: number;
  readonly x: number;
  readonly title: string;
  readonly role: string;
  readonly note: string;
  readonly strong: boolean;
  readonly grow: boolean;
}) => {
  const clamp = {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
    easing: easeOut,
  };
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: 360,
        width: 540,
        height: 360,
        borderRadius: 24,
        backgroundColor: strong ? PINE : PAPER_CARD,
        color: strong ? PAPER_CARD : INK,
        border: strong ? "none" : `3px solid ${CINNABAR}`,
        boxSizing: "border-box",
        padding: "32px 32px",
        ...enter(frame, start, 0, 40),
      }}
    >
      <div style={{fontSize: 36}}>{title}</div>
      <div style={{fontSize: 72, fontWeight: 700, marginTop: 16}}>{role}</div>
      <div style={{fontSize: 32, marginTop: 12, lineHeight: 1.35}}>{note}</div>
      <div
        style={{
          marginTop: 28,
          height: 16,
          borderRadius: 8,
          backgroundColor: strong ? "rgba(246,241,230,0.25)" : RULE,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: grow ? "100%" : "34%",
            backgroundColor: strong ? PAPER_CARD : CINNABAR,
            transformOrigin: "left center",
            scale: interpolate(frame, [start + 20, start + 50], ["0 1", "1 1"], clamp),
          }}
        />
      </div>
    </div>
  );
};
