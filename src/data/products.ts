import { Product, Category } from '@/types';

export const categories: Category[] = [
  {
    id: 'cat-1',
    name: 'Kitchen Appliances',
    slug: 'kitchen-appliances',
    description: 'Premium kitchen gadgets and appliances',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop',
    product_count: 4,
  },
  {
    id: 'cat-2',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Latest electronic devices and accessories',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop',
    product_count: 3,
  },
  {
    id: 'cat-3',
    name: 'Home & Living',
    slug: 'home-living',
    description: 'Smart home solutions and lifestyle products',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop',
    product_count: 3,
  },
];

export const products: Product[] = [
  {
    id: 'prod-1',
    name: 'Electric Coconut Scraper Pro',
    slug: 'electric-coconut-scraper-pro',
    description: 'The Electric Coconut Scraper Pro features a powerful motor, stainless steel blade, detachable blade holder, vacuum base for stability, and motor cooling vent. Perfect for effortless coconut scraping in your kitchen.',
    short_description: 'Professional electric coconut scraper with vacuum base',
    price: 1999,
    compare_at_price: 2999,
    images: [
      'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=600&h=600&fit=crop',
    ],
    category_id: 'cat-1',
    category_name: 'Kitchen Appliances',
    stock: 45,
    sku: 'WW-CS-001',
    features: ['Stainless Steel Blade', 'Vacuum Base', 'Motor Cooling Vent', 'Detachable Blade Holder', '1 Year Warranty'],
    specifications: { 'Power': '150W', 'Voltage': '220V', 'Weight': '1.2 kg', 'Material': 'ABS + Stainless Steel', 'Warranty': '1 Year' },
    rating: 4.5,
    review_count: 128,
    is_featured: true,
    created_at: '2024-01-15',
  },
  {
    id: 'prod-2',
    name: 'Smart Blender X1',
    slug: 'smart-blender-x1',
    description: 'High-performance smart blender with 6 preset programs, self-cleaning mode, and BPA-free container.',
    short_description: 'Smart blender with preset programs',
    price: 3499,
    compare_at_price: 4999,
    images: [
      'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=600&h=600&fit=crop',
    ],
    category_id: 'cat-1',
    category_name: 'Kitchen Appliances',
    stock: 30,
    sku: 'WW-BL-002',
    features: ['6 Preset Programs', 'Self-Cleaning', 'BPA-Free', 'Digital Display', '2 Year Warranty'],
    specifications: { 'Power': '1200W', 'Capacity': '1.5L', 'Speed': '28000 RPM', 'Weight': '3.5 kg' },
    rating: 4.7,
    review_count: 89,
    is_featured: true,
    created_at: '2024-02-10',
  },
  {
    id: 'prod-3',
    name: 'Wireless Charging Pad Ultra',
    slug: 'wireless-charging-pad-ultra',
    description: 'Fast 15W wireless charging pad with LED indicator, compatible with all Qi-enabled devices.',
    short_description: '15W fast wireless charger',
    price: 899,
    compare_at_price: 1499,
    images: [
      'https://images.unsplash.com/photo-1586816879360-004f5b0c51e3?w=600&h=600&fit=crop',
    ],
    category_id: 'cat-2',
    category_name: 'Electronics',
    stock: 100,
    sku: 'WW-WC-003',
    features: ['15W Fast Charging', 'LED Indicator', 'Anti-Slip Base', 'Universal Compatibility'],
    specifications: { 'Output': '15W Max', 'Input': 'USB-C', 'Size': '10cm diameter', 'Weight': '80g' },
    rating: 4.3,
    review_count: 256,
    is_featured: false,
    created_at: '2024-03-01',
  },
  {
    id: 'prod-4',
    name: 'Smart LED Desk Lamp',
    slug: 'smart-led-desk-lamp',
    description: 'Adjustable smart LED desk lamp with wireless charging base, 5 color temperatures, and touch controls.',
    short_description: 'LED desk lamp with wireless charging',
    price: 2199,
    compare_at_price: 2999,
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=600&h=600&fit=crop',
    ],
    category_id: 'cat-3',
    category_name: 'Home & Living',
    stock: 25,
    sku: 'WW-DL-004',
    features: ['5 Color Temps', 'Wireless Charging', 'Touch Control', 'Memory Function', 'Eye Care'],
    specifications: { 'Power': '12W', 'Lumens': '800', 'CRI': '95+', 'Charging': '10W Qi' },
    rating: 4.6,
    review_count: 67,
    is_featured: true,
    created_at: '2024-03-15',
  },
  {
    id: 'prod-5',
    name: 'Noise Cancelling Earbuds',
    slug: 'noise-cancelling-earbuds',
    description: 'Premium ANC earbuds with 30-hour battery life, IPX5 waterproof rating, and crystal-clear audio.',
    short_description: 'ANC earbuds with 30h battery',
    price: 2799,
    images: [
      'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=600&h=600&fit=crop',
    ],
    category_id: 'cat-2',
    category_name: 'Electronics',
    stock: 60,
    sku: 'WW-EB-005',
    features: ['Active Noise Cancelling', '30h Battery', 'IPX5 Waterproof', 'Touch Controls', 'Fast Charge'],
    specifications: { 'Driver': '11mm', 'Battery': '30h total', 'Bluetooth': '5.3', 'Weight': '5.2g each' },
    rating: 4.4,
    review_count: 193,
    is_featured: true,
    created_at: '2024-04-01',
  },
  {
    id: 'prod-6',
    name: 'Electric Hand Mixer',
    slug: 'electric-hand-mixer',
    description: 'Compact electric hand mixer with 5 speed settings, turbo mode, and stainless steel beaters.',
    short_description: 'Compact 5-speed hand mixer',
    price: 1299,
    compare_at_price: 1799,
    images: [
      'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=600&h=600&fit=crop',
    ],
    category_id: 'cat-1',
    category_name: 'Kitchen Appliances',
    stock: 40,
    sku: 'WW-HM-006',
    features: ['5 Speed Settings', 'Turbo Mode', 'Stainless Steel Beaters', 'Easy Eject', 'Compact Design'],
    specifications: { 'Power': '300W', 'Speeds': '5 + Turbo', 'Weight': '0.8 kg', 'Cord Length': '1.2m' },
    rating: 4.2,
    review_count: 75,
    is_featured: false,
    created_at: '2024-04-10',
  },
  {
    id: 'prod-7',
    name: 'Smart Plug WiFi',
    slug: 'smart-plug-wifi',
    description: 'WiFi-enabled smart plug with energy monitoring, voice control via Alexa & Google, and scheduling.',
    short_description: 'WiFi smart plug with energy monitoring',
    price: 599,
    images: [
      'https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=600&h=600&fit=crop',
    ],
    category_id: 'cat-3',
    category_name: 'Home & Living',
    stock: 200,
    sku: 'WW-SP-007',
    features: ['Energy Monitoring', 'Voice Control', 'Scheduling', 'Remote Access', 'No Hub Required'],
    specifications: { 'Max Load': '16A', 'WiFi': '2.4GHz', 'App': 'Smart Life', 'Voice': 'Alexa & Google' },
    rating: 4.1,
    review_count: 312,
    is_featured: false,
    created_at: '2024-05-01',
  },
  {
    id: 'prod-8',
    name: 'Portable Bluetooth Speaker',
    slug: 'portable-bluetooth-speaker',
    description: 'Rugged portable speaker with 360° sound, 20h battery, and IPX7 waterproof rating.',
    short_description: 'Waterproof portable speaker',
    price: 1899,
    compare_at_price: 2499,
    images: [
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&h=600&fit=crop',
    ],
    category_id: 'cat-2',
    category_name: 'Electronics',
    stock: 35,
    sku: 'WW-BS-008',
    features: ['360° Sound', '20h Battery', 'IPX7 Waterproof', 'TWS Pairing', 'USB-C Charging'],
    specifications: { 'Power': '20W', 'Battery': '5000mAh', 'Bluetooth': '5.0', 'Weight': '540g' },
    rating: 4.5,
    review_count: 148,
    is_featured: false,
    created_at: '2024-05-15',
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find(p => p.slug === slug);
}

export function getProductsByCategory(categoryId: string): Product[] {
  return products.filter(p => p.category_id === categoryId);
}

export function getFeaturedProducts(): Product[] {
  return products.filter(p => p.is_featured);
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase();
  return products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q) ||
    p.category_name.toLowerCase().includes(q)
  );
}
