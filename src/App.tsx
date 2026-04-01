import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Welcome from './pages/Welcome';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Checkout from './pages/Checkout';
import Contact from './pages/Contact';
import Catalog from './pages/Catalog';
import Maletas from './pages/Maletas';
import Carteiras from './pages/Carteiras';
import Acessorios from './pages/Acessorios';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminNewClient from './pages/admin/AdminNewClient';
import AdminAddProduct from './pages/admin/AdminAddProduct';
import AdminAddKit from './pages/admin/AdminAddKit';
import AdminDebts from './pages/admin/AdminDebts';
import AdminFinances from './pages/admin/AdminFinances';
import AdminInventory from './pages/admin/AdminInventory';
import AdminProducts from './pages/admin/AdminProducts';
import AdminClients from './pages/admin/AdminClients';
import AdminEditClient from './pages/admin/AdminEditClient';
import AdminEditProduct from './pages/admin/AdminEditProduct';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminNewSale from './pages/admin/AdminNewSale';
import AdminSalesHistory from './pages/admin/AdminSalesHistory';
import AdminLogs from './pages/admin/AdminLogs';
import ProductDetail from './pages/ProductDetail';
import { Toaster } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen global-bg flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
    </div>
  );

  if (!session) return <Navigate to="/admin" replace />;
  
  return <>{children}</>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <Toaster position="top-right" richColors />
            <Routes>
              <Route path="/" element={<Welcome />} />
              <Route path="/home" element={<Home />} />
              <Route path="/menu" element={<Menu />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/maletas" element={<Maletas />} />
              <Route path="/carteiras" element={<Carteiras />} />
              <Route path="/acessorios" element={<Acessorios />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/products" element={<ProtectedRoute><AdminProducts /></ProtectedRoute>} />
              <Route path="/admin/products/new" element={<ProtectedRoute><AdminAddProduct /></ProtectedRoute>} />
              <Route path="/admin/kits/new" element={<ProtectedRoute><AdminAddKit /></ProtectedRoute>} />
              <Route path="/admin/products/edit/:id" element={<ProtectedRoute><AdminEditProduct /></ProtectedRoute>} />
              <Route path="/admin/clients" element={<ProtectedRoute><AdminClients /></ProtectedRoute>} />
              <Route path="/admin/clients/new" element={<ProtectedRoute><AdminNewClient /></ProtectedRoute>} />
              <Route path="/admin/clients/edit/:id" element={<ProtectedRoute><AdminEditClient /></ProtectedRoute>} />
              <Route path="/admin/finances" element={<ProtectedRoute><AdminFinances /></ProtectedRoute>} />
              <Route path="/admin/debts" element={<ProtectedRoute><AdminDebts /></ProtectedRoute>} />
              <Route path="/admin/inventory" element={<ProtectedRoute><AdminInventory /></ProtectedRoute>} />
              <Route path="/admin/notifications" element={<ProtectedRoute><AdminNotifications /></ProtectedRoute>} />
              <Route path="/admin/sales/new" element={<ProtectedRoute><AdminNewSale /></ProtectedRoute>} />
              <Route path="/admin/sales" element={<ProtectedRoute><AdminSalesHistory /></ProtectedRoute>} />
              <Route path="/admin/logs" element={<ProtectedRoute><AdminLogs /></ProtectedRoute>} />
            </Routes>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
