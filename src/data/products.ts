export interface Product {
  id: string;
  name: string;
  brand?: string;
  category?: 'bolsas' | 'maletas' | 'carteiras' | 'acessorios' | string;
  price: number;
  sale_price?: number;
  cost_price?: number;
  originalPrice?: number;
  original_price?: number;
  discount?: number;
  image: string;
  image_url?: string;
  img?: string;
  description?: string;
  colors?: string[];
  isNew?: boolean;
  is_new?: boolean;
  isKit?: boolean;
  is_kit?: boolean;
  featured?: boolean;
  published?: boolean;
  stock?: number;
  created_at?: string;
}

export const rawProducts: Product[] = [
  {
    id: 'bolsa-1',
    name: 'Birkin 30 Gold',
    brand: 'Borboleta Azul',
    category: 'bolsas',
    price: 14900,
    sale_price: 14900,
    cost_price: 9000,
    originalPrice: 18625,
    original_price: 18625,
    discount: 20,
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
    img: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
    isNew: true,
    is_new: true,
    featured: true,
    published: true,
    stock: 8,
    colors: ['Dourado', 'Caramelo'],
    description: 'A icônica Birkin 30 em couro Gold com ferragens douradas. Um clássico atemporal que exala luxo e sofisticação.'
  },
  {
    id: 'bolsa-2',
    name: 'Kelly Epsom',
    brand: 'La Celicia',
    category: 'bolsas',
    price: 12400,
    sale_price: 12400,
    cost_price: 7500,
    originalPrice: 14588,
    original_price: 14588,
    discount: 15,
    image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80',
    img: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80',
    isNew: false,
    is_new: false,
    featured: true,
    published: true,
    stock: 5,
    colors: ['Preto', 'Off-White'],
    description: 'Bolsa Kelly em couro Epsom, conhecida por sua durabilidade e estrutura impecável. Perfeita para qualquer ocasião.'
  },
  {
    id: 'bolsa-3',
    name: 'Neverfull MM',
    brand: 'Lace Lore',
    category: 'bolsas',
    price: 8900,
    sale_price: 8900,
    cost_price: 5200,
    originalPrice: 12714,
    original_price: 12714,
    discount: 30,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
    img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
    isNew: false,
    is_new: false,
    featured: true,
    published: true,
    stock: 12,
    colors: ['Monogram', 'Marrom'],
    description: 'A bolsa Neverfull MM combina design atemporal com detalhes tradicionais. Espaçosa e prática para o dia a dia.'
  },
  {
    id: 'bolsa-4',
    name: 'Twist Epi',
    brand: 'LC Winni',
    category: 'bolsas',
    price: 10200,
    sale_price: 10200,
    cost_price: 6000,
    originalPrice: 11333,
    original_price: 11333,
    discount: 10,
    image: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80',
    img: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80',
    isNew: false,
    is_new: false,
    featured: true,
    published: true,
    stock: 4,
    colors: ['Preto'],
    description: 'Bolsa Twist em couro Epi com fecho LV Twist exclusivo. Uma peça moderna e elegante para mulheres contemporâneas.'
  },
  {
    id: 'bolsa-5',
    name: 'Classic Flap',
    brand: 'Safira Sol',
    category: 'bolsas',
    price: 15500,
    sale_price: 15500,
    cost_price: 9500,
    originalPrice: 19375,
    original_price: 19375,
    discount: 20,
    image: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80',
    img: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80',
    isNew: true,
    is_new: true,
    featured: true,
    published: true,
    stock: 6,
    colors: ['Areia', 'Dourado'],
    description: 'A clássica bolsa Flap em couro matelassê com alça de corrente. O símbolo máximo de elegância e status.'
  },
  {
    id: 'bolsa-classic',
    name: 'Bolsa Classic Sand Gold',
    brand: 'Valle Chic',
    category: 'bolsas',
    price: 4290,
    sale_price: 4290,
    cost_price: 2500,
    originalPrice: 5362,
    original_price: 5362,
    discount: 20,
    image: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=800&q=80',
    img: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=800&q=80',
    featured: true,
    published: true,
    stock: 10,
    colors: ['Areia', 'Dourado'],
    description: 'Elegante bolsa em tom areia com detalhes em ouro. Perfeita para eventos sociais e jantares.'
  },
  {
    id: 'clutch-midnight',
    name: 'Clutch Midnight Noir',
    brand: 'Valle Chic',
    category: 'bolsas',
    price: 3850,
    sale_price: 3850,
    cost_price: 2200,
    originalPrice: 4529,
    original_price: 4529,
    discount: 15,
    image: 'https://images.unsplash.com/photo-1566150902887-9679ec15d205?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1566150902887-9679ec15d205?auto=format&fit=crop&w=800&q=80',
    img: 'https://images.unsplash.com/photo-1566150902887-9679ec15d205?auto=format&fit=crop&w=800&q=80',
    featured: true,
    published: true,
    stock: 7,
    colors: ['Preto'],
    description: 'Clutch sofisticada em couro preto profundo. O acessório ideal para noites inesquecíveis.'
  },
  {
    id: 'bolsa-elegance',
    name: 'Bolsa Elegance Ouro',
    brand: 'Valle Chic',
    category: 'bolsas',
    price: 5100,
    sale_price: 5100,
    cost_price: 3100,
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    img: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    featured: true,
    published: true,
    stock: 9,
    colors: ['Dourado'],
    description: 'Bolsa com acabamento dourado brilhante. Destaque-se com esta peça única e luxuosa.'
  },
  {
    id: 'mochila-urban',
    name: 'Mochila Urban',
    brand: 'Valle Chic',
    category: 'bolsas',
    price: 3200,
    sale_price: 3200,
    cost_price: 1900,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    featured: false,
    published: true,
    stock: 15,
    colors: ['Cinza', 'Preto'],
    description: 'Mochila prática e estilosa para o dia a dia na cidade. Conforto sem abrir mão do design.'
  },
  {
    id: 'carteira-slim',
    name: 'Carteira Slim',
    brand: 'Valle Chic',
    category: 'carteiras',
    price: 1150,
    sale_price: 1150,
    cost_price: 600,
    image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    img: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    featured: true,
    published: true,
    stock: 20,
    colors: ['Caramelo', 'Preto'],
    description: 'Carteira compacta e funcional. Ideal para quem busca praticidade com elegância.'
  },
  {
    id: 'carteira-classic',
    name: 'Carteira Classic Leather',
    brand: 'Valle Chic',
    category: 'carteiras',
    price: 220,
    sale_price: 220,
    cost_price: 110,
    originalPrice: 275,
    original_price: 275,
    discount: 20,
    image: 'https://images.unsplash.com/photo-1606503829068-1a559868770b?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1606503829068-1a559868770b?auto=format&fit=crop&w=800&q=80',
    img: 'https://images.unsplash.com/photo-1606503829068-1a559868770b?auto=format&fit=crop&w=800&q=80',
    featured: true,
    published: true,
    stock: 14,
    colors: ['Marrom', 'Café'],
    description: 'Couro de alta qualidade com múltiplos compartimentos para cartões e notas.'
  },
  {
    id: 'maleta-executiva',
    name: 'Maleta Executiva Pro',
    brand: 'Valle Chic',
    category: 'maletas',
    price: 850,
    sale_price: 850,
    cost_price: 480,
    originalPrice: 1100,
    original_price: 1100,
    discount: 22,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    featured: true,
    published: true,
    stock: 7,
    colors: ['Preto', 'Grafite'],
    description: 'Maleta robusta para profissionais exigentes, com compartimento acolchoado para notebook e divisórias organizadoras.'
  },
  {
    id: 'maleta-elegance-rose',
    name: 'Maleta Elegance Rosé',
    brand: 'Valle Chic',
    category: 'maletas',
    price: 980,
    sale_price: 980,
    cost_price: 550,
    originalPrice: 1200,
    original_price: 1200,
    discount: 18,
    image: 'https://images.unsplash.com/photo-1565084888279-aca607ecce0c?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1565084888279-aca607ecce0c?auto=format&fit=crop&w=800&q=80',
    img: 'https://images.unsplash.com/photo-1565084888279-aca607ecce0c?auto=format&fit=crop&w=800&q=80',
    featured: true,
    published: true,
    stock: 5,
    colors: ['Rosé', 'Dourado'],
    description: 'Maleta de alta costura com acabamento acetinado rosé e detalhes metálicos refinados.'
  },
  {
    id: 'cinto-luxo',
    name: 'Cinto de Couro Luxo',
    brand: 'Valle Chic',
    category: 'acessorios',
    price: 180,
    sale_price: 180,
    cost_price: 80,
    originalPrice: 225,
    original_price: 225,
    discount: 20,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    featured: true,
    published: true,
    stock: 18,
    colors: ['Preto', 'Caramelo'],
    description: 'Cinto em couro legítimo com fivela exclusiva, o toque final para seu look.'
  },
  {
    id: 'lenco-seda-aurora',
    name: 'Lenço de Seda Aurora',
    brand: 'Valle Chic',
    category: 'acessorios',
    price: 310,
    sale_price: 310,
    cost_price: 140,
    originalPrice: 380,
    original_price: 380,
    discount: 18,
    image: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=800&q=80',
    img: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=800&q=80',
    featured: true,
    published: true,
    stock: 15,
    colors: ['Multicolorido', 'Areia'],
    description: 'Lenço 100% seda pura com estampa artesanal exclusiva Valle Chic.'
  }
];

