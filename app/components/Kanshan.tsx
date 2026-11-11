export function Kanshan({
  variant = "front",
  size = 160,
  className = "",
  hidden = false,
}: {
  variant?: "front" | "side" | "face";
  size?: number;
  className?: string;
  hidden?: boolean;
}) {
  const source = variant === "face" ? "/brand/kanshan-face.png" : variant === "side" ? "/brand/kanshan-side.png" : "/brand/kanshan-front.png";
  const ratio = variant === "face" ? 1 : variant === "side" ? 576 / 820 : 503 / 820;
  return (
    <img
      className={`kanshan ${className}`}
      src={source}
      alt={hidden ? "" : "刘看山"}
      aria-hidden={hidden || undefined}
      draggable={false}
      style={{ height: size, width: Math.round(size * ratio) }}
    />
  );
}

export function ZhihuMark({ size = 20 }: { size?: number }) {
  return (
    <span className="zhihu-glyph" style={{ width: size, height: size, fontSize: Math.round(size * 0.62) }} aria-hidden="true">
      知
    </span>
  );
}
