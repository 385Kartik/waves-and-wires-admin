import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Product } from '@/types';
import { toast } from 'sonner';

interface WishlistContextType {
  items: Product[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  toggleItem: (product: Product) => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Product[]>(() => {
    const saved = localStorage.getItem('wishlist');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product: Product) => {
    setItems(prev => {
      if (prev.find(p => p.id === product.id)) return prev;
      return [...prev, product];
    });
    toast.success('Added to wishlist');
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(p => p.id !== productId));
    toast.success('Removed from wishlist');
  }, []);

  const isInWishlist = useCallback((productId: string) => {
    return items.some(p => p.id === productId);
  }, [items]);

  const toggleItem = useCallback((product: Product) => {
    if (items.find(p => p.id === product.id)) {
      removeItem(product.id);
    } else {
      addItem(product);
    }
  }, [items, addItem, removeItem]);

  return (
    <WishlistContext.Provider value={{ items, addItem, removeItem, isInWishlist, toggleItem }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
}
