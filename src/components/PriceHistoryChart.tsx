import React from "react";

type Point = { time: string; median: number };

type Props = {
  points: Point[];
  days: number;
};

export const PriceHistoryChart: React.FC<Props> = ({ points }) => {
  if (!points.length) return null;

  // Very lightweight SVG line chart to avoid pulling in a charting library.
  const width = 600;
  const height = 180;
  const paddingX = 24;
  const paddingY = 16;

  const xs = points.map((p) => new Date(p.time).getTime());
  const ys = points.map((p) => p.median);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const toSvgX = (t: number) =>
    paddingX +
    ((t - minX) / spanX) * (width - paddingX * 2);
  const toSvgY = (v: number) =>
    height - paddingY - ((v - minY) / spanY) * (height - paddingY * 2);

  const pathD = points
    .map((p, i) => {
      const x = toSvgX(new Date(p.time).getTime());
      const y = toSvgY(p.median);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Price history chart"
      >
        <defs>
          <linearGradient id="ph-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="rgba(15,23,42,0.8)"
          rx="12"
        />
        <path
          d={pathD}
          fill="none"
          stroke="url(#ph-line)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

