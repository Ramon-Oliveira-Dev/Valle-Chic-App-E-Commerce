import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';
import { supabase } from '../lib/supabase';

describe('api service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('products', () => {
    it('should fetch product stats correctly', async () => {
      const mockProducts = [
        { stock: 10, cost_price: 100 },
        { stock: 5, cost_price: 200 },
      ];
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
      });

      const stats = await api.products.getStats();
      expect(stats.totalStock).toBe(15);
      expect(stats.stockValue).toBe(2000);
    });

    it('should handle errors when fetching stats', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') }),
      });

      await expect(api.products.getStats()).rejects.toThrow('DB Error');
    });
  });

  describe('sales', () => {
    it('should calculate accounts receivable correctly', async () => {
      const mockSales = [
        { total_amount: 1000, amount_paid: 800 },
        { total_amount: 500, amount_paid: 500 },
        { total_amount: 200, amount_paid: 0 },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockSales, error: null }),
      });

      const toReceive = await api.sales.getAccountsReceivable();
      expect(toReceive).toBe(400); // (1000-800) + (500-500) + (200-0) = 200 + 0 + 200 = 400
    });
  });
});
