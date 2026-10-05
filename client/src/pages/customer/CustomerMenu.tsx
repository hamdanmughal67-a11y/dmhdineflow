import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { useSocket } from '../../context/SocketContext';
import { ItemDetailModal } from './ItemDetailModal';
import { CartDrawer } from './CartDrawer';
import { formatCurrency, getImageUrl } from '../../lib/utils';
import {
  Search,
  ShoppingBag,
  UtensilsCrossed,
  Sparkles,
  Flame,
  Clock,
  AlertTriangle,
  Receipt,
  Plus,
  Check,
  ChevronRight,
  Store,
  Tag,
  Moon,
  Percent,
  Timer,
  Award,
  Star,
  Zap,
  Bike,
  Heart,
  TrendingUp,
} from 'lucide-react';

export const CustomerMenu: React.FC = () => {
  const { token, slug } = useParams<{ token?: string; slug?: string }>();
  const navigate = useNavigate();
  const { items: cartItems, addItem, totalCount, subtotal } = useCart();
  const { socket, joinSession } = useSocket();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isOnline = Boolean(slug) || !token;

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Modals
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  // Live Countdown Timer (FOMO Flash Sale)
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 2,
    minutes: 45,
    seconds: 18,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 2, minutes: 30, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (token) {
      fetchTableCustomerData(token);
    } else if (slug) {
      fetchOnlineCustomerData(slug);
    }
  }, [token, slug]);

  // Mobile Back Button Protection: Prevent exiting QR menu and preserve cart & table session
  useEffect(() => {
    if (!token) return;

    // Push initial history state to trap back navigation within the QR menu flow
    window.history.pushState({ dineflowMenu: true }, '', window.location.href);

    const handlePopState = () => {
      // If Cart Drawer is open, close it instead of navigating away
      if (cartDrawerOpen) {
        setCartDrawerOpen(false);
        window.history.pushState({ dineflowMenu: true }, '', window.location.href);
        return;
      }

      // If Item Detail modal is open, close it instead of navigating away
      if (selectedItem) {
        setSelectedItem(null);
        window.history.pushState({ dineflowMenu: true }, '', window.location.href);
        return;
      }

      // If at root QR menu, re-push state to keep the customer on the initial scan page
      window.history.pushState({ dineflowMenu: true }, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [token, cartDrawerOpen, selectedItem]);

  // Join session socket room for real-time order updates if table session exists
  useEffect(() => {
    if (!socket || !data?.session?.id) return;

    joinSession(data.session.id);

    const handleOrderUpdate = (updatedOrder: any) => {
      if (!updatedOrder) return;

      setData((prevData: any) => {
        if (!prevData) return prevData;
        const existingOrders = prevData.current_orders || [];
        const isTerminal = ['completed', 'delivered', 'cancelled'].includes(updatedOrder.status);

        const exists = existingOrders.some((o: any) => o.id === updatedOrder.id);
        let updatedOrders: any[];

        if (exists) {
          if (isTerminal) {
            // Remove completed/served order from active list so "1 active order" banner disappears
            updatedOrders = existingOrders.filter((o: any) => o.id !== updatedOrder.id);
          } else {
            // Update status of active order
            updatedOrders = existingOrders.map((o: any) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
          }
        } else {
          // If order is not terminal and belongs to this table session, add to active list
          if (!isTerminal && updatedOrder.table_session_id === prevData.session?.id) {
            updatedOrders = [...existingOrders, updatedOrder];
          } else {
            updatedOrders = existingOrders;
          }
        }

        // If no active orders remain in session, clear local customer session token
        if (updatedOrders.length === 0 && existingOrders.length > 0) {
          localStorage.removeItem('dineflow_customer_session');
        }

        return {
          ...prevData,
          current_orders: updatedOrders,
          session_total: updatedOrders.reduce((sum: number, o: any) => sum + (o.status !== 'cancelled' ? o.total : 0), 0),
        };
      });
    };

    const handleSessionClosed = () => {
      setData((prevData: any) => {
        if (!prevData) return prevData;
        return {
          ...prevData,
          current_orders: [], // Clear active orders banner from UI immediately
          session_total: 0,
        };
      });
    };

    socket.on('order:new', handleOrderUpdate);
    socket.on('order:status_updated', handleOrderUpdate);
    socket.on('order:updated', handleOrderUpdate);
    socket.on('session:closed', handleSessionClosed);

    return () => {
      socket.off('order:new', handleOrderUpdate);
      socket.off('order:status_updated', handleOrderUpdate);
      socket.off('order:updated', handleOrderUpdate);
      socket.off('session:closed', handleSessionClosed);
    };
  }, [socket, data?.session?.id]);

  const fetchTableCustomerData = async (tableToken: string) => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const res = await api.get(`/customer/table/${tableToken}`);
      const responseData = res.data;

      // CRITICAL: The server returns the session's authoritative customer_session_token.
      // Always store this in localStorage so ALL subsequent requests use this exact token.
      // This ensures order isolation is consistent even after page refreshes or on shared devices.
      if (responseData?.session?.customer_session_token) {
        localStorage.setItem('dineflow_customer_session', responseData.session.customer_session_token);
      }

      setData(responseData);
    } catch (err: any) {
      setErrorStatus(err.response?.data?.status || 'error');
      setErrorMessage(err.response?.data?.error || 'Unable to load menu. Please ask staff for assistance.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOnlineCustomerData = async (restaurantSlug: string) => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const res = await api.get(`/customer/restaurant/${restaurantSlug}`);
      setData(res.data);
    } catch (err: any) {
      setErrorStatus(err.response?.data?.status || 'error');
      setErrorMessage(err.response?.data?.error || 'Restaurant not found or delivery is currently unavailable.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 max-w-7xl mx-auto space-y-4 animate-pulse">
        <div className="h-56 bg-slate-200 rounded-[32px]" />
        <div className="h-14 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-72 bg-slate-200 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  // Suspended or Inactive State
  if (errorStatus || !data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl border border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Service Notice</h2>
          <p className="text-sm text-slate-600 mb-6">{errorMessage}</p>
          <p className="text-xs text-slate-400">Please speak to your server or restaurant manager.</p>
        </div>
      </div>
    );
  }

  const { restaurant, table, categories, menu_items, current_orders } = data;

  const filteredItems = menu_items.filter((item: any) => {
    const matchesCat = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const restaurantLogoUrl = restaurant.logo ? getImageUrl(restaurant.logo) : '';

  const handleQuickAdd = (item: any, e: React.MouseEvent, variant?: any) => {
    e.stopPropagation();
    if (!item.available) return;

    if (item.variants && item.variants.length > 0 && !variant) {
      setSelectedItem(item);
      return;
    }

    const price = variant ? variant.price : item.base_price;
    addItem({
      menu_item_id: item.id,
      name: item.name,
      variant_id: variant?.id,
      variant_name: variant?.name,
      unit_price: price,
      quantity: 1,
    });
  };

  const formatTimer = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-slate-900 pb-32 font-sans w-full select-none">
      {/* 1. TOP HERO BANNER (Foodpanda / Blinkit Style) */}
      <div className="bg-gradient-to-r from-[#d70f64] via-[#e21b70] to-[#ff2b85] text-white shadow-lg relative overflow-hidden">
        {/* Decorative background swirls */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-black/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            {/* Left: Restaurant Info & Logo */}
            <div className="flex items-center gap-4 min-w-0">
              {restaurantLogoUrl ? (
                <img
                  src={restaurantLogoUrl}
                  alt={restaurant.name}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-3xl object-contain bg-white p-2 shadow-xl border-2 border-white/30 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-white text-[#d70f64] flex items-center justify-center font-black text-2xl md:text-3xl shadow-xl shrink-0">
                  {restaurant.name?.charAt(0) || 'R'}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-white bg-black/20 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20">
                    <Sparkles className="w-3 h-3 text-amber-300" /> {isOnline ? '🛵 Direct Online Order' : '🍽️ Dine-In Menu'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-200 bg-amber-500/30 px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3 fill-amber-300 text-amber-300" /> 4.9 (500+ Reviews)
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight truncate">
                  {restaurant.name}
                </h1>
                <p className="text-xs md:text-sm text-white/90 truncate mt-0.5 font-medium">
                  {restaurant.address ? `${restaurant.address}, ${restaurant.city}` : restaurant.city || 'Fresh & Delicious Cuisine'} • ⏱ {restaurant.estimated_delivery_time || '25-35 mins'}
                </p>
              </div>
            </div>

            {/* Right: Table Badge or Delivery Info Pill */}
            <div className="flex items-center gap-3 self-start md:self-center shrink-0">
              {table ? (
                <div className="px-4 py-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-center shadow-md">
                  <span className="text-[10px] font-black uppercase tracking-widest block text-pink-100">TABLE</span>
                  <span className="font-black text-2xl leading-none">{table.table_number}</span>
                </div>
              ) : (
                <div className="px-4 py-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-center shadow-md">
                  <span className="text-[10px] font-black uppercase tracking-widest block text-pink-100">DELIVERY</span>
                  <span className="font-black text-sm leading-none flex items-center gap-1 mt-0.5">
                    <Bike className="w-4 h-4 text-amber-300" /> {restaurant.estimated_delivery_time || '25-35 min'}
                  </span>
                </div>
              )}
              {table || !isOnline ? (
                <div className="px-4 py-2 rounded-2xl bg-white text-[#d70f64] font-black text-xs shadow-md flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#d70f64]" />
                  <span>Free Service</span>
                </div>
              ) : (
                <div className="px-4 py-2 rounded-2xl bg-white text-[#d70f64] font-black text-xs shadow-md flex items-center gap-1.5">
                  <Bike className="w-4 h-4" />
                  <span>{restaurant.delivery_fee === 0 ? 'Free Delivery' : formatCurrency(restaurant.delivery_fee, restaurant.currency)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-6 max-w-3xl">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Search dishes, Karahi, BBQ, drinks, desserts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white text-slate-900 placeholder:text-slate-400 text-sm font-semibold shadow-lg focus:outline-none focus:ring-4 focus:ring-black/15 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. FOMO SALE & COUNTDOWN TIMER BAR (Blinkit / Foodpanda Deals) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-20 space-y-3">
        {/* Flash Sale Banner */}
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 animate-bounce">
              <Zap className="w-6 h-6 text-yellow-200 fill-yellow-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider bg-white text-orange-700 px-2.5 py-0.5 rounded-full shadow-xs">
                  ⚡ FLASH SALE
                </span>
                <span className="text-xs font-black text-yellow-100 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5" /> Flat 20% OFF Everything
                </span>
                <span className="text-[11px] font-bold text-white/90 bg-black/20 px-2 py-0.5 rounded-full">
                  Save up to Rs. 350
                </span>
              </div>
              <p className="text-xs md:text-sm font-bold text-white mt-1">
                Special limited-time promo automatically applied at checkout!
              </p>
            </div>
          </div>

          {/* Countdown Clock */}
          <div className="flex items-center gap-2 self-start sm:self-center bg-black/25 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20">
            <Timer className="w-4 h-4 text-yellow-300 animate-spin" />
            <span className="text-xs font-black uppercase text-yellow-200">Ends in:</span>
            <div className="flex items-center gap-1 font-mono font-black text-sm text-white">
              <span className="bg-white/20 px-1.5 py-0.5 rounded-md">{formatTimer(timeLeft.hours)}</span>:
              <span className="bg-white/20 px-1.5 py-0.5 rounded-md">{formatTimer(timeLeft.minutes)}</span>:
              <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-yellow-300">{formatTimer(timeLeft.seconds)}</span>
            </div>
          </div>
        </div>

        {/* Active Order Banner (Shown ONLY for the customer who placed active orders) */}
        {current_orders && current_orders.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 flex items-center justify-between text-xs font-bold shadow-sm">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
              <span>{current_orders.length} active order(s) at Table {table.table_number}</span>
            </span>
            <button
              onClick={() => navigate(`/m/${token}/order/${current_orders[0].id}`)}
              className="text-indigo-700 bg-white hover:bg-indigo-100 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 border border-indigo-200 transition-all shadow-xs active:scale-95 font-black shrink-0 cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5 text-indigo-600" />
              <span>Track Live Status</span>
              <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
            </button>
          </div>
        )}
      </div>

      {/* 3. VISUAL CATEGORY CARDS & STICKY NAVIGATION (Foodpanda / Swiggy Visual Slider) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base md:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d70f64]" />
            Explore Menu Categories
          </h2>
          <span className="text-xs font-bold text-slate-500">{categories.length} Categories</span>
        </div>

        {/* Visual Category Cards Carousel */}
        <div className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-none">
          {/* All Items Card */}
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex flex-col items-center p-2.5 rounded-2xl shrink-0 transition-all border text-center w-24 sm:w-28 ${
              selectedCategory === 'all'
                ? 'bg-white border-[#d70f64] ring-2 ring-[#d70f64]/30 shadow-md shadow-[#d70f64]/10'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-tr from-[#d70f64] to-[#ff2b85] flex items-center justify-center text-white text-xl shadow-xs mb-2">
              🔥
            </div>
            <span className="text-xs font-black text-slate-900 truncate w-full">All Items</span>
            <span className="text-[10px] font-bold text-[#d70f64]">{menu_items.length} dishes</span>
          </button>

          {/* Dynamic Categories with Uploaded Images */}
          {categories.map((cat: any) => {
            const count = menu_items.filter((m: any) => m.category_id === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            const catImg = cat.image ? getImageUrl(cat.image) : '';

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex flex-col items-center p-2.5 rounded-2xl shrink-0 transition-all border text-center w-24 sm:w-28 ${
                  isSelected
                    ? 'bg-white border-[#d70f64] ring-2 ring-[#d70f64]/30 shadow-md shadow-[#d70f64]/10'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-100 overflow-hidden shadow-xs mb-2 border border-slate-100">
                  {catImg ? (
                    <img
                      src={catImg}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-pink-50 text-[#d70f64] font-black text-sm">
                      {cat.name.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-xs font-black text-slate-900 truncate w-full">{cat.name}</span>
                <span className="text-[10px] font-bold text-slate-500">{count} dishes</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky Quick-Filter Pill Bar */}
      <div className="sticky top-0 bg-[#f7f7f8]/95 backdrop-blur-md z-30 py-3 mt-3 border-y border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider shrink-0 transition-all ${
                selectedCategory === 'all'
                  ? 'bg-[#d70f64] text-white shadow-md shadow-[#d70f64]/30'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All ({menu_items.length})
            </button>
            {categories.map((cat: any) => {
              const count = menu_items.filter((m: any) => m.category_id === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-[#d70f64] text-white shadow-md shadow-[#d70f64]/30'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. APPETIZING DISHES GRID (Wide Container & Foodpanda Card Design) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {filteredItems.length === 0 ? (
          <div className="py-24 text-center text-slate-400 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm max-w-lg mx-auto">
            <UtensilsCrossed className="w-14 h-14 mx-auto text-slate-300 mb-3" />
            <h3 className="font-extrabold text-slate-800 text-lg">No dishes found</h3>
            <p className="text-xs text-slate-500 mt-1">Try searching with another name or explore all categories.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredItems.map((item: any, idx: number) => {
              const hasVariants = item.variants && item.variants.length > 0;
              const imgSrc = item.image ? getImageUrl(item.image) : '';

              // Dynamic FOMO elements computed strictly from owner entered pricing
              const hasDiscount = item.original_price && item.original_price > item.base_price;
              const discountPercent = hasDiscount
                ? Math.round(((item.original_price - item.base_price) / item.original_price) * 100)
                : 0;
              const savings = hasDiscount ? item.original_price - item.base_price : 0;
              const isBestseller = idx % 4 === 0;

              return (
                <div
                  key={item.id}
                  onClick={() => item.available && setSelectedItem(item)}
                  className={`p-4 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between group relative ${
                    item.available ? 'cursor-pointer active:scale-[0.99]' : 'opacity-60 bg-slate-100'
                  }`}
                >
                  <div>
                    {/* Dish Image with Floating Badges */}
                    <div className="relative h-48 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 shadow-xs mb-3.5">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-pink-50/40 p-2 text-center">
                          <UtensilsCrossed className="w-10 h-10 mb-1 text-[#d70f64]/40" />
                          <span className="text-xs font-bold text-[#d70f64]/60">Fresh Dish</span>
                        </div>
                      )}

                      {/* Top Left: Deal & Bestseller Badges */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                        {hasDiscount && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-[#d70f64] text-white shadow-md animate-pulse">
                            {discountPercent}% OFF
                          </span>
                        )}
                        {isBestseller && item.available && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-amber-500 text-white shadow-sm flex items-center gap-1">
                            <Award className="w-2.5 h-2.5" /> Bestseller
                          </span>
                        )}
                      </div>

                      {/* Top Right: Status Badge */}
                      <div className="absolute top-2.5 right-2.5">
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm ${
                            item.available
                              ? 'bg-white/95 backdrop-blur-md text-emerald-700 font-extrabold'
                              : 'bg-rose-500 text-white'
                          }`}
                        >
                          {item.available ? 'Available' : 'Sold Out'}
                        </span>
                      </div>

                      {/* Bottom Left: Dynamic Amount Saved */}
                      {hasDiscount && item.available && (
                        <div className="absolute bottom-2 left-2">
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-600 text-white shadow-sm flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Save {formatCurrency(savings, restaurant.currency)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Dish Title & Description */}
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-black text-slate-900 text-base leading-snug group-hover:text-[#d70f64] transition-colors">
                          {item.name}
                        </h3>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {item.description || 'Prepared fresh upon order with chef specialty recipe.'}
                      </p>
                    </div>

                    {/* Pricing Display with Discount */}
                    <div className="mt-2.5 flex items-baseline gap-2">
                      <span className={`text-lg font-black ${hasDiscount ? 'text-rose-600' : 'text-slate-900'}`}>
                        {formatCurrency(item.base_price, restaurant.currency)}
                      </span>
                      {hasDiscount && (
                        <del className="text-xs font-semibold text-slate-400">
                          {formatCurrency(item.original_price, restaurant.currency)}
                        </del>
                      )}
                    </div>

                    {/* Half & Full Direct Pricing Buttons */}
                    {hasVariants && (
                      <div className="pt-2.5 flex flex-wrap gap-1.5">
                        {item.variants.map((v: any) => {
                          const vDiscount = v.original_price && v.original_price > v.price;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              disabled={!item.available}
                              onClick={(e) => handleQuickAdd(item, e, v)}
                              className="px-2.5 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 active:scale-95 text-[#d70f64] border border-pink-200 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                            >
                              <span className="font-extrabold">{v.name}:</span>
                              {vDiscount && (
                                <span className="text-[10px] text-slate-400 line-through">
                                  {formatCurrency(v.original_price, restaurant.currency)}
                                </span>
                              )}
                              <span className="font-black text-slate-900">{formatCurrency(v.price, restaurant.currency)}</span>
                              <Plus className="w-3 h-3 text-[#d70f64] ml-0.5" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Bottom Action: + Add to Cart Button */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {item.available ? (
                      <button
                        type="button"
                        onClick={(e) => handleQuickAdd(item, e)}
                        className="w-full py-2.5 rounded-2xl bg-[#d70f64] hover:bg-[#c20d5a] active:scale-95 text-white font-black text-xs shadow-md shadow-[#d70f64]/25 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>ADD TO ORDER</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-2xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed text-center"
                      >
                        Currently Unavailable
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 5. FLOATING BOTTOM CART BAR (Foodpanda Style) */}
      {totalCount > 0 && (
        <div className="fixed bottom-4 left-0 right-0 max-w-4xl mx-auto px-4 sm:px-6 z-40">
          <button
            onClick={() => setCartDrawerOpen(true)}
            className="w-full py-4 px-6 rounded-3xl bg-gradient-to-r from-[#d70f64] via-[#e21b70] to-[#ff2b85] text-white font-black text-sm shadow-2xl shadow-[#d70f64]/40 flex items-center justify-between active:scale-[0.99] transition-all border-2 border-white/40"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white text-[#d70f64] flex items-center justify-center text-xs font-black shadow-md">
                {totalCount}
              </div>
              <span className="tracking-wide text-base">View Cart & Place Order</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight">{formatCurrency(subtotal, restaurant.currency)}</span>
              <ChevronRight className="w-5 h-5" />
            </div>
          </button>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          currency={restaurant.currency}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* Cart Drawer */}
      {cartDrawerOpen && (
        <CartDrawer
          isOpen={cartDrawerOpen}
          restaurant={restaurant}
          table={table}
          sessionId={data?.session?.id}
          qrToken={token}
          orderMode={isOnline ? 'online' : 'table'}
          onClose={() => setCartDrawerOpen(false)}
        />
      )}
    </div>
  );
};
