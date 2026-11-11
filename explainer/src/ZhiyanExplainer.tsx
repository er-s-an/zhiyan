import {AbsoluteFill, useVideoConfig} from "remotion";
import {linearTiming, TransitionSeries} from "@remotion/transitions";
import {slide} from "@remotion/transitions/slide";
import {PersistentHeader} from "./components/Desk";
import {SceneAnalysis} from "./scenes/SceneAnalysis";
import {SceneBrief} from "./scenes/SceneBrief";
import {SceneClose} from "./scenes/SceneClose";
import {SceneDesign} from "./scenes/SceneDesign";
import {SceneDiscuss} from "./scenes/SceneDiscuss";
import {SceneExecute} from "./scenes/SceneExecute";
import {SceneQuality} from "./scenes/SceneQuality";
import {SceneWorkbench} from "./scenes/SceneWorkbench";
import {PAPER} from "./theme";

// 660+720+900+600+780+660+840+640 - 7*20 = 5660 frames = 188.67s
export const ZhiyanExplainer = () => {
  const {fps} = useVideoConfig();
  const timing = linearTiming({durationInFrames: 20});

  return (
    <AbsoluteFill style={{backgroundColor: PAPER}}>
      <TransitionSeries>
        <TransitionSeries.Sequence name="讨论" durationInFrames={660} premountFor={fps}>
          <SceneDiscuss />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: "from-right"})} timing={timing} />
        <TransitionSeries.Sequence name="决策简报" durationInFrames={720} premountFor={fps}>
          <SceneBrief />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: "from-right"})} timing={timing} />
        <TransitionSeries.Sequence name="研究设计" durationInFrames={900} premountFor={fps}>
          <SceneDesign />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: "from-right"})} timing={timing} />
        <TransitionSeries.Sequence name="执行" durationInFrames={600} premountFor={fps}>
          <SceneExecute />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: "from-right"})} timing={timing} />
        <TransitionSeries.Sequence name="工作台" durationInFrames={780} premountFor={fps}>
          <SceneWorkbench />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: "from-right"})} timing={timing} />
        <TransitionSeries.Sequence name="分析" durationInFrames={660} premountFor={fps}>
          <SceneAnalysis />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: "from-right"})} timing={timing} />
        <TransitionSeries.Sequence name="质量" durationInFrames={840} premountFor={fps}>
          <SceneQuality />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: "from-right"})} timing={timing} />
        <TransitionSeries.Sequence name="收束" durationInFrames={640} premountFor={fps}>
          <SceneClose />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <PersistentHeader />
    </AbsoluteFill>
  );
};
