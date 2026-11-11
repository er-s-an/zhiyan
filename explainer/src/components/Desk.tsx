import type {ReactNode} from "react";
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from "remotion";
import {CINNABAR, FONT, INK, MUTED, PAPER, PINE} from "../theme";

export const Desk = ({
  beat,
  children,
}: {
  readonly beat: string;
  readonly children: ReactNode;
}) => {
  const frame = useCurrentFrame();
  const drift = -8 + frame * 0.012;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: PAPER,
        color: INK,
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            "radial-gradient(circle at 8% 0%, rgba(255,252,246,0.85), transparent 34%)",
        }}
      />
      <Header />
      {children}
      <div
        style={{
          position: "absolute",
          left: 88,
          bottom: 36,
          fontSize: 30,
          fontWeight: 700,
          color: PINE,
        }}
      >
        {beat}
      </div>
      <div
        style={{
          position: "absolute",
          right: 86,
          bottom: 78,
          width: 108,
          height: 108,
          borderRadius: "50%",
          border: `6px solid ${CINNABAR}`,
          color: CINNABAR,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 30,
          fontWeight: 700,
          backgroundColor: "rgba(231,225,212,0.94)",
          rotate: `${drift * 0.6}deg`,
        }}
      >
        知研
      </div>
    </AbsoluteFill>
  );
};

const Header = () => {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: 110,
        backgroundColor: PAPER,
        zIndex: 4,
      }}
    >
      <div style={{position: "absolute", left: 0, right: 0, top: 0, height: 10, backgroundColor: CINNABAR}} />
      <div
        style={{
          position: "absolute",
          left: 88,
          right: 88,
          top: 36,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div style={{fontSize: 34, fontWeight: 700}}>知研台</div>
        <div style={{fontSize: 28, color: MUTED}}>Zhiyan · 研究从决策开始</div>
      </div>
    </div>
  );
};

export const PersistentHeader = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const dot = interpolateSafe(frame, durationInFrames, 120, 1760);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: 110,
        backgroundColor: PAPER,
        zIndex: 8,
        fontFamily: FONT,
        color: INK,
      }}
    >
      <div style={{position: "absolute", left: 0, right: 0, top: 0, height: 10, backgroundColor: CINNABAR}} />
      <div
        style={{
          position: "absolute",
          left: 88,
          right: 88,
          top: 36,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div style={{fontSize: 34, fontWeight: 700}}>知研台</div>
        <div style={{fontSize: 28, color: MUTED}}>Zhiyan · 研究从决策开始</div>
      </div>
      <div
        style={{
          position: "absolute",
          left: dot,
          bottom: 14,
          width: 18,
          height: 6,
          borderRadius: 3,
          backgroundColor: PINE,
        }}
      />
    </div>
  );
};

const interpolateSafe = (
  frame: number,
  durationInFrames: number,
  from = -6,
  to = 8,
) => {
  const end = Math.max(1, durationInFrames - 1);
  const t = Math.min(frame, end);
  return from + (to - from) * (t / end);
};
