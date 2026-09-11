/* eslint-disable jsx-a11y/prefer-tag-over-role -- Inline SVG needs an image role for its accessible reconstruction label. */
import type { Period, Region } from './types';
// Deliberately schematic: shapes communicate assembly/breakup, not coordinates.
export default function EarthMap({
  period: p,
  region: r,
}: {
  period: Period;
  region: Region;
}) {
  const ancient = p.mya > 600;
  const pangaea = p.mya <= 310 && p.mya >= 200;
  const split = p.mya < 200 && p.mya > 60;
  return (
    <div className="earth-map">
      <svg
        viewBox="0 0 220 166"
        role="img"
        aria-label={`${p.continents}; schematic location ${r.name}`}
      >
        <defs>
          <clipPath id="globe">
            <ellipse cx="110" cy="83" rx="101" ry="73" />
          </clipPath>
          <radialGradient id="ocean">
            <stop stopColor="#37676c" />
            <stop offset="1" stopColor="#183b43" />
          </radialGradient>
        </defs>
        <ellipse
          cx="110"
          cy="83"
          rx="101"
          ry="73"
          fill="url(#ocean)"
          stroke="#c3d7c047"
        />
        <g clipPath="url(#globe)" stroke="#bfd4bf16" fill="none">
          {[40, 65, 90, 115, 140].map((y) => (
            <path key={y} d={`M5 ${y} Q110 ${y + 16} 215 ${y}`} />
          ))}
          {[42, 76, 110, 144, 178].map((x) => (
            <ellipse
              key={x}
              cx="110"
              cy="83"
              rx={Math.abs(x - 110) + 10}
              ry="74"
            />
          ))}
        </g>
        <g
          clipPath="url(#globe)"
          fill="#94ad8b"
          stroke="#b0c49a"
          strokeWidth=".6"
          className="continents"
          key={p.continents}
        >
          {p.mya === 1000 ? (
            <path d="M65 38 98 28 135 34 159 54 150 80 163 98 140 126 112 134 95 115 76 119 63 90 46 70Z" />
          ) : pangaea ? (
            <path d="M94 23 118 20 127 37 147 37 159 54 145 67 155 89 142 110 148 127 129 148 113 137 110 111 88 102 81 88 66 83 61 64 71 46 85 45Z" />
          ) : ancient ? (
            <>
              {[0, 1, 2, 3, 4].map((v) => (
                <path
                  key={v}
                  transform={`translate(${(v % 3) * 52} ${Math.floor(v / 3) * 55}) rotate(${v * 31} 60 50)`}
                  d="M35 39 49 28 64 37 59 48 68 58 52 66 37 53Z"
                />
              ))}
            </>
          ) : split ? (
            <>
              <path d="M38 40 68 27 90 41 96 61 81 78 55 68 46 54Z" />
              <path d="M67 81 88 87 99 111 82 144 69 119Z" />
              <path d="M114 43 143 31 180 47 197 63 164 72 141 63 127 76 113 62Z" />
              <path d="M113 82 138 77 151 99 132 127 113 104Z" />
              <path d="M154 125 184 118 191 134 165 146Z" />
            </>
          ) : (
            <>
              <path d="M24 37 47 23 66 29 82 39 72 52 60 56 59 70 76 79 64 86 48 68 32 61Z" />
              <path d="M72 87 95 95 101 109 87 136 76 148 71 128 62 106Z" />
              <path d="M113 48 126 37 142 40 156 32 185 41 202 60 184 79 162 72 157 89 144 80 137 62 119 66Z" />
              <path d="M111 73 134 74 145 94 131 122 118 115 108 95Z" />
              <path d="M169 117 192 112 203 130 180 140 164 130Z" />
              <path d="M45 155 91 149 140 151 180 155 189 170 40 170Z" />
            </>
          )}
        </g>
        <circle
          className="loc-pulse"
          cx={r.x}
          cy={r.y}
          r="10"
          fill="none"
          stroke="#f1d49944"
          strokeWidth="1"
        />
        <circle cx={r.x} cy={r.y} r="2.5" fill="#f4d195" />
      </svg>
    </div>
  );
}
