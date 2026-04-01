export interface Product {
  id: string;
  name: string;
  brand?: string;
  category?: 'bolsas' | 'maletas' | 'carteiras' | 'acessorios';
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  description?: string;
  colors?: string[];
  isNew?: boolean;
  isKit?: boolean;
}

export const products: Product[] = [
  {
    id: 'bolsa-1',
    name: 'Birkin 30 Gold',
    brand: 'Borboleta Azul',
    price: 14900,
    originalPrice: 18625,
    discount: 20,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWri3NFScn3lZvHcgKmcL0GVpXFsR-KYGkeRB45heaoDJfrK-sV1ocU87A4iEEDdYxc_uivoposomPaKj5WP-gMvBlsojMy6roXGBZHaIhuEG6SPpt52ozamlMldoApu_1EwcbWNDVxOz39zgOw0C3fz788RokDIq32GBVwdwFwZO_Lvhn4s1QUSqZot5FDChxNHIArDgJhRxdyInzUHJ52xGiEk0jbJrYBiRGAD_CTugLZQ6ukhFBRCAj7dms0z5nwccSeZ1PsuM',
    isNew: true,
    description: 'A icônica Birkin 30 em couro Gold com ferragens douradas. Um clássico atemporal que exala luxo e sofisticação.'
  },
  {
    id: 'bolsa-2',
    name: 'Kelly Epsom',
    brand: 'La Celicia',
    price: 12400,
    originalPrice: 14588,
    discount: 15,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCw55pEK9hiFDX2V2GV9j2Rxxs8uD-lLUeyvKXhy9weXc-7FoIGDfeDrIhm7bnAr7hb_x2S7XulYOTKP-EZU1wL0aS5M4J6292Gb5Hs1rYJ3vaEgDBn1dUNkFLJ4HwNIekm7fJqpEXSasoTH50bE2d-Pec_-OR1xEcADo4Rw2VoHmAKLN6HhDvZ3gof4NbBLTeUtG0yG0T_x47XHI6T75oeq4KlP5wMt7fEx7XwMRBhFUczzqTPoBhB5IPs1WY5to1euvC0EadT8AU',
    isNew: false,
    description: 'Bolsa Kelly em couro Epsom, conhecida por sua durabilidade e estrutura impecável. Perfeita para qualquer ocasião.'
  },
  {
    id: 'bolsa-3',
    name: 'Neverfull MM',
    brand: 'Lace Lore',
    price: 8900,
    originalPrice: 12714,
    discount: 30,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCiF85Iy3Gfv7f_kxwz7x5O-WAzGtfUTxaK5Ojt2Csp2KCVxvmnziRwOv6sQFeCTsjV0Zm5jZcuwVllazi8NeY1AYuSfXrzLhvItp1IDOEx4ap3NmXHPncok0WhkZpP7a2BP5sMaGLRNrls4EOGw_3y0tfNtxxL5-TwilSqblr5tLAEv7EmyIlcpPuHWVkx8ZeIk-ANeTC0Bz2O_j0pdtqJJy9LyEDZOhadT-nXpPuagcPtFVmySQ9Uzp-MFR0AQRcPoua1tmINQqo',
    isNew: false,
    description: 'A bolsa Neverfull MM combina design atemporal com detalhes tradicionais. Espaçosa e prática para o dia a dia.'
  },
  {
    id: 'bolsa-4',
    name: 'Twist Epi',
    brand: 'LC Winni',
    price: 10200,
    originalPrice: 11333,
    discount: 10,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCIaoP_jun10BLK2Z-Sj3ikExqNBN_jORg8QyVQ7BsWsqhAZzRfhePMttHIo7dNCjzLHEqYG56bE-zQXaIcq96RBvQcf3po4YZhRuawfeEuBjGeB7q6ISKGh9a8heDoSLSA_d9Mqa62KcEx5mWdrFSpR5Vs44SO1OJy2hEQnwQuKJGWPfqRcTgS3s8F9a4vU6CC5x2JPMfdAkWGN0sD9I-eYgD1JdsUJhS0UPfsvk2yChLrsYQvTuIlOQM89mBha8zfwO4O63e-i3o',
    isNew: false,
    description: 'Bolsa Twist em couro Epi com fecho LV Twist exclusivo. Uma peça moderna e elegante para mulheres contemporâneas.'
  },
  {
    id: 'bolsa-5',
    name: 'Classic Flap',
    brand: 'Safira Sol',
    price: 15500,
    originalPrice: 19375,
    discount: 20,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCp7ZAM9Xl2SArYuMCmGVVBuuBD_2zjqmHJEKLIN0LxHrQnFS0RcENLvUrCL_Zxu9IrVZWRuw0Ac4pP9qA2rAwMeEmi5m28hVb2Xv8MFgX6MnJFTKeJMYhKbROlkKUUwCAmCHg-lcdMxs5FsQrtJijFvbX2i-Bc9YOAOD5xZZ-GxNMAr3CEQ4Mdbonq-IhNtbJtcrsNC7nEJQtCNRikbmsPLItkI94d5ybJ0IiHX3CAR02euN_FJ51uSU12u8oUGk7v6VAgB25Sn3U',
    isNew: true,
    description: 'A clássica bolsa Flap em couro matelassê com alça de corrente. O símbolo máximo de elegância e status.'
  },
  {
    id: 'bolsa-classic',
    name: 'Bolsa Classic Sand Gold',
    price: 4290,
    originalPrice: 5362,
    discount: 20,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCp7ZAM9Xl2SArYuMCmGVVBuuBD_2zjqmHJEKLIN0LxHrQnFS0RcENLvUrCL_Zxu9IrVZWRuw0Ac4pP9qA2rAwMeEmi5m28hVb2Xv8MFgX6MnJFTKeJMYhKbROlkKUUwCAmCHg-lcdMxs5FsQrtJijFvbX2i-Bc9YOAOD5xZZ-GxNMAr3CEQ4Mdbonq-IhNtbJtcrsNC7nEJQtCNRikbmsPLItkI94d5ybJ0IiHX3CAR02euN_FJ51uSU12u8oUGk7v6VAgB25Sn3U',
    description: 'Elegante bolsa em tom areia com detalhes em ouro. Perfeita para eventos sociais e jantares.'
  },
  {
    id: 'clutch-midnight',
    name: 'Clutch Midnight Noir',
    price: 3850,
    originalPrice: 4529,
    discount: 15,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmgycPsUyZoduorOf0lH8RinowJaT131ncEaWOiKxj_vNSaHIIDKgAPbm2BqkCyuVf9DwG5Mky-r3n1va8WGoCqfH_uMyCqEOpnVpmq1HYBoOuZiONhj1HOeYPxlJfLqXunzJ-hk0yKp-a4LHnemqPyiajTgeHaYt7S32slxUWQXBFxMcIXUDEuIcefWGcdVbduDR7ufKxb_6sqGjkGUUyGTQRpziqWuQTNR25laCmUclwiboAMMoHiPVUv_DjqfPVxLVFuJBt-QQ',
    description: 'Clutch sofisticada em couro preto profundo. O acessório ideal para noites inesquecíveis.'
  },
  {
    id: 'bolsa-elegance',
    name: 'Bolsa Elegance Ouro',
    price: 5100,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWri3NFScn3lZvHcgKmcL0GVpXFsR-KYGkeRB45heaoDJfrK-sV1ocU87A4iEEDdYxc_uivoposomPaKj5WP-gMvBlsojMy6roXGBZHaIhuEG6SPpt52ozamlMldoApu_1EwcbWNDVxOz39zgOw0C3fz788RokDIq32GBVwdwFwZO_Lvhn4s1QUSqZot5FDChxNHIArDgJhRxdyInzUHJ52xGiEk0jbJrYBiRGAD_CTugLZQ6ukhFBRCAj7dms0z5nwccSeZ1PsuM',
    description: 'Bolsa com acabamento dourado brilhante. Destaque-se com esta peça única e luxuosa.'
  },
  {
    id: 'mochila-urban',
    name: 'Mochila Urban',
    price: 3200,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlDxC3H4NbgCyenQONl6hvhc0_EWPHLUgeiYFbdDGqUHgdQ2e2TtAuTdwdSP_61fLL4HDUmgpljYk16nLuEp6lZIQNuEVxzrwABBNQmDgdNcy7y1bv3q2e6i43l7l82o2zgyESpzM07R4IJ_WK-_csyzhfW-G4J8AA0v3619PIQAi3KFeS2oQFKv0H5L9lVSqRAl9HgzX9MfszU_kywKF3iTE6t8M2puL6BMHxlcy7zqff14cQRsP6wTdSFW7cmUTJQLNEqVYR5yg',
    description: 'Mochila prática e estilosa para o dia a dia na cidade. Conforto sem abrir mão do design.'
  },
  {
    id: 'carteira-slim',
    name: 'Carteira Slim',
    category: 'carteiras',
    price: 1150,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCp7ZAM9Xl2SArYuMCmGVVBuuBD_2zjqmHJEKLIN0LxHrQnFS0RcENLvUrCL_Zxu9IrVZWRuw0Ac4pP9qA2rAwMeEmi5m28hVb2Xv8MFgX6MnJFTKeJMYhKbROlkKUUwCAmCHg-lcdMxs5FsQrtJijFvbX2i-Bc9YOAOD5xZZ-GxNMAr3CEQ4Mdbonq-IhNtbJtcrsNC7nEJQtCNRikbmsPLItkI94d5ybJ0IiHX3CAR02euN_FJ51uSU12u8oUGk7v6VAgB25Sn3U',
    description: 'Carteira compacta e funcional. Ideal para quem busca praticidade com elegância.'
  },
  {
    id: 'maleta-executiva',
    name: 'Maleta Executiva Pro',
    category: 'maletas',
    price: 850,
    originalPrice: 1100,
    discount: 22,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlDxC3H4NbgCyenQONl6hvhc0_EWPHLUgeiYFbdDGqUHgdQ2e2TtAuTdwdSP_61fLL4HDUmgpljYk16nLuEp6lZIQNuEVxzrwABBNQmDgdNcy7y1bv3q2e6i43l7l82o2zgyESpzM07R4IJ_WK-_csyzhfW-G4J8AA0v3619PIQAi3KFeS2oQFKv0H5L9lVSqRAl9HgzX9MfszU_kywKF3iTE6t8M2puL6BMHxlcy7zqff14cQRsP6wTdSFW7cmUTJQLNEqVYR5yg',
    description: 'Maleta robusta para profissionais exigentes, com compartimento para notebook.'
  },
  {
    id: 'carteira-classic',
    name: 'Carteira Classic Leather',
    category: 'carteiras',
    price: 220,
    originalPrice: 275,
    discount: 20,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCiF85Iy3Gfv7f_kxwz7x5O-WAzGtfUTxaK5Ojt2Csp2KCVxvmnziRwOv6sQFeCTsjV0Zm5jZcuwVllazi8NeY1AYuSfXrzLhvItp1IDOEx4ap3NmXHPncok0WhkZpP7a2BP5sMaGLRNrls4EOGw_3y0tfNtxxL5-TwilSqblr5tLAEv7EmyIlcpPuHWVkx8ZeIk-ANeTC0Bz2O_j0pdtqJJy9LyEDZOhadT-nXpPuagcPtFVmySQ9Uzp-MFR0AQRcPoua1tmINQqo',
    description: 'Couro de alta qualidade com múltiplos compartimentos para cartões e notas.'
  },
  {
    id: 'cinto-luxo',
    name: 'Cinto de Couro Luxo',
    category: 'acessorios',
    price: 180,
    originalPrice: 225,
    discount: 20,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWri3NFScn3lZvHcgKmcL0GVpXFsR-KYGkeRB45heaoDJfrK-sV1ocU87A4iEEDdYxc_uivoposomPaKj5WP-gMvBlsojMy6roXGBZHaIhuEG6SPpt52ozamlMldoApu_1EwcbWNDVxOz39zgOw0C3fz788RokDIq32GBVwdwFwZO_Lvhn4s1QUSqZot5FDChxNHIArDgJhRxdyInzUHJ52xGiEk0jbJrYBiRGAD_CTugLZQ6ukhFBRCAj7dms0z5nwccSeZ1PsuM',
    description: 'Cinto em couro legítimo com fivela exclusiva, o toque final para seu look.'
  }
];

