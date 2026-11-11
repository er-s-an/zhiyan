import {AbsoluteFill, useCurrentFrame} from "remotion";
import {Desk} from "../components/Desk";
import {enter} from "../motion";
import {CINNABAR, INK, PAPER_CARD, PINE, RULE} from "../theme";

const locks = ["知乎搜索", "热榜", "直答"];

export const SceneDesign = () => {
  const frame = useCurrentFrame();

  return (
    <Desk beat="确认之前不检索">
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: 88,
            top: 132,
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.1,
            ...enter(frame, 0, 0, 20),
          }}
        >
          先设计，再检索
        </div>
        <div
          style={{
            position: "absolute",
            left: 88,
            top: 236,
            width: 1680,
            fontSize: 42,
            lineHeight: 1.35,
            ...enter(frame, 16, 0, 16),
          }}
        >
          研究设计可以改。人确认之前，知乎搜索、热榜、直答都不调用。
        </div>

        <div
          style={{
            position: "absolute",
            left: 88,
            top: 320,
            display: "flex",
            gap: 18,
            ...enter(frame, 36, 0, 16),
          }}
        >
          {locks.map((name) => (
            <div
              key={name}
              style={{
                minWidth: 220,
                height: 72,
                borderRadius: 14,
                border: `2px solid ${CINNABAR}`,
                color: CINNABAR,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                fontSize: 34,
                fontWeight: 700,
                backgroundColor: PAPER_CARD,
                padding: "0 22px",
              }}
            >
              <span>未调用</span>
              <span style={{color: INK}}>{name}</span>
            </div>
          ))}
        </div>

        <Card frame={frame} start={70} x={88} y={412} w={840} h={118} kicker="决策" text="要支持的决策" />
        <Card
          frame={frame}
          start={86}
          x={948}
          y={412}
          w={840}
          h={118}
          kicker="对象"
          text="使用者、购买者，还是从业者"
        />
        <Card
          frame={frame}
          start={110}
          x={88}
          y={546}
          w={1700}
          h={112}
          kicker="阶段"
          text="需求探索。即使问题提到购买，这一次仍是需求探索。"
          tone="pine"
        />
        <Card
          frame={frame}
          start={140}
          x={88}
          y={674}
          w={1700}
          h={104}
          kicker="边界"
          text="现有知乎讨论能回答什么、不能回答什么"
        />
        <Card frame={frame} start={170} x={88} y={794} w={540} h={100} kicker="范围" text="场景、人群、时间窗" />
        <Card frame={frame} start={186} x={648} y={794} w={520} h={100} kicker="样本" text="纳入和排除" />
        <Card frame={frame} start={202} x={1188} y={794} w={500} h={100} kicker="停止" text="停止规则" />
      </AbsoluteFill>
    </Desk>
  );
};

const Card = ({
  frame,
  start,
  x,
  y,
  w,
  h,
  kicker,
  text,
  tone = "ink",
}: {
  readonly frame: number;
  readonly start: number;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly kicker: string;
  readonly text: string;
  readonly tone?: "ink" | "pine";
}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 18,
        backgroundColor: tone === "pine" ? PINE : PAPER_CARD,
        color: tone === "pine" ? "#f6f1e6" : INK,
        border: tone === "pine" ? "none" : `1px solid ${RULE}`,
        boxSizing: "border-box",
        padding: "16px 24px",
        ...enter(frame, start, start % 2 === 0 ? 36 : -36, 12),
      }}
    >
      <div style={{fontSize: 22, fontWeight: 700, opacity: 0.8}}>{kicker}</div>
      <div style={{fontSize: 36, fontWeight: 700, marginTop: 4, lineHeight: 1.2}}>{text}</div>
    </div>
  );
};
