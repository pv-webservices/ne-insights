// Intrinsic sizes of the optimised WebP files in public/images (prevents layout shift).
// Keys ending in -small are mobile variants used through srcset.
export const imageSizes = {
  'arunachal-pradesh': [800, 419], assam: [800, 533], bridge: [800, 533],
  'fleet-muv': [588, 436], 'fleet-sedan': [588, 436], 'fleet-tempo': [588, 436],
  'hero-journey': [1376, 768], 'hero-journey-small': [760, 424], hero: [1600, 900], 'hero-small': [800, 450],
  homestay: [1000, 747], logo: [360, 240], loktak: [900, 672], manas: [800, 600], manipur: [600, 399],
  meghalaya: [800, 406], 'mizoram-hills': [900, 672], mizoram: [800, 600], nagaland: [800, 600],
  pobitora: [800, 530], rhino: [800, 514], stay: [800, 533], toaa: [946, 964],
  traveller: [1376, 768], 'traveller-small': [760, 424], tripura: [800, 565], 'village-walk': [1000, 747],
  waterfall: [800, 615], 'wild-tiger': [1376, 768], 'wild-tiger-small': [760, 424]
};

// Large images that also ship a -small variant for phones.
export const responsiveImages = new Set(['hero', 'hero-journey', 'traveller', 'wild-tiger']);