export const kits: Product[] = [
  {
    id: 'kit-heritage',
    name: 'Kit Heritage Sand',
    price: 5150,
    originalPrice: 6437,
    discount: 20,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCp7ZAM9Xl2SArYuMCmGVVBuuBD_2zjqmHJEKLIN0LxHrQnFS0RcENLvUrCL_Zxu9IrVZWRuw0Ac4pP9qA2rAwMeEmi5m28hVb2Xv8MFgX6MnJFTKeJMYhKbROlkKUUwCAmCHg-lcdMxs5FsQrtJijFvbX2i-Bc9YOAOD5xZZ-GxNMAr3CEQ4Mdbonq-IhNtbJtcrsNC7nEJQtCNRikbmsPLItkI94d5ybJ0IiHX3CAR02euN_FJ51uSU12u8oUGk7v6VAgB25Sn3U',
    description: 'Conjunto Premium com acabamento em areia e detalhes dourados. Inclui bolsa principal e acessórios coordenados.',
    isKit: true
  },
  {
    id: 'kit-midnight',
    name: 'Kit Midnight Noir',
    price: 4720,
    originalPrice: 5552,
    discount: 15,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmgycPsUyZoduorOf0lH8RinowJaT131ncEaWOiKxj_vNSaHIIDKgAPbm2BqkCyuVf9DwG5Mky-r3n1va8WGoCqfH_uMyCqEOpnVpmq1HYBoOuZiONhj1HOeYPxlJfLqXunzJ-hk0yKp-a4LHnemqPyiajTgeHaYt7S32slxUWQXBFxMcIXUDEuIcefWGcdVbduDR7ufKxb_6sqGjkGUUyGTQRpziqWuQTNR25laCmUclwiboAMMoHiPVUv_DjqfPVxLVFuJBt-QQ',
    description: 'Elegância noturna em couro preto de alta qualidade. Conjunto completo para ocasiões especiais.',
    isKit: true
  },
  {
    id: 'kit-elegance-gold',
    name: 'Kit Elegance Gold',
    price: 6200,
    originalPrice: 7750,
    discount: 20,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWri3NFScn3lZvHcgKmcL0GVpXFsR-KYGkeRB45heaoDJfrK-sV1ocU87A4iEEDdYxc_uivoposomPaKj5WP-gMvBlsojMy6roXGBZHaIhuEG6SPpt52ozamlMldoApu_1EwcbWNDVxOz39zgOw0C3fz788RokDIq32GBVwdwFwZO_Lvhn4s1QUSqZot5FDChxNHIArDgJhRxdyInzUHJ52xGiEk0jbJrYBiRGAD_CTugLZQ6ukhFBRCAj7dms0z5nwccSeZ1PsuM',
    description: 'O brilho do ouro em um conjunto exclusivo de acessórios. Peças selecionadas para quem não abre mão do luxo.',
    isKit: true
  }
];
