// A tiny trend line for a result tile: no axes, last point marked.
export default function Sparkline({ values }: { values: number[] }) {
  const v = values.slice(-12);
  if (v.length < 2) return null;

  const w = 72;
  const h = 28;
  const pad = 3.5;
  const min = Math.min(...v);
  const max = Math.max(...v);
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (v.length - 1);
  const y = (n: number) => (max === min ? h / 2 : h - pad - ((n - min) / (max - min)) * (h - 2 * pad));

  const d = v.map((n, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(n).toFixed(1)}`).join(" ");
  const last = v.length - 1;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" className="shrink-0 text-ink">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <circle
        cx={x(last)}
        cy={y(v[last])}
        r="3.2"
        stroke="currentColor"
        strokeWidth="1.5"
        style={{ fill: "var(--accent)" }}
      />
    </svg>
  );
}