export const kits: Product[] = [
  {
    id: 'kit-heritage',
    name: 'Kit Heritage Sand',
    brand: 'Valle Chic',
    category: 'bolsas',
    price: 5150,
    sale_price: 5150,
    cost_price: 3000,
    originalPrice: 6437,
    original_price: 6437,
    discount: 20,
    image: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=800&q=80',
    img: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=800&q=80',
    description: 'Conjunto Premium com acabamento em areia e detalhes dourados. Inclui bolsa principal e acessórios coordenados.',
    isKit: true,
    is_kit: true,
    featured: true,
    published: true,
    stock: 8,
    colors: ['Areia', 'Dourado']
  },
  {
    id: 'kit-midnight',
    name: 'Kit Midnight Noir',
    brand: 'Valle Chic',
    category: 'bolsas',
    price: 4720,
    sale_price: 4720,
    cost_price: 2700,
    originalPrice: 5552,
    original_price: 5552,
    discount: 15,
    image: 'https://images.unsplash.com/photo-1566150902887-9679ec15d205?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1566150902887-9679ec15d205?auto=format&fit=crop&w=800&q=80',
    img: 'https://images.unsplash.com/photo-1566150902887-9679ec15d205?auto=format&fit=crop&w=800&q=80',
    description: 'Elegância noturna em couro preto de alta qualidade. Conjunto completo para ocasiões especiais.',
    isKit: true,
    is_kit: true,
    featured: true,
    published: true,
    stock: 6,
    colors: ['Preto']
  },
  {
    id: 'kit-elegance-gold',
    name: 'Kit Elegance Gold',
    brand: 'Valle Chic',
    category: 'bolsas',
    price: 6200,
    sale_price: 6200,
    cost_price: 3600,
    originalPrice: 7750,
    original_price: 7750,
    discount: 20,
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    img: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    description: 'O brilho do ouro em um conjunto exclusivo de acessórios. Peças selecionadas para quem não abre mão do luxo.',
    isKit: true,
    is_kit: true,
    featured: true,
    published: true,
    stock: 5,
    colors: ['Dourado']
  }
];

export const products = rawProducts;

export function getFallbackProducts(): Product[] {
  return [...rawProducts, ...kits].filter(p => p.published !== false);
}

export function getFallbackKits(): Product[] {
  return [...kits];
}

export function getFallbackProductById(id: string): Product | null {
  const all = getFallbackProducts();
  return all.find(p => p.id === id) || null;
}
