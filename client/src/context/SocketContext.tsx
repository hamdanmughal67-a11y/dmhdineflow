import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinRestaurant: (restaurantId: string) => void;
  joinKitchen: (restaurantId: string) => void;
  joinSession: (sessionId: string) => void;
  joinOrder: (orderId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const { user } = useAuth();

  useEffect(() => {
    const defaultBackend = 'https://dmhdineflow-production.up.railway.app';
    const rawUrl = import.meta.env.VITE_API_URL || defaultBackend;
    const socketUrl = rawUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });

    const joinUserRooms = () => {
      if (user?.restaurant_id) {
        if (user.role === 'kitchen_staff') {
          newSocket.emit('join:kitchen', user.restaurant_id);
        } else {
          newSocket.emit('join:restaurant', user.restaurant_id);
        }
      } else if (user?.role === 'super_admin') {
        newSocket.emit('join:admin');
      }
    };

    newSocket.on('connect', () => {
      setIsConnected(true);
      joinUserRooms();
    });

    newSocket.on('reconnect', () => {
      setIsConnected(true);
      joinUserRooms();
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(newSocket);

    if (newSocket.connected) {
      joinUserRooms();
    }

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const joinRestaurant = (restaurantId: string) => {
    if (socket) socket.emit('join:restaurant', restaurantId);
  };

  const joinKitchen = (restaurantId: string) => {
    if (socket) socket.emit('join:kitchen', restaurantId);
  };

  const joinSession = (sessionId: string) => {
    if (socket) socket.emit('join:session', sessionId);
  };

  const joinOrder = (orderId: string) => {
    if (socket) socket.emit('join:order', orderId);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinRestaurant,
        joinKitchen,
        joinSession,
        joinOrder,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
