import type { GarmentKind, Colorway } from '../components/Garment';

/* ============================================================
   RAIGE — Product model

   The shape below is deliberately the shape a real commerce backend
   returns. When Shopify, Stripe or a database is wired up later, only
   the loader at the bottom of this file changes — no component that
   renders a product needs to be touched.
   ============================================================ */

export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

export type ProductColor = {
  /** Machine name, used in URLs and cart lines. */
  id: Colorway;
  name: string;
  hex: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  /** Short editorial line shown under the name on a card. */
  category: string;
  collection: string;
  /** Minor units (cents) — never store money as a float. */
  price: number;
  currency: 'USD';
  description: string;
  detail: string[];
  sizes: Size[];
  colors: ProductColor[];
  /**
   * Real photography, once it exists. While this is empty the site
   * renders the drawn garment instead, so nothing ever shows a
   * broken image or a grey box.
   */
  images: string[];
  /** Drives the placeholder illustration until `images` is populated. */
  garment: GarmentKind;
  inventory: number;
  badge?: string;
  featured?: boolean;
};

export const CATEGORIES = [
  { id: 'apparel', name: 'Apparel', line: 'Polos, layers and tailoring built for eighteen holes.' },
  { id: 'accessories', name: 'Accessories', line: 'The details that finish the bag.' },
  { id: 'new', name: 'New Arrivals', line: 'The first pieces of the 2026 season.' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

const usd = (dollars: number) => Math.round(dollars * 100);

export const PRODUCTS: Product[] = [
  {
    id: 'rg-001',
    slug: 'southern-polo',
    name: 'The Southern Polo',
    category: 'Performance Polo',
    collection: 'The First Tee',
    price: usd(128),
    currency: 'USD',
    description:
      'Our signature polo, cut from a mercerised performance pique that holds its shape through a full round and a long afternoon after it.',
    detail: [
      'Mercerised performance pique, 190gsm',
      'Self-fabric collar with a concealed stand',
      'Embroidered monogram at the left chest',
      'Cut for a clean, unrestricted swing',
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { id: 'forest', name: 'Forest', hex: '#1d3b2a' },
      { id: 'cream', name: 'Cream', hex: '#f0eadc' },
      { id: 'sand', name: 'Sand', hex: '#d8d1c5' },
    ],
    images: [],
    garment: 'polo',
    inventory: 42,
    badge: 'Signature',
    featured: true,
  },
  {
    id: 'rg-002',
    slug: 'clubhouse-quarter-zip',
    name: 'The Clubhouse Quarter-Zip',
    category: 'Mid Layer',
    collection: 'The First Tee',
    price: usd(168),
    currency: 'USD',
    description:
      'A brushed-back merino blend for a cold morning tee time. Warm enough for the first nine, light enough to forget by the turn.',
    detail: [
      'Merino and performance nylon blend',
      'Brushed interior face',
      'Stand collar with a matte brass pull',
      'Ribbed cuff and hem',
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { id: 'forest', name: 'Forest', hex: '#1d3b2a' },
      { id: 'black', name: 'Warm Black', hex: '#232520' },
    ],
    images: [],
    garment: 'quarter-zip',
    inventory: 28,
    featured: true,
  },
  {
    id: 'rg-003',
    slug: 'fairway-trouser',
    name: 'The Fairway Trouser',
    category: 'Tailoring',
    collection: 'The First Tee',
    price: usd(148),
    currency: 'USD',
    description:
      'A four-way stretch trouser cut like flannel and built like sportswear. Pressed crease, clean break, no compromise on the swing.',
    detail: [
      'Four-way stretch twill',
      'Permanent pressed crease',
      'Hidden waistband grip tape',
      'Tapered through the leg',
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { id: 'sand', name: 'Sand', hex: '#d8d1c5' },
      { id: 'forest', name: 'Forest', hex: '#1d3b2a' },
      { id: 'black', name: 'Warm Black', hex: '#232520' },
    ],
    images: [],
    garment: 'trouser',
    inventory: 35,
  },
  {
    id: 'rg-004',
    slug: 'monogram-rope-cap',
    name: 'The Monogram Cap',
    category: 'Headwear',
    collection: 'Accessories',
    price: usd(58),
    currency: 'USD',
    description:
      'Unstructured six-panel in washed cotton twill, with the RAIGE monogram embroidered at the front panel.',
    detail: [
      'Washed cotton twill',
      'Unstructured six-panel crown',
      'Antique brass slide closure',
      'Pre-curved brim',
    ],
    sizes: ['S', 'M', 'L'],
    colors: [
      { id: 'forest', name: 'Forest', hex: '#1d3b2a' },
      { id: 'cream', name: 'Cream', hex: '#f0eadc' },
    ],
    images: [],
    garment: 'cap',
    inventory: 120,
    badge: 'New',
    featured: true,
  },
  {
    id: 'rg-005',
    slug: 'heritage-headcover',
    name: 'The Heritage Headcover',
    category: 'Course Accessory',
    collection: 'Accessories',
    price: usd(72),
    currency: 'USD',
    description:
      'Hand-knit wool headcover with a wool pom, finished with a leather tag. Made in small runs.',
    detail: [
      'Hand-knit lambswool',
      'Fleece-lined interior',
      'Vegetable-tanned leather tag',
      'Fits driver and fairway woods',
    ],
    sizes: ['M'],
    colors: [
      { id: 'cream', name: 'Cream', hex: '#f0eadc' },
      { id: 'forest', name: 'Forest', hex: '#1d3b2a' },
    ],
    images: [],
    garment: 'headcover',
    inventory: 16,
    badge: 'Limited',
  },
  {
    id: 'rg-006',
    slug: 'brass-buckle-belt',
    name: 'The Brass Buckle Belt',
    category: 'Leather',
    collection: 'Accessories',
    price: usd(94),
    currency: 'USD',
    description:
      'Full-grain bridle leather with a solid brass buckle that will outlast the trousers you wear it with.',
    detail: [
      'Full-grain bridle leather',
      'Solid cast brass buckle',
      'Hand-burnished edges',
      'Made in the United States',
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { id: 'black', name: 'Warm Black', hex: '#232520' },
      { id: 'sand', name: 'Sand', hex: '#d8d1c5' },
    ],
    images: [],
    garment: 'belt',
    inventory: 54,
  },
];

/* ---- Selectors ---- */

export const formatPrice = (minorUnits: number, currency: 'USD' = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minorUnits / 100);

export const getFeatured = () => PRODUCTS.filter((p) => p.featured);

export const getBySlug = (slug: string) => PRODUCTS.find((p) => p.slug === slug);

export const filterByCategory = (products: Product[], category: CategoryId | 'all') => {
  if (category === 'all') return products;
  if (category === 'new') return products.filter((p) => p.badge === 'New' || p.featured);
  if (category === 'apparel')
    return products.filter((p) =>
      ['polo', 'quarter-zip', 'trouser'].includes(p.garment),
    );
  return products.filter((p) => ['cap', 'headcover', 'belt'].includes(p.garment));
};

/**
 * The single seam for future commerce integration.
 * Swap the body for a Shopify Storefront or database query and the rest
 * of the application is unaffected.
 */
export async function loadProducts(): Promise<Product[]> {
  return PRODUCTS;
}

/** The hero product for the cinematic product chapter. */
export const SIGNATURE = PRODUCTS[0];
