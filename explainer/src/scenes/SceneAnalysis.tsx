import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {Desk} from "../components/Desk";
import {easeOut, enter} from "../motion";
import {CINNABAR, PAPER, PAPER_CARD, PINE, RULE} from "../theme";

const codes = ["场景", "角色", "限制"];

export const SceneAnalysis = () => {
  const frame = useCurrentFrame();
  const clamp = {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
    easing: easeOut,
  };
  return (
    <Desk beat="发现要回到样本">
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
          编码本、主题、计数
        </div>

        <div
          style={{
            position: "absolute",
            left: 88,
            top: 250,
            width: 760,
            height: 390,
            borderRadius: 22,
            backgroundColor: PAPER_CARD,
            border: `1px solid ${RULE}`,
            boxSizing: "border-box",
            padding: "28px 32px",
            ...enter(frame, 16, -30, 0),
          }}
        >
          <div style={{fontSize: 32, color: PINE, fontWeight: 700}}>编码本</div>
          {codes.map((code, index) => (
            <div
              key={code}
              style={{
                marginTop: 18,
                fontSize: 42,
                fontWeight: 700,
                ...enter(frame, 40 + index * 16, 20, 0),
              }}
            >
              {code}
            </div>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            left: 880,
            top: 250,
            width: 500,
            height: 390,
            borderRadius: 22,
            backgroundColor: PINE,
            color: PAPER,
            boxSizing: "border-box",
            padding: "28px 32px",
            ...enter(frame, 36, 30, 0),
          }}
        >
          <div style={{fontSize: 32}}>主题</div>
          <div style={{fontSize: 40, fontWeight: 700, marginTop: 20, lineHeight: 1.35}}>
            由编码归并。
            <br />
            不由单帖决定。
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: interpolate(frame, [70, 160, 250, 360], [430, 1460, 1460, 150], clamp),
            top: interpolate(frame, [70, 160, 250, 360], [500, 430, 430, 508], clamp),
            width: 250,
            height: 120,
            borderRadius: 16,
            backgroundColor: PAPER,
            border: `3px solid ${CINNABAR}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            fontWeight: 700,
            opacity: interpolate(frame, [60, 80], [0, 1], clamp),
          }}
        >
          单条帖子
        </div>

        <div
          style={{
            position: "absolute",
            left: 1420,
            top: 250,
            width: 400,
            ...enter(frame, 80, 20, 0),
          }}
        >
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: CINNABAR,
              textDecoration: "line-through",
              textDecorationThickness: 4,
            }}
          >
            市场份额
          </div>
          <div
            style={{
              marginTop: 16,
              fontSize: 40,
              fontWeight: 700,
              color: CINNABAR,
              textDecoration: "line-through",
              textDecorationThickness: 4,
            }}
          >
            全国推算
          </div>
          <div
            style={{
              marginTop: 28,
              width: 360,
              borderRadius: 18,
              backgroundColor: PAPER_CARD,
              border: `3px solid ${PINE}`,
              padding: "18px 20px",
              fontSize: 36,
              fontWeight: 700,
              lineHeight: 1.3,
              opacity: 1,
            }}
          >
            发现？
            <div style={{fontSize: 26, fontWeight: 400, marginTop: 6}}>单帖到不了这里</div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 88,
            top: 680,
            width: 1500,
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1.35,
            ...enter(frame, 200, 0, 16),
          }}
        >
          计数写明「只在这个样本里」。
          <div style={{fontWeight: 400, marginTop: 8}}>不是市场份额，也不是全国推算。</div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 88,
            top: 830,
            width: 1500,
            fontSize: 40,
            lineHeight: 1.35,
            ...enter(frame, 250, 0, 16),
          }}
        >
          一条帖子不能单独成为发现。发现要回到样本和编码过程。
        </div>
      </AbsoluteFill>
    </Desk>
  );
};
