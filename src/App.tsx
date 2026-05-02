/**
 * FIDELYS — App Root
 * Point d'entrée principal avec React Router
 * Architecture multi-tenant : le slug boutique est dans l'URL
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SuperAdminLayout from './pages/super-admin/SuperAdminLayout';
import LoginPage from './pages/super-admin/LoginPage';
import DashboardPage from './pages/super-admin/DashboardPage';
import ShopsListPage from './pages/super-admin/ShopsListPage';
import GroupsPage from './pages/super-admin/GroupsPage';
import CreateShopPage from './pages/super-admin/CreateShopPage';
import ShopDetailPage from './pages/super-admin/ShopDetailPage';

function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark">
      <div className="text-center animate-fade-in">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl gradient-gold flex items-center justify-center animate-pulse-glow">
          <span className="text-3xl font-bold text-bg-dark font-display">F</span>
        </div>
        <h1 className="text-4xl font-bold font-display text-primary mb-3">
          Fidelys
        </h1>
        <p className="text-text-muted text-lg max-w-md mx-auto">
          Plateforme de fidélité digitale pour boutiques d'Afrique de l'Ouest
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <div className="px-6 py-3 rounded-xl bg-bg-surface border border-border text-text-muted text-sm">
            🚀 Phase 2 — Super Admin Panel Ready
          </div>
          <a
            href="/super-admin/login"
            className="px-6 py-3 rounded-xl gradient-gold text-bg-dark font-medium hover:opacity-90 transition-opacity"
          >
            Super Admin →
          </a>
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark">
      <div className="text-center animate-fade-in">
        <h1 className="text-6xl font-bold text-primary font-display mb-4">404</h1>
        <p className="text-text-muted text-lg">Page introuvable</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Page d'accueil */}
        <Route path="/" element={<HomePage />} />

        {/* Super Admin Panel */}
        <Route path="/super-admin/login" element={<LoginPage />} />
        <Route path="/super-admin" element={<SuperAdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="boutiques" element={<ShopsListPage />} />
          <Route path="boutiques/nouvelle" element={<CreateShopPage />} />
          <Route path="boutiques/:shopId" element={<ShopDetailPage />} />
          <Route path="groupes" element={<GroupsPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
