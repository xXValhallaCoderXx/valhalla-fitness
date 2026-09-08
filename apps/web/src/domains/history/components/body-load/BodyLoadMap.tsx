import type { BodyRegionId } from '~/domains/history'

/**
 * A single silhouette, coloured per region by whichever view is active.
 *
 * Back regions are drawn over front ones with small translates (upper back over chest, glutes over
 * quads) — this is one figure, not a front/back pair. Splitting it needs new geometry, not a
 * re-layout. The same paths exist in `apps/native/src/features/history/muscle-fatigue/BodyLoadMap`;
 * they are worth extracting as shared data, separately from this screen.
 */
export function BodyLoadMap({
  styleFor,
  ariaLabel,
}: {
  styleFor: (regionId: BodyRegionId) => { fill: string; opacity: number }
  ariaLabel: string
}) {
  const fill = (regionId: BodyRegionId) => styleFor(regionId).fill
  const opacity = (regionId: BodyRegionId) => styleFor(regionId).opacity

  return (
    <div className="flex justify-center">
      <svg viewBox="0 0 300 420" role="img" aria-label={ariaLabel} className="vf-body-load-map">
        <g stroke="var(--mantine-color-default-border)" strokeWidth="3">
          <circle cx="150" cy="46" r="26" fill="var(--vf-surface-3)" />
          <rect x="118" y="76" width="64" height="34" rx="15" fill={fill('shoulders')} opacity={opacity('shoulders')} />
          <path d="M95 104 C114 86 135 82 150 98 C165 82 186 86 205 104 L196 156 C178 150 162 143 150 130 C138 143 122 150 104 156 Z" fill={fill('chest')} opacity={opacity('chest')} />
          <path d="M119 156 L181 156 L172 237 L128 237 Z" fill={fill('core')} opacity={opacity('core')} />
          <path d="M74 114 C91 122 102 143 103 168 L94 231 C80 229 70 215 72 196 L78 151 C79 137 76 125 74 114 Z" fill={fill('triceps')} opacity={opacity('triceps')} />
          <path d="M226 114 C209 122 198 143 197 168 L206 231 C220 229 230 215 228 196 L222 151 C221 137 224 125 226 114 Z" fill={fill('triceps')} opacity={opacity('triceps')} />
          <path d="M98 238 L143 238 L135 345 C116 343 102 327 100 305 Z" fill={fill('quads')} opacity={opacity('quads')} />
          <path d="M157 238 L202 238 L200 305 C198 327 184 343 165 345 Z" fill={fill('quads')} opacity={opacity('quads')} />
          <path d="M103 344 L137 344 L132 394 C120 397 108 390 106 377 Z" fill={fill('calves')} opacity={opacity('calves')} />
          <path d="M163 344 L197 344 L194 377 C192 390 180 397 168 394 Z" fill={fill('calves')} opacity={opacity('calves')} />
          <path d="M98 109 C119 120 133 129 150 129 C167 129 181 120 202 109 L190 151 C175 166 125 166 110 151 Z" fill={fill('upper_back')} opacity={opacity('upper_back')} transform="translate(0 2)" />
          <path d="M103 238 L143 238 L139 304 L121 329 C107 306 101 276 103 238 Z" fill={fill('glutes')} opacity={opacity('glutes')} transform="translate(0 -2)" />
          <path d="M157 238 L197 238 C199 276 193 306 179 329 L161 304 Z" fill={fill('glutes')} opacity={opacity('glutes')} transform="translate(0 -2)" />
          <path d="M113 251 L137 251 L132 339 C117 329 108 307 109 285 Z" fill={fill('hamstrings')} opacity={opacity('hamstrings')} />
          <path d="M163 251 L187 251 L191 285 C192 307 183 329 168 339 Z" fill={fill('hamstrings')} opacity={opacity('hamstrings')} />
          <path d="M63 177 L92 188 L85 255 C75 263 62 258 61 245 Z" fill={fill('biceps')} opacity={opacity('biceps')} />
          <path d="M237 177 L208 188 L215 255 C225 263 238 258 239 245 Z" fill={fill('biceps')} opacity={opacity('biceps')} />
        </g>
      </svg>
    </div>
  )
}
