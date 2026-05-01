import { portfolioPieces, portfolioSpotlightPieces } from './portfolio'
import type { PortfolioItem, SiteContent } from '../types/siteContent'

const spotlightCaptions: Pick<PortfolioItem, 'captionLabel' | 'captionSub'>[] = [
  { captionLabel: 'Dining / live edge', captionSub: 'Steel base · chamfered top' },
  { captionLabel: 'Console & millwork', captionSub: 'Hall vignette · brass & art' },
]

const nextCaptions: Pick<PortfolioItem, 'captionLabel' | 'captionSub'>[] = [
  { captionLabel: 'Selected dining', captionSub: 'Custom table · Utah' },
  { captionLabel: 'Built-in millwork', captionSub: 'Figure-matched · 2024' },
  { captionLabel: 'Office / desk', captionSub: 'Solid hardwood' },
  { captionLabel: 'Live edge', captionSub: 'Natural edge · epoxy-ready' },
]

function defaultPortfolio(): PortfolioItem[] {
  const spotlight: PortfolioItem[] = portfolioSpotlightPieces.map((p, i) => ({
    src: p.src,
    alt: p.alt,
    ...spotlightCaptions[i],
  }))
  const rest: PortfolioItem[] = portfolioPieces.map((p, i) => ({
    src: p.src,
    alt: p.alt,
    ...(i < nextCaptions.length ? nextCaptions[i] : {}),
  }))
  return [...spotlight, ...rest]
}

