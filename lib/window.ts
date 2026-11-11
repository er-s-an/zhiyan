function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Confirmation time minus 24 months, aligned to UTC days. */
export function windowFor(now: Date): { start: string; end: string; rationale: string } {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - 24);
  return {
    start: isoDay(start),
    end: isoDay(end),
    rationale: "确认时点往前 24 个月。更早的帖子仍可留在样本里，但质量视图会把它们标成过时。",
  };
}
