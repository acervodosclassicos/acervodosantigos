-- ACERVO DOS ANTIGOS: Supabase Schema

-- Habilitar extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Site Settings
CREATE TABLE site_settings (
  id SERIAL PRIMARY KEY,
  site_name TEXT DEFAULT 'ACERVO DOS ANTIGOS',
  whatsapp TEXT,
  phone TEXT,
  email TEXT,
  cnpj TEXT,
  address TEXT,
  scroll_message TEXT DEFAULT '🚚 FRETE GRÁTIS • 🔒 COMPRA SEGURA • 💳 PIX E CARTÃO • 📦 ENVIO PELA RODONAVES E JADLOG • 📲 ATENDIMENTO VIA WHATSAPP',
  instagram TEXT,
  facebook TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings row
INSERT INTO site_settings (id, site_name) VALUES (1, 'ACERVO DOS ANTIGOS') ON CONFLICT DO NOTHING;

-- 2. Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  previous_price DECIMAL(10, 2),
  stock INTEGER DEFAULT 0,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  brand TEXT,
  model TEXT,
  vehicle TEXT,
  year TEXT,
  part_code TEXT,
  condition TEXT DEFAULT 'Usado', -- 'Novo', 'Usado', 'Restaurado'
  compatibility TEXT,
  notes TEXT,
  badge TEXT, -- 'DESTAQUE', 'NOVIDADE', 'ESGOTADO', etc
  status TEXT DEFAULT 'ativo', -- 'rascunho', 'ativo', 'pausado', 'esgotado'
  payment_link TEXT, -- External payment link
  require_shipping BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Product Images
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Banners
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT,
  subtitle TEXT,
  button_text TEXT,
  link TEXT,
  desktop_image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for guest checkouts if needed, but we'll enforce auth eventually
  status TEXT DEFAULT 'aguardando pagamento', -- 'aguardando pagamento', 'pagamento confirmado', 'preparando envio', 'enviado', 'entregue', 'cancelado'
  subtotal DECIMAL(10, 2) NOT NULL,
  shipping_cost DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  
  -- Snapshot of customer info at the time of order
  customer_name TEXT NOT NULL,
  customer_cpf TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  
  -- Snapshot of address
  address_cep TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  
  tracking_code TEXT,
  tracking_url TEXT,
  payment_link TEXT, -- Captured from the items/general checkout logic
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Order Items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  product_title TEXT NOT NULL -- Snapshot of the name just in case the product is deleted
);

-- 8. User Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  cpf TEXT,
  role TEXT DEFAULT 'customer', -- 'customer', 'admin'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Access
CREATE POLICY "Public can read site settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Public can read active categories" ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read active products" ON products FOR SELECT USING (status = 'ativo' OR status = 'esgotado');
CREATE POLICY "Public can read product images" ON product_images FOR SELECT USING (true);
CREATE POLICY "Public can read active banners" ON banners FOR SELECT USING (is_active = true);

-- 2. Customer Access
-- Customers can read their own profile
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Customers and guests can create and read orders
DROP POLICY IF EXISTS "Users can read own orders" ON orders;
CREATE POLICY "Users can read own orders" ON orders FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Anyone can insert orders" ON orders;
CREATE POLICY "Anyone can insert orders" ON orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own order items" ON order_items;
CREATE POLICY "Users can read own order items" ON order_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert order items" ON order_items;
CREATE POLICY "Anyone can insert order items" ON order_items FOR INSERT WITH CHECK (true);

-- 3. Admin Access
-- For simplicity in this script, we assume 'admin' role in profiles allows ALL operations.
-- A helper function to check if the current user is an admin:
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Apply admin policies (Admins can do everything)
CREATE POLICY "Admins can do everything on site_settings" ON site_settings USING (is_admin());
CREATE POLICY "Admins can do everything on categories" ON categories USING (is_admin());
CREATE POLICY "Admins can do everything on products" ON products USING (is_admin());
CREATE POLICY "Admins can do everything on product_images" ON product_images USING (is_admin());
CREATE POLICY "Admins can do everything on banners" ON banners USING (is_admin());
CREATE POLICY "Admins can do everything on orders" ON orders USING (is_admin());
CREATE POLICY "Admins can do everything on order_items" ON order_items USING (is_admin());
CREATE POLICY "Admins can do everything on profiles" ON profiles USING (is_admin());

-- Setup Admin Trigger (Optional, to create a profile automatically when a user signs up)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

