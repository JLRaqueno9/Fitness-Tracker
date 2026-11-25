type Point = { label: string; value: number };

export default function LineChart({ points }: { points: Point[] }) {
  if (points.length === 0) {
    return <p className="text-sm opacity-70">No results yet.</p>;
  }

  const w = 320;
  const h = 120;
  const pad = 16;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const x = (i: number) =>
    points.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (points.length - 1);
  const y = (v: number) => h - pad - ((v - min) / range) * (h - 2 * pad);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm" role="img" aria-label="Progress chart">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r="3" fill="currentColor">
          <title>{`${p.label}: ${p.value}`}</title>
        </circle>
      ))}
    </svg>
  );
}
