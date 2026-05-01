/** New photography shown first in the featured grid and marquee. */
export const portfolioSpotlightPieces = [
  {
    src: '/images/portfolio-table-live-edge-base.png',
    alt: 'Custom hardwood dining tabletop with chamfered live-edge detail and powder-coated steel fretwork base',
  },
  {
    src: '/images/portfolio-console-hallway.png',
    alt: 'Handcrafted dark wood console with carved apron, brass lamp, and abstract art in a cream-walled hallway',
  },
] as const

/** Public URLs for `/public/images/portfolio/piece-01.png` … `piece-17.png` */
export const portfolioPieces = Array.from({ length: 17 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0')
  return {
    src: `/images/portfolio/piece-${n}.png`,
    alt: `Matthew Harder Custom Woodworks — selected project ${i + 1}`,
  }
})
