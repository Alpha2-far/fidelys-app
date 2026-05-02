import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ShopProvider } from './contexts/ShopContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastContainer } from './components/ui';

// ── Lazy-loaded pages (code-split by route) ───────────────────────────────────

// Landing
const LandingPage = lazy(() => import('./pages/LandingPage'));

// Super Admin
const LoginPage          = lazy(() => import('./pages/super-admin/LoginPage'));
const SuperAdminLayout   = lazy(() => import('./pages/super-admin/SuperAdminLayout'));
const DashboardPage      = lazy(() => import('./pages/super-admin/DashboardPage'));
const ShopsListPage      = lazy(() => import('./pages/super-admin/ShopsListPage'));
const GroupsPage         = lazy(() => import('./pages/super-admin/GroupsPage'));
const GroupDetailPage    = lazy(() => import('./pages/super-admin/GroupDetailPage'));
const CreateShopPage     = lazy(() => import('./pages/super-admin/CreateShopPage'));
const ShopDetailPage     = lazy(() => import('./pages/super-admin/ShopDetailPage'));

// Shop Admin
const ShopAdminLoginPage     = lazy(() => import('./pages/shop-admin/ShopAdminLoginPage'));
const ShopAdminLayout        = lazy(() => import('./pages/shop-admin/ShopAdminLayout'));
const ShopAdminDashboardPage = lazy(() => import('./pages/shop-admin/ShopAdminDashboardPage'));
const CustomersListPage      = lazy(() => import('./pages/shop-admin/CustomersListPage'));
const CustomerDetailPage     = lazy(() => import('./pages/shop-admin/CustomerDetailPage'));
const CampaignsPage          = lazy(() => import('./pages/shop-admin/CampaignsPage'));
const BrandingSettingsPage   = lazy(() => import('./pages/shop-admin/BrandingSettingsPage'));
const ProgramSettingsPage    = lazy(() => import('./pages/shop-admin/ProgramSettingsPage'));

// Client PWA
const ClientLayout = lazy(() => import('./pages/client/ClientLayout'));
const CardPage     = lazy(() => import('./pages/client/CardPage'));
const HistoryPage  = lazy(() => import('./pages/client/HistoryPage'));
const QRPage       = lazy(() => import('./pages/client/QRPage'));

// ── Loading fallback ──────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div style={{
      minHeight:      '100dvh',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      background:     '#0C1810',
    }}>
      <style>{`
        @keyframes _spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={{
        width:       36,
        height:      36,
        borderRadius:'50%',
        border:      '3px solid rgba(11,123,92,0.2)',
        borderTopColor: '#0B7B5C',
        animation:   '_spin 0.75s linear infinite',
      }} />
    </div>
  );
}

// ── Context wrappers ──────────────────────────────────────────────────────────

function ShopAdminWithProvider() {
  return (
    <ShopProvider mode="admin">
      <ShopAdminLayout />
    </ShopProvider>
  );
}

function ClientWithProvider() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <ShopProvider slug={slug} mode="slug">
      <ClientLayout />
    </ShopProvider>
  );
}

// ── 404 ───────────────────────────────────────────────────────────────────────

function NotFound() {
  return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0C1810' }}>
      <div style={{ textAlign:'center' }}>
        <h1 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:72, fontWeight:800, color:'#0B7B5C', letterSpacing:'-3px', lineHeight:1 }}>
          404
        </h1>
        <p style={{ fontFamily:"'Outfit',sans-serif", fontSize:16, color:'#8EA598', marginTop:12 }}>
          Page introuvable
        </p>
        <a href="/" style={{ display:'inline-block', marginTop:24, fontSize:14, color:'#13A87D', fontFamily:"'Outfit',sans-serif", textDecoration:'none' }}>
          ← Retour à l'accueil
        </a>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>

            {/* Landing */}
            <Route path="/" element={<LandingPage />} />

            {/* Super Admin */}
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

            {/* Shop Admin */}
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

            {/* Client PWA */}
            <Route path="/client/:slug/c/:customerId" element={<ClientWithProvider />}>
              <Route index element={<CardPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="qr" element={<QRPage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />

          </Routes>
        </Suspense>
        <ToastContainer />
      </AuthProvider>
    </BrowserRouter>
  );
}
