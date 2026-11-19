import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem } from '../types';

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find(item => item.product.id === product.id);
          
          // Verify stock limit
          const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;
          if (newQuantity > product.stock) {
             // In a real app we might throw or show a toast here, 
             // but we'll cap it at max stock for now.
             if (existingItem) {
               return {
                 items: state.items.map(item =>
                   item.product.id === product.id
                     ? { ...item, quantity: product.stock }
                     : item
                 ),
               };
             } else {
               return { items: [...state.items, { product, quantity: product.stock }] };
             }
          }

          if (existingItem) {
            return {
              items: state.items.map(item =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }
          return { items: [...state.items, { product, quantity }] };
        });
      },
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter(item => item.product.id !== productId),
        }));
      },
      updateQuantity: (productId, quantity) => {
        set((state) => {
          const itemToUpdate = state.items.find(item => item.product.id === productId);
          if (!itemToUpdate) return state;
          
          const maxStock = itemToUpdate.product.stock;
          const safeQuantity = Math.max(1, Math.min(quantity, maxStock));

          return {
            items: state.items.map(item =>
              item.product.id === productId
                ? { ...item, quantity: safeQuantity }
                : item
            ),
          };
        });
      },
      clearCart: () => set({ items: [] }),
      getCartTotal: () => {
        return get().items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
      },
    }),
    {
      name: 'acervo-cart',
    }
  )
);
