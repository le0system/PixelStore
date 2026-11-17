export interface Game {
  id: number;
  slug: string;
  title: string;
  platform: Platform;
  genre: string;
  priceCents: number;
  releaseYear: number;
  cover: string;
  description: string;
  featured: boolean;
  available: boolean;
}

export type Platform = 'PlayStation' | 'Xbox' | 'Nintendo' | 'PC';
export type GameSort = 'featured' | 'price_asc' | 'price_desc' | 'recent' | 'title';
export const PLATFORMS: Platform[] = ['PlayStation', 'Xbox', 'Nintendo', 'PC'];

/** Compatibilidade com nomes do catálogo original, caminhos locais e URLs externas. */
export function imageUrl(cover: string): string {
  return /^(https?:\/\/|\/)/.test(cover) || cover.includes('/') ? cover : `assets/covers/${cover}`;
}
