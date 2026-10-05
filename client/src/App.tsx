import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import { AdminLayout } from './components/layout/AdminLayout';
import { OwnerLayout } from './components/layout/OwnerLayout';
import { KitchenLayout } from './components/layout/KitchenLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { RestaurantsPage } from './pages/admin/RestaurantsPage';
import { CreateRestaurantPage } from './pages/admin/CreateRestaurantPage';
import { RestaurantDetailPage } from './pages/admin/RestaurantDetailPage';
import { SubscriptionsPage } from './pages/admin/SubscriptionsPage';
import { PaymentsPage } from './pages/admin/PaymentsPage';
import { BackupsPage } from './pages/admin/BackupsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

// Owner Pages
import { OwnerDashboard } from './pages/owner/OwnerDashboard';
import { OrdersPage } from './pages/owner/OrdersPage';
import { CategoriesPage } from './pages/owner/CategoriesPage';
import { MenuItemsPage } from './pages/owner/MenuItemsPage';
import { TablesPage } from './pages/owner/TablesPage';
import { QRCodesPage } from './pages/owner/QRCodesPage';
import { ReportsPage } from './pages/owner/ReportsPage';
import { SettingsPage } from './pages/owner/SettingsPage';

// Kitchen Pages
import { KitchenDashboard } from './pages/kitchen/KitchenDashboard';

// Customer QR Pages
import { CustomerMenu } from './pages/customer/CustomerMenu';
import { OrderTracking } from './pages/customer/OrderTracking';
import { TableSessionSummary } from './pages/customer/TableSessionSummary';

// Strict Role-Based Protected Route Wrapper
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles: ('super_admin' | 'restaurant_owner' | 'kitchen_staff')[];
}> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Enforce strict RBAC: If role not allowed, redirect directly to their respective safe panel
  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'kitchen_staff') {
      return <Navigate to="/kitchen/orders" replace />;
    }
    if (user.role === 'restaurant_owner') {
      return <Navigate to="/owner/dashboard" replace />;
    }
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth */}
      <Route path="/login" element={<LoginPage />} />

      {/* Public Mobile Customer QR Routes */}
      <Route path="/m/:token" element={<CustomerMenu />} />
      <Route path="/m/:token/order/:orderId" element={<OrderTracking />} />
      <Route path="/m/:token/session" element={<TableSessionSummary />} />

      {/* Public Direct Online Ordering & Tracking Routes */}
      <Route path="/r/:slug" element={<CustomerMenu />} />
      <Route path="/track/:orderId" element={<OrderTracking />} />

      {/* Super Admin Routes (STRICT: super_admin ONLY) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="restaurants" element={<RestaurantsPage />} />
        <Route path="restaurants/new" element={<CreateRestaurantPage />} />
        <Route path="restaurants/:id" element={<RestaurantDetailPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="backups" element={<BackupsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* Restaurant Owner Routes (STRICT: super_admin or restaurant_owner ONLY) */}
      <Route
        path="/owner"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'restaurant_owner']}>
            <OwnerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/owner/dashboard" replace />} />
        <Route path="dashboard" element={<OwnerDashboard />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="menu-items" element={<MenuItemsPage />} />
        <Route path="tables" element={<TablesPage />} />
        <Route path="qr-codes" element={<QRCodesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Kitchen Display System (STRICT: kitchen_staff or restaurant_owner or super_admin) */}
      <Route
        path="/kitchen"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'restaurant_owner', 'kitchen_staff']}>
            <KitchenLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/kitchen/orders" replace />} />
        <Route path="orders" element={<KitchenDashboard />} />
      </Route>

      {/* Direct Restaurant Online Order Storefront (e.g. /karachi-biryani-center) */}
      <Route path="/:slug" element={<CustomerMenu />} />

      {/* Catch-all Redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};
