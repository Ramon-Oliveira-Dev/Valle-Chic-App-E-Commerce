export type ProductLike = {
  id: string;
  name: string;
  image_url?: string | null;
  img?: string | null;
  brand?: string | null;
  model?: string | null;
  modelo?: string | null;
  colors?: string[] | string | null;
  color?: string | null;
};

export function getPrimaryColor(product: ProductLike): string {
  if (Array.isArray(product.colors)) {
    return product.colors.find(Boolean)?.trim() || '';
  }

  if (typeof product.colors === 'string') {
    return product.colors.split(',').map((color) => color.trim()).find(Boolean) || '';
  }

  return product.color?.trim() || '';
}

export function productToCartItem(product: ProductLike, price: number) {
  return {
    id: product.id,
    name: product.name,
    price,
    image: product.image_url || product.img || '',
    brand: product.brand || '',
    model: product.model || product.modelo || '',
    color: getPrimaryColor(product)
  };
}
