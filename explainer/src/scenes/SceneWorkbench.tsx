import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {Desk} from "../components/Desk";
import {easeOut, enter} from "../motion";
import {CINNABAR, INK, MUTED, PAPER, PAPER_CARD, PINE, RULE} from "../theme";

const views = ["设计", "样本", "分析", "质量", "交付"];

const rows = [
  {
    reason: "与决策直接相关",
    query: "来自简报的查询",
    date: "发布日期",
    scene: "场景标签",
    marks: "—",
  },
  {
    reason: "同题再次出现",
    query: "另一条查询",
    date: "发布日期",
    scene: "场景标签",
    marks: "重复",
  },
  {
    reason: "口吻像推广",
    query: "另一条查询",
    date: "发布日期",
    scene: "场景标签",
    marks: "营销 · 二手",
  },
];

export const SceneWorkbench = () => {
  const frame = useCurrentFrame();
  const clamp = {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
    easing: easeOut,
  };
  const tabX = interpolate(frame, [24, 70], [0, 196], clamp);
  const excluded = interpolate(frame, [430, 460], [0, 1], clamp);

  return (
    <Desk beat="五个视图连在一起">
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: 88,
            top: 128,
            fontSize: 64,
            fontWeight: 700,
            ...enter(frame, 0, 0, 16),
          }}
        >
          工作台五个视图
        </div>
        <div
          style={{
            position: "absolute",
            left: 88,
            top: 214,
            ...enter(frame, 12, 0, 12),
          }}
        >
          <div style={{position: "relative", display: "flex", gap: 8}}>
            {views.map((view, index) => (
              <div
                key={view}
                style={{
                  width: 188,
                  height: 72,
                  borderRadius: 14,
                  backgroundColor: index === 1 ? PINE : PAPER_CARD,
                  color: index === 1 ? PAPER : INK,
                  border: `1px solid ${index === 1 ? PINE : RULE}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 36,
                  fontWeight: 700,
                }}
              >
                {view}
              </div>
            ))}
            <div
              style={{
                position: "absolute",
                left: tabX,
                bottom: -8,
                width: 188,
                height: 6,
                borderRadius: 3,
                backgroundColor: CINNABAR,
              }}
            />
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 88,
            top: 312,
            width: 1500,
            fontSize: 36,
            lineHeight: 1.35,
            ...enter(frame, 40, 0, 12),
          }}
        >
          样本里每一条都有纳入理由、查询、发布日期、场景，以及营销、重复、二手标记。下面是结构示意，不是真实帖子。
        </div>

        <div
          style={{
            position: "absolute",
            left: 88,
            top: 430,
            width: 1500,
            ...enter(frame, 70, 0, 20),
          }}
        >
          <Row header reason="纳入理由" query="查询" date="发布日期" scene="场景" marks="标记" dim={0} />
          {rows.map((row, index) => (
            <Row
              key={row.reason}
              reason={row.reason}
              query={row.query}
              date={row.date}
              scene={row.scene}
              marks={row.marks}
              dim={index === 1 ? excluded : 0}
              strike={index === 1 ? excluded : 0}
            />
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            left: 88,
            top: 780,
            display: "flex",
            gap: 16,
            alignItems: "center",
            ...enter(frame, 180, 0, 12),
          }}
        >
          {["排除", "恢复", "改标签"].map((action) => (
            <div
              key={action}
              style={{
                height: 64,
                padding: "0 22px",
                borderRadius: 12,
                border: `2px solid ${action === "排除" ? CINNABAR : RULE}`,
                backgroundColor: action === "排除" && excluded > 0.5 ? CINNABAR : PAPER_CARD,
                color: action === "排除" && excluded > 0.5 ? PAPER : INK,
                display: "flex",
                alignItems: "center",
                fontSize: 32,
                fontWeight: 700,
              }}
            >
              {action}
            </div>
          ))}
          <div style={{fontSize: 36, marginLeft: 12, maxWidth: 760, lineHeight: 1.3}}>
            排除、恢复或改标签后，分析和报告一起变。
          </div>
        </div>

        <SyncCard frame={frame} top={430} label="分析" excluded={excluded} />
        <SyncCard frame={frame} top={600} label="报告" excluded={excluded} />
      </AbsoluteFill>
    </Desk>
  );
};

const Row = ({
  reason,
  query,
  date,
  scene,
  marks,
  header = false,
  dim = 0,
  strike = 0,
}: {
  readonly reason: string;
  readonly query: string;
  readonly date: string;
  readonly scene: string;
  readonly marks: string;
  readonly header?: boolean;
  readonly dim?: number;
  readonly strike?: number;
}) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.3fr 1.15fr 0.8fr 0.8fr 0.9fr",
        gap: 12,
        alignItems: "center",
        height: 72,
        borderBottom: `1px solid ${RULE}`,
        fontSize: header ? 28 : 30,
        fontWeight: header ? 700 : 400,
        color: header ? MUTED : INK,
        opacity: 1 - dim * 0.45,
        translate: `0px ${dim * 10}px`,
        position: "relative",
      }}
    >
      <span>{reason}</span>
      <span>{query}</span>
      <span>{date}</span>
      <span>{scene}</span>
      <span style={{color: marks === "—" ? MUTED : CINNABAR, fontWeight: 700}}>{marks}</span>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 40,
          top: "50%",
          height: 3,
          backgroundColor: CINNABAR,
          transformOrigin: "left center",
          scale: `${strike} 1`,
        }}
      />
    </div>
  );
};

const SyncCard = ({
  frame,
  top,
  label,
  excluded,
}: {
  readonly frame: number;
  readonly top: number;
  readonly label: string;
  readonly excluded: number;
}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: 1620,
        top,
        width: 210,
        height: 140,
        borderRadius: 18,
        backgroundColor: excluded > 0.6 ? PINE : PAPER_CARD,
        color: excluded > 0.6 ? PAPER : INK,
        border: `1px solid ${excluded > 0.6 ? PINE : RULE}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "0 20px",
        boxSizing: "border-box",
        ...enter(frame, 120, 30, 0),
        translate: `${(1 - excluded) * 16}px 0px`,
      }}
    >
      <div style={{fontSize: 32, fontWeight: 700}}>{label}</div>
      <div style={{fontSize: 26, marginTop: 8}}>{excluded > 0.6 ? "已一起更新" : "随样本"}</div>
    </div>
  );
};
