import { prettyDate } from "@/lib/setup";

type Point = { label: string; value: number };

// Progress chart: gridlines with values, the first and last dates, the latest point marked.
export default function LineChart({
  points,
  unit,
  goal,
}: {
  points: Point[];
  unit?: string;
  goal?: number | null;
}) {
  if (points.length === 0) {
    return <p className="text-sm text-muted">No results yet. Log one to start the chart.</p>;
  }

  const w = 420;
  const h = 200;
  const left = 44;
  const right = 14;
  const top = 14;
  const bottom = 30;

  const hasGoal = typeof goal === "number" && Number.isFinite(goal);
  const values = points.map((p) => p.value).concat(hasGoal ? [goal as number] : []);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const room = (max - min) * 0.12;
  min -= room;
  max += room;

  const x = (i: number) =>
    points.length === 1 ? (left + w - right) / 2 : left + (i * (w - left - right)) / (points.length - 1);
  const y = (v: number) => top + (1 - (v - min) / (max - min)) * (h - top - bottom);
  const fmt = (n: number) => String(Math.round(n * 10) / 10);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const base = h - bottom;
  const area = `${line} L${x(points.length - 1).toFixed(1)},${base} L${x(0).toFixed(1)},${base} Z`;
  const ticks = [max, (max + min) / 2, min];
  const lastIndex = points.length - 1;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-auto w-full max-w-xl"
      role="img"
      aria-label={`Progress chart${unit ? ` in ${unit}` : ""}, ${points.length} results`}
    >
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={left} x2={w - right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
          <text x={left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
            {fmt(t)}
          </text>
        </g>
      ))}

      {points.length > 1 && <path d={area} fill="var(--ink)" opacity="0.07" />}
      {points.length > 1 && (
        <path d={line} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      )}

      {hasGoal && (
        <g>
          <line
            x1={left}
            x2={w - right}
            y1={y(goal as number)}
            y2={y(goal as number)}
            stroke="var(--goal)"
            strokeWidth="2"
            strokeDasharray="6 5"
          />
          <text x={w - right} y={y(goal as number) - 6} textAnchor="end" fontSize="11" fontWeight="600" fill="var(--goal)">
            {`Goal ${fmt(goal as number)}`}
          </text>
        </g>
      )}

      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.value)}
          r={i === lastIndex ? 6 : 3.5}
          fill={i === lastIndex ? "var(--accent)" : "var(--surface)"}
          stroke="var(--ink)"
          strokeWidth="2"
        >
          <title>{`${prettyDate(p.label, true)}: ${p.value}${unit ? ` ${unit}` : ""}`}</title>
        </circle>
      ))}

      <text x={x(0)} y={h - 8} textAnchor={points.length === 1 ? "middle" : "start"} fontSize="11" fill="var(--muted)">
        {prettyDate(points[0].label)}
      </text>
      {points.length > 1 && (
        <text x={x(lastIndex)} y={h - 8} textAnchor="end" fontSize="11" fill="var(--muted)">
          {prettyDate(points[lastIndex].label)}
        </text>
      )}
    </svg>
  );
}