export const defaultSiteContent: SiteContent = {
  v: 1,
  hero: {
    kicker: 'Matthew Harder · Custom woodworks · Est. 2021',
    titleLineBefore: 'Craft',
    titleEm: 'without',
    titleLineAfter: 'compromise',
    body: 'Bespoke furniture, built-in millwork, and custom acoustic guitars for clients who notice grain, joinery, and the way wood rings. Built in Utah — shipped and installed with care.',
    image: {
      src: '/images/hero-dining-table.png',
      srcSet: '/images/hero-dining-table.png 768w, /images/hero-dining-table@2x.png 1536w',
      alt: 'Custom hardwood dining table from the Matthew Harder workshop',
      width: 1536,
      height: 2048,
    },
    tagPrint: 'Matthew Harder',
    stats: [
      { value: '10+', label: 'Years in the trade' },
      { value: 'Est.', label: '2021 · Orem bench' },
      { value: 'UT', label: 'Park City & beyond' },
    ],
  },
  ticker: [
    'Solid wood tables',
    'Custom acoustic guitars',
    'Live edge artistry',
    'Custom cabinetry',
    'Epoxy inlay work',
    'Bespoke built-ins',
    'Heirloom quality',
    'Furniture restoration',
    'Premium hardwoods',
  ],
  about: {
    eyebrow: 'The craftsman',
    nameLine1: 'Matthew',
    nameLine2: 'Harder',
    paragraphs: [
      'Over a decade in top shops across the Northwest — Utah ski country, California, and Napa — brought home to the Wasatch Front for clients who expect restraint, precision, and boards chosen on purpose.',
      'With a degree in Cabinetry and Architectural Woodworking, the work spans custom furniture, built-ins, restoration, and custom acoustic guitars — from voicing and bracing to inlay and finish — modern spaces and instruments grounded in material honesty.',
      'Every piece is drafted and finished as if it were staying in my own home — quiet luxury, built to be touched, played, and lived with every day.',
    ],
    mediaCaption: 'Orem, Utah · Furniture, guitars & nationwide commissions',
    images: {
      craftsman: {
        src: '/images/about-craftsman.png',
        alt: 'Matthew Harder shaping wood with a handheld router in the workshop, wearing hearing protection and overalls',
        width: 864,
        height: 808,
      },
      guitarHead: {
        src: '/images/about-guitar-headstock.png',
        alt: 'Custom acoustic headstock with Matthew Harder Guitars inlay and gold tuners',
        width: 768,
        height: 1024,
      },
      guitarBody: {
        src: '/images/about-guitar-body.png',
        alt: 'Hand-built acoustic guitar with detailed fretboard inlay and rosette, hanging in the shop',
        width: 768,
        height: 1024,
      },
    },
    stats: [
      { value: '10+', label: 'Years in the trade' },
      { value: '2021', label: 'Studio opened' },
      { value: '19+', label: 'Featured work' },
    ],
  },
  servicesHead: {
    eyebrow: 'What we create',
    title: 'Services',
    ctaLabel: 'Start a project',
  },
  services: [
    {
      n: '01',
      title: 'Solid wood tables',
      desc: 'Dining, coffee, and accent tables in premium hardwoods. Live edge and epoxy when you want a statement.',
    },
    {
      n: '02',
      title: 'Custom acoustic guitars',
      desc: 'Hand-voiced steel-string acoustics — bracing, sets, inlay, and finish built for players who care how wood rings.',
    },
    {
      n: '03',
      title: 'Bedroom furniture',
      desc: 'Beds, headboards, nightstands, and dressers — proportioned and finished for real homes.',
    },
    {
      n: '04',
      title: 'Built-in cabinetry',
      desc: 'Wardrobes, media walls, and breakfast nooks integrated with your architecture.',
    },
    {
      n: '05',
      title: 'Home office & bars',
      desc: 'Executive and floating desks, bespoke bars, and wine storage for serious collectors.',
    },
    {
      n: '06',
      title: 'Vanities & storage',
      desc: 'Bathroom vanities, sideboards, hutches, and consoles — spec-built, not catalog.',
    },
    {
      n: '07',
      title: 'Restoration & repair',
      desc: 'Refinishing and structural repair so heirlooms earn the next generation.',
    },
  ],
  inspiration: {
    enabled: true,
    src: '/images/design-inspiration-collage.png',
    alt: 'Interior mood board: sand, terracotta, cream, and charcoal tones with wood slats, furnishings, and material samples',
  },
  portfolioHead: { eyebrow: 'Selected portfolio', title: 'Custom. Bold. Luxury.' },
  portfolio: defaultPortfolio(),
  quote: {
    text: "I believe every design should be modern but timeless, beautiful yet functional — an expression of individuality. All furniture makes a statement. Let's create yours.",
    attribution: '— Matthew Harder · Founder & craftsman',
  },
  processHead: { eyebrow: 'The process', title: 'From concept to creation' },
  process: [
    {
      title: 'Consultation',
      desc: 'We align on vision, space, and timeline. Estimates are direct — no games.',
    },
    {
      title: 'Design',
      desc: 'Shop drawings and material pulls. Boards chosen for figure and Utah climate.',
    },
    {
      title: 'Crafting',
      desc: 'Joinery and finish from the Orem bench — patience over rush.',
    },
    {
      title: 'Delivery',
      desc: 'Install with respect for the house. Utah, Wasatch Front, and commissions nationwide.',
    },
  ],
  contact: {
    eyebrow: 'Contact',
    titleLine1: 'Begin your',
    titleLine2: 'commission',
    formEyebrow: 'Free estimate',
    websiteLabel: 'Website',
    website: 'mhcustomwoodworks.com',
    emailLabel: 'Email',
    email: 'matthewharderwoodworks@gmail.com',
    instagramLabel: 'Instagram',
    instagramUrl: 'https://www.instagram.com/mhcustomwoodworks/',
    instagramHandle: '@mhcustomwoodworks',
    studioLabel: 'Studio',
    studio: 'Orem, Utah',
    serviceAreaLabel: 'Service area',
    serviceArea: 'Utah & continental U.S.',
    mailtoSubject: 'Commission enquiry — MHW',
  },
  footer: {
    name: 'Matthew Harder',
    tag: 'Custom Woodworks',
    copyLine: '© {year} Matthew Harder Custom Woodworks · Est. 2021 · Orem, Utah',
    externalSiteUrl: 'https://mhcustomwoodworks.com',
  },
}
