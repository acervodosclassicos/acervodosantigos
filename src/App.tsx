import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from './store/useAuth';

// Layouts
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout';

// Public Pages
// ... (imports remain)
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import PaymentConfirmed from './pages/PaymentConfirmed';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Products from './pages/Products';
import NotFound from './pages/NotFound';

// Institutional
import About from './pages/institutional/About';
import HowToBuy from './pages/institutional/HowToBuy';
import Security from './pages/institutional/Security';
import Privacy from './pages/institutional/Privacy';
import Terms from './pages/institutional/Terms';
import Legality from './pages/institutional/Legality';

// Account
import MyAccount from './pages/account/MyAccount';
import OrderDetails from './pages/account/OrderDetails';
import Favorites from './pages/account/Favorites';

// Admin Pages
import AdminProducts from './pages/admin/AdminProducts';
import AdminProductForm from './pages/admin/AdminProductForm';
import AdminOrders from './pages/admin/AdminOrders';
import AdminBanners from './pages/admin/AdminBanners';
import AdminSettings from './pages/admin/AdminSettings';
import AdminFeedbacks from './pages/admin/AdminFeedbacks';
import AdminDiagnostics from './pages/admin/AdminDiagnostics';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AdminProductFormRoute() {
  const { id } = useParams();
  return <AdminProductForm key={id || 'novo'} />;
}

export default function App() {
  const { initialize, isInitialized } = useAuth();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="produtos" element={<Products />} />
          <Route path="buscar" element={<Products />} />
          <Route path="categoria/:slug" element={<Products />} />
          <Route path="produto/:slug" element={<ProductDetails />} />
          <Route path="carrinho" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="pedido-confirmado" element={<OrderConfirmation />} />
          <Route path="pagamento-confirmado" element={<PaymentConfirmed />} />
          <Route path="login" element={<Login />} />
          <Route path="cadastro" element={<Register />} />
          <Route path="recuperar-senha" element={<ForgotPassword />} />
          <Route path="redefinir-senha" element={<ResetPassword />} />
          
          {/* Institutional Routes */}
          <Route path="sobre" element={<About />} />
          <Route path="como-comprar" element={<HowToBuy />} />
          <Route path="seguranca" element={<Security />} />
          <Route path="privacidade" element={<Privacy />} />
          <Route path="termos" element={<Terms />} />
          <Route path="legalidade" element={<Legality />} />

          {/* Account Routes */}
          <Route path="minha-conta" element={<MyAccount />} />
          <Route path="meus-pedidos" element={<MyAccount />} />
          <Route path="favoritos" element={<Favorites />} />
          <Route path="pedido/:id" element={<OrderDetails />} />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
           <Route index element={<AdminProducts />} />
           <Route path="produtos/novo" element={<AdminProductFormRoute />} />
           <Route path="produtos/editar/:id" element={<AdminProductFormRoute />} />
           <Route path="pedidos" element={<AdminOrders />} />
           <Route path="banners" element={<AdminBanners />} />
           <Route path="configuracoes" element={<AdminSettings />} />
           <Route path="feedbacks" element={<AdminFeedbacks />} />
           <Route path="diagnostico" element={<AdminDiagnostics />} />
        </Route>
      </Routes>
    </Router>
  );
}

