import {Composition, Folder} from "remotion";
import {SceneAnalysis} from "./scenes/SceneAnalysis";
import {SceneBrief} from "./scenes/SceneBrief";
import {SceneClose} from "./scenes/SceneClose";
import {SceneDesign} from "./scenes/SceneDesign";
import {SceneDiscuss} from "./scenes/SceneDiscuss";
import {SceneExecute} from "./scenes/SceneExecute";
import {SceneQuality} from "./scenes/SceneQuality";
import {SceneWorkbench} from "./scenes/SceneWorkbench";
import {ZhiyanExplainer} from "./ZhiyanExplainer";

export const RemotionRoot = () => {
  return (
    <>
      <Folder name="Scenes">
        <Composition
          id="SceneDiscuss"
          component={SceneDiscuss}
          durationInFrames={660}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="SceneBrief"
          component={SceneBrief}
          durationInFrames={720}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="SceneDesign"
          component={SceneDesign}
          durationInFrames={900}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="SceneExecute"
          component={SceneExecute}
          durationInFrames={600}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="SceneWorkbench"
          component={SceneWorkbench}
          durationInFrames={780}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="SceneAnalysis"
          component={SceneAnalysis}
          durationInFrames={660}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="SceneQuality"
          component={SceneQuality}
          durationInFrames={840}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="SceneClose"
          component={SceneClose}
          durationInFrames={640}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
      <Composition
        id="ZhiyanExplainer"
        component={ZhiyanExplainer}
        durationInFrames={5660}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
