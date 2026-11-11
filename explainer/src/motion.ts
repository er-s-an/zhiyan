import type {CSSProperties} from "react";
import {Easing, interpolate} from "remotion";

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
  easing: easeOut,
};

export const enter = (
  frame: number,
  start: number,
  x = 28,
  y = 20,
): CSSProperties => ({
  opacity: interpolate(frame, [start, start + 14], [0, 1], clamp),
  translate: interpolate(frame, [start, start + 22], [`${x}px ${y}px`, "0px 0px"], clamp),
});

export const fade = (frame: number, start: number, duration = 16): number =>
  interpolate(frame, [start, start + duration], [0, 1], clamp);
