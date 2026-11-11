import {AbsoluteFill, useCurrentFrame} from "remotion";
import {Desk} from "../components/Desk";
import {enter} from "../motion";
import {CINNABAR, EN_NEEDS, EN_NOT, INK, PAPER_CARD, PINE, RULE, ZH_QUALITY} from "../theme";

export const SceneQuality = () => {
  const frame = useCurrentFrame();

  return (
    <Desk beat="质量与交付">
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
          质量与交付
        </div>

        <div
          style={{
            position: "absolute",
            left: 88,
            top: 220,
            width: 1740,
            borderRadius: 22,
            backgroundColor: PAPER_CARD,
            border: `1px solid ${RULE}`,
            boxSizing: "border-box",
            padding: "22px 32px 26px 28px",
            display: "flex",
            gap: 22,
            ...enter(frame, 16, -20, 0),
          }}
        >
          <div style={{width: 10, borderRadius: 6, backgroundColor: CINNABAR}} />
          <div>
            <div style={{fontSize: 28, fontWeight: 700, color: CINNABAR}}>英文原句</div>
            <div style={{marginTop: 10, fontSize: 44, lineHeight: 1.35, color: INK}}>{EN_NEEDS}</div>
            <div style={{marginTop: 8, fontSize: 44, lineHeight: 1.35, color: INK}}>{EN_NOT}</div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 88,
            top: 460,
            width: 1740,
            borderRadius: 22,
            backgroundColor: PINE,
            color: "#f6f1e6",
            boxSizing: "border-box",
            padding: "26px 36px",
            ...enter(frame, 50, 24, 0),
          }}
        >
          <div style={{fontSize: 28, fontWeight: 700}}>中文说明</div>
          <div style={{marginTop: 12, fontSize: 44, lineHeight: 1.4}}>{ZH_QUALITY}</div>
        </div>

        <Note frame={frame} start={140} x={88} title="覆盖" text="写明覆盖了哪些场景和角色。" />
        <Note
          frame={frame}
          start={160}
          x={656}
          title="还缺"
          text="购买意愿与宣称是否成立，材料证明不了。"
        />
        <Note frame={frame} start={180} x={1224} title="下一步" text="概念测试，或定向访谈。" />
      </AbsoluteFill>
    </Desk>
  );
};

const Note = ({
  frame,
  start,
  x,
  title,
  text,
}: {
  readonly frame: number;
  readonly start: number;
  readonly x: number;
  readonly title: string;
  readonly text: string;
}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: 720,
        width: 548,
        height: 168,
        borderRadius: 20,
        backgroundColor: PAPER_CARD,
        border: `1px solid ${RULE}`,
        boxSizing: "border-box",
        padding: "22px 24px",
        ...enter(frame, start, 0, 24),
      }}
    >
      <div style={{fontSize: 32, fontWeight: 700, color: PINE}}>{title}</div>
      <div style={{marginTop: 10, fontSize: 34, lineHeight: 1.35, color: INK}}>{text}</div>
    </div>
  );
};
