import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {Desk} from "../components/Desk";
import {easeOut, enter} from "../motion";
import {CINNABAR, INK, PAPER_CARD, PINE, RULE} from "../theme";

const docs = [
  {title: "英文报告", note: "给团队交接", x: 88, start: 12},
  {title: "中英对照摘录", note: "原文和译文放在一起", x: 668, start: 28},
  {title: "中国互联网语境", note: "搜索结果要怎么读", x: 1248, start: 44},
];

export const SceneClose = () => {
  const frame = useCurrentFrame();
  const clamp = {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
    easing: easeOut,
  };
  const gather = interpolate(frame, [20, 80], [46, 0], clamp);

  return (
    <Desk beat="这次做到交付为止">
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: 88,
            top: 132,
            fontSize: 68,
            fontWeight: 700,
            ...enter(frame, 0, 0, 16),
          }}
        >
          收成可以交接的研究
        </div>

        {docs.map((doc, index) => (
          <div
            key={doc.title}
            style={{
              position: "absolute",
              left: doc.x,
              top: 250,
              width: 540,
              height: 210,
              borderRadius: 22,
              backgroundColor: index === 2 ? PINE : PAPER_CARD,
              color: index === 2 ? "#f6f1e6" : INK,
              border: index === 2 ? "none" : `1px solid ${RULE}`,
              boxSizing: "border-box",
              padding: "28px 28px",
              opacity: interpolate(frame, [doc.start, doc.start + 16], [0, 1], clamp),
              translate: interpolate(
                frame,
                [doc.start, doc.start + 28],
                [`${(index - 1) * gather}px 30px`, "0px 0px"],
                clamp,
              ),
            }}
          >
            <div style={{fontSize: 40, fontWeight: 700}}>{doc.title}</div>
            <div style={{marginTop: 16, fontSize: 32, lineHeight: 1.35}}>{doc.note}</div>
          </div>
        ))}

        <div
          style={{
            position: "absolute",
            left: 88,
            top: 500,
            width: 1680,
            fontSize: 42,
            lineHeight: 1.4,
            ...enter(frame, 90, 0, 18),
          }}
        >
          高赞不是概率样本。
          <br />
          营销号和真实使用者，会出现在同一次搜索里。
        </div>

        <div
          style={{
            position: "absolute",
            left: 88,
            top: 680,
            fontSize: 36,
            fontWeight: 700,
            color: PINE,
            ...enter(frame, 180, 0, 12),
          }}
        >
          下面两段，这次都不做。
        </div>

        <Folder
          frame={frame}
          start={210}
          y={750}
          label="第二阶段 · 沉淀研究资产 · 这次不做"
        />
        <Folder
          frame={frame}
          start={236}
          y={850}
          label="第三阶段 · 邀请答主做付费自愿授权研究 · 这次不做"
        />
      </AbsoluteFill>
    </Desk>
  );
};

const Folder = ({
  frame,
  start,
  y,
  label,
}: {
  readonly frame: number;
  readonly start: number;
  readonly y: number;
  readonly label: string;
}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: 88,
        top: y,
        height: 78,
        maxWidth: 1560,
        padding: "0 28px",
        borderRadius: 14,
        backgroundColor: PAPER_CARD,
        border: `2px dashed ${CINNABAR}`,
        color: INK,
        display: "flex",
        alignItems: "center",
        fontSize: 34,
        fontWeight: 700,
        ...enter(frame, start, 40, 0),
      }}
    >
      {label}
    </div>
  );
};
