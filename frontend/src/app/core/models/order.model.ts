export interface OrderItem { gameId: number | null; title: string; platform: string; priceCents: number; }
export interface Order {
  id: number;
  paymentMethod: 'pix' | 'cartao';
  totalCents: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}
