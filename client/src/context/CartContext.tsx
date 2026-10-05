import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string; // unique item + variant key
  menu_item_id: string;
  name: string;
  variant_id?: string;
  variant_name?: string;
  unit_price: number;
  quantity: number;
  image?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: {
    menu_item_id: string;
    name: string;
    variant_id?: string;
    variant_name?: string;
    unit_price: number;
    quantity: number;
    image?: string;
  }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  totalCount: number;
  subtotal: number;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerNote: string;
  setCustomerNote: (note: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('dineflow_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [customerName, setCustomerName] = useState<string>(() => localStorage.getItem('dineflow_customer_name') || '');
  const [customerNote, setCustomerNote] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('dineflow_cart', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('dineflow_customer_name', customerName);
  }, [customerName]);

  const addItem = (newItem: {
    menu_item_id: string;
    name: string;
    variant_id?: string;
    variant_name?: string;
    unit_price: number;
    quantity: number;
    image?: string;
  }) => {
    const id = `${newItem.menu_item_id}_${newItem.variant_id || 'base'}`;
    setItems((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing) {
        return prev.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + newItem.quantity } : item
        );
      }
      return [...prev, { ...newItem, id }];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setItems([]);
    setCustomerNote('');
    localStorage.removeItem('dineflow_cart');
  };

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalCount,
        subtotal,
        customerName,
        setCustomerName,
        customerNote,
        setCustomerNote,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
