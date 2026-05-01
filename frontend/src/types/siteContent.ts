export type ImageRef = {
  src: string
  srcSet?: string
  alt: string
  width?: number
  height?: number
}

export type PortfolioItem = {
  src: string
  alt: string
  captionLabel?: string
  captionSub?: string
}

export type SiteContent = {
  v: number
  hero: {
    kicker: string
    titleLineBefore: string
    titleEm: string
    titleLineAfter: string
    body: string
    image: ImageRef
    tagPrint: string
    stats: { value: string; label: string }[]
  }
  ticker: string[]
  about: {
    eyebrow: string
    nameLine1: string
    nameLine2: string
    paragraphs: [string, string, string]
    mediaCaption: string
    images: {
      craftsman: ImageRef
      guitarHead: ImageRef
      guitarBody: ImageRef
    }
    stats: { value: string; label: string }[]
  }
  servicesHead: { eyebrow: string; title: string; ctaLabel: string }
  services: { n: string; title: string; desc: string }[]
  inspiration: { enabled: boolean; src: string; alt: string }
  portfolioHead: { eyebrow: string; title: string }
  portfolio: PortfolioItem[]
  quote: { text: string; attribution: string }
  processHead: { eyebrow: string; title: string }
  process: { title: string; desc: string }[]
  contact: {
    eyebrow: string
    titleLine1: string
    titleLine2: string
    formEyebrow: string
    websiteLabel: string
    website: string
    emailLabel: string
    email: string
    instagramLabel: string
    instagramUrl: string
    instagramHandle: string
    studioLabel: string
    studio: string
    serviceAreaLabel: string
    serviceArea: string
    mailtoSubject: string
  }
  footer: {
    name: string
    tag: string
    copyLine: string
    externalSiteUrl: string
  }
}
