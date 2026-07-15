// My Sovereign Wiki brand mark — a small connected-node glyph (the "brain map"),
// inside a rounded, gradient tile. Self-contained inline SVG so it themes with
// the app and needs no asset pipeline.
export default function BrandMark({ size = 40 }) {
  const id = "ssw-brand-grad";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="My Sovereign Wiki"
      className="shrink-0"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c6bd6" />
          <stop offset="1" stopColor="#5b45a3" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="48" height="48" rx="13" fill={`url(#${id})`} />
      <g stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.95">
        <line x1="24" y1="24" x2="14" y2="14" />
        <line x1="24" y1="24" x2="35" y2="16" />
        <line x1="24" y1="24" x2="15" y2="34" />
        <line x1="24" y1="24" x2="34" y2="33" />
      </g>
      <g fill="#ffffff">
        <circle cx="24" cy="24" r="4.5" />
        <circle cx="14" cy="14" r="3" />
        <circle cx="35" cy="16" r="3" />
        <circle cx="15" cy="34" r="3" />
        <circle cx="34" cy="33" r="3" />
      </g>
    </svg>
  );
}
