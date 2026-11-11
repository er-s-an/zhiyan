import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {Desk} from "../components/Desk";
import {easeOut, enter} from "../motion";
import {CINNABAR, INK, PAPER_CARD, PINE, RULE} from "../theme";

const scraps = [
  {label: "体验", x: 1120, y: 150, start: 18},
  {label: "对比", x: 1360, y: 250, start: 32},
  {label: "吐槽", x: 1100, y: 360, start: 46},
  {label: "推荐", x: 1380, y: 460, start: 60},
];

export const SceneDiscuss = () => {
  const frame = useCurrentFrame();
  const clamp = {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
    easing: easeOut,
  };

  return (
    <Desk beat="讨论还不是研究">
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: 88,
            top: 142,
            width: 940,
            ...enter(frame, 0, -24, 16),
          }}
        >
          <div style={{fontSize: 32, fontWeight: 700, color: PINE}}>知乎上</div>
          <div style={{fontSize: 84, fontWeight: 700, lineHeight: 1.12, marginTop: 8}}>
            人们在讨论产品
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 88,
            top: 360,
            width: 940,
            fontSize: 46,
            lineHeight: 1.45,
            ...enter(frame, 28, 0, 24),
          }}
        >
          全球团队如果只用搜索框读帖，得到的是观点，不是可以交接的研究。
        </div>
        <div
          style={{
            position: "absolute",
            left: 88,
            top: 620,
            width: 940,
            fontSize: 46,
            lineHeight: 1.4,
            fontWeight: 700,
            color: PINE,
            ...enter(frame, 400, 0, 28),
          }}
        >
          知研台把知乎变成研究的起点。
          <div style={{fontWeight: 400, color: INK, marginTop: 12}}>
            知乎是数据基础，不是产品本身。
          </div>
        </div>

        {scraps.map((scrap) => {
          const gatherX = 1240 - scrap.x;
          const gatherY = 700 - scrap.y;
          return (
            <div
              key={scrap.label}
              style={{
                position: "absolute",
                left: scrap.x,
                top: scrap.y,
                width: 280,
                height: 88,
                borderRadius: 16,
                backgroundColor: PAPER_CARD,
                border: `1px solid ${RULE}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 40,
                fontWeight: 700,
                opacity: interpolate(frame, [scrap.start, scrap.start + 12, 300, 360], [0, 1, 1, 0], clamp),
                translate: interpolate(
                  frame,
                  [scrap.start, scrap.start + 20, 230, 340],
                  ["20px 16px", "0px 0px", "0px 0px", `${gatherX}px ${gatherY}px`],
                  clamp,
                ),
                scale: interpolate(frame, [230, 340], [1, 0.7], {
                  ...clamp,
                  output: "perceptual-scale",
                }),
              }}
            >
              {scrap.label}
            </div>
          );
        })}

        <div
          style={{
            position: "absolute",
            left: 1100,
            top: 680,
            width: 700,
            height: 110,
            borderRadius: 18,
            border: `2px solid ${INK}`,
            backgroundColor: PAPER_CARD,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            boxSizing: "border-box",
            fontSize: 36,
            opacity: interpolate(frame, [70, 90, 360, 420], [0, 1, 1, 0], clamp),
            translate: interpolate(frame, [70, 96], ["0px 30px", "0px 0px"], clamp),
          }}
        >
          <span>搜索框</span>
          <span
            style={{
              color: CINNABAR,
              fontWeight: 700,
              fontSize: 40,
              opacity: interpolate(frame, [200, 220], [0, 1], clamp),
              scale: interpolate(frame, [200, 226], [0.8, 1], {
                ...clamp,
                output: "perceptual-scale",
              }),
            }}
          >
            观点
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            left: 1100,
            top: 250,
            width: 700,
            height: 460,
            borderRadius: 24,
            backgroundColor: PINE,
            color: PAPER_CARD,
            padding: "48px 44px",
            boxSizing: "border-box",
            opacity: interpolate(frame, [380, 410], [0, 1], clamp),
            translate: interpolate(frame, [380, 420], ["80px 0px", "0px 0px"], clamp),
          }}
        >
          <div style={{fontSize: 32, letterSpacing: 1}}>起点</div>
          <div style={{fontSize: 80, fontWeight: 700, marginTop: 16, lineHeight: 1.1}}>知研台</div>
          <div style={{fontSize: 40, marginTop: 36, lineHeight: 1.45}}>
            把知乎上的讨论，收成可以交接的研究。
          </div>
        </div>
      </AbsoluteFill>
    </Desk>
  );
};
