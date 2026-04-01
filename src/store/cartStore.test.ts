import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../store/cartStore';

describe('cartStore', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it('should add an item to the cart', () => {
    const item = { id: '1', name: 'Test Product', price: 100, image: 'test.jpg' };
    useCartStore.getState().addItem(item);
    
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ ...item, quantity: 1 });
  });

  it('should increment quantity if item already exists', () => {
    const item = { id: '1', name: 'Test Product', price: 100, image: 'test.jpg' };
    useCartStore.getState().addItem(item);
    useCartStore.getState().addItem(item);
    
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  it('should remove an item from the cart', () => {
    const item = { id: '1', name: 'Test Product', price: 100, image: 'test.jpg' };
    useCartStore.getState().addItem(item);
    useCartStore.getState().removeItem('1');
    
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('should calculate total price correctly', () => {
    useCartStore.getState().addItem({ id: '1', name: 'P1', price: 100, image: 'p1.jpg' });
    useCartStore.getState().addItem({ id: '2', name: 'P2', price: 50, image: 'p2.jpg' });
    useCartStore.getState().updateQuantity('1', 2);
    
    expect(useCartStore.getState().getTotalPrice()).toBe(250);
  });
});
