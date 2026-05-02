/**
 * FIDELYS — App.tsx
 * Point d'entrée principal avec :
 * - AuthProvider wraps tout
 * - ProtectedRoute sur routes admin (super_admin / shop_admin)
 * - ShopProvider sur routes shop-admin (mode admin) et client (mode slug)
 */

import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ShopProvider } from './contexts/ShopContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Super Admin
import SuperAdminLayout from './pages/super-admin/SuperAdminLayout';
import LoginPage from './pages/super-admin/LoginPage';
import DashboardPage from './pages/super-admin/DashboardPage';
import ShopsListPage from './pages/super-admin/ShopsListPage';
import GroupsPage from './pages/super-admin/GroupsPage';
import GroupDetailPage from './pages/super-admin/GroupDetailPage';
import CreateShopPage from './pages/super-admin/CreateShopPage';
import ShopDetailPage from './pages/super-admin/ShopDetailPage';

// Shop Admin
import ShopAdminLoginPage from './pages/shop-admin/ShopAdminLoginPage';
import ShopAdminLayout from './pages/shop-admin/ShopAdminLayout';
import ShopAdminDashboardPage from './pages/shop-admin/ShopAdminDashboardPage';
import CustomersListPage from './pages/shop-admin/CustomersListPage';
import CustomerDetailPage from './pages/shop-admin/CustomerDetailPage';
import CampaignsPage from './pages/shop-admin/CampaignsPage';
import BrandingSettingsPage from './pages/shop-admin/BrandingSettingsPage';
import ProgramSettingsPage from './pages/shop-admin/ProgramSettingsPage';

// Client PWA
import ClientLayout from './pages/client/ClientLayout';
import CardPage from './pages/client/CardPage';
import HistoryPage from './pages/client/HistoryPage';
import QRPage from './pages/client/QRPage';

// Landing & UI
import LandingPage from './pages/LandingPage';
import { ToastContainer } from './components/ui';

// ============================================
// Wrapper components pour injecter les providers contextuels
// ============================================

/**
 * Wrapper Shop-Admin : ShopProvider en mode 'admin'
 * Charge la boutique depuis shop_admins → shops selon le user connecté
 */
function ShopAdminWithProvider() {
  return (
    <ShopProvider mode="admin">
      <ShopAdminLayout />
    </ShopProvider>
  );
}

/**
 * Wrapper Client PWA : ShopProvider en mode 'slug'
 * Extrait le slug de l'URL et charge la boutique correspondante
 */
function ClientWithProvider() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <ShopProvider slug={slug} mode="slug">
      <ClientLayout />
    </ShopProvider>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0C1810' }}>
      <div className="text-center">
        <h1
          className="text-6xl font-bold mb-4"
          style={{
            color: '#0B7B5C',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            letterSpacing: '-2px',
          }}
        >
          404
        </h1>
        <p
          className="text-lg"
          style={{
            color: '#8EA598',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          Page introuvable
        </p>
      </div>
    </div>
  );
}

// ============================================
// App principal
// ============================================

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Accueil */}
          <Route path="/" element={<LandingPage />} />

          {/* ────────────────────────────────── */}
          {/* Super Admin                        */}
          {/* ────────────────────────────────── */}
          <Route path="/super-admin/login" element={<LoginPage />} />
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute requiredRole="super_admin">
                <SuperAdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="boutiques" element={<ShopsListPage />} />
            <Route path="boutiques/nouvelle" element={<CreateShopPage />} />
            <Route path="boutiques/:shopId" element={<ShopDetailPage />} />
            <Route path="groupes" element={<GroupsPage />} />
            <Route path="groupes/:groupId" element={<GroupDetailPage />} />
          </Route>

          {/* ────────────────────────────────── */}
          {/* Shop Admin                         */}
          {/* ────────────────────────────────── */}
          <Route path="/shop-admin/login" element={<ShopAdminLoginPage />} />
          <Route
            path="/shop-admin"
            element={
              <ProtectedRoute requiredRole="shop_admin">
                <ShopAdminWithProvider />
              </ProtectedRoute>
            }
          >
            <Route index element={<ShopAdminDashboardPage />} />
            <Route path="dashboard" element={<ShopAdminDashboardPage />} />
            <Route path="clients" element={<CustomersListPage />} />
            <Route path="clients/:customerId" element={<CustomerDetailPage />} />
            <Route path="campagnes" element={<CampaignsPage />} />
            <Route path="personnalisation" element={<BrandingSettingsPage />} />
            <Route path="programme" element={<ProgramSettingsPage />} />
          </Route>

          {/* ────────────────────────────────── */}
          {/* Client PWA — /client/:slug/c/:cid  */}
          {/* ────────────────────────────────── */}
          <Route path="/client/:slug/c/:customerId" element={<ClientWithProvider />}>
            <Route index element={<CardPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="qr" element={<QRPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ToastContainer />
      </AuthProvider>
    </BrowserRouter>
  );
}
