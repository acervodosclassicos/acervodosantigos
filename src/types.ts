export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  previous_price: number | null;
  stock: number;
  category_id: string | null;
  brand: string | null;
  model: string | null;
  vehicle: string | null;
  year: string | null;
  part_code: string | null;
  condition: string;
  compatibility: string | null;
  notes: string | null;
  badge: string | null;
  status: 'rascunho' | 'ativo' | 'pausado' | 'esgotado';
  payment_link: string | null;
  payment_methods?: string[] | null;
  require_shipping?: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  // Joins
  images?: ProductImage[];
  category?: Category;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  button_text: string | null;
  link: string | null;
  desktop_image_url: string;
  mobile_image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface SiteSettings {
  id: number;
  site_name: string;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  cnpj: string | null;
  address: string | null;
  scroll_message: string | null;
  instagram: string | null;
  facebook: string | null;
}

export interface Feedback {
  id: string;
  name: string;
  text: string;
  rating: number;
  vehicle: string | null;
  photo_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id?: string;
  product_title: string;
  quantity: number;
  price: number;
  image_url?: string | null;
}

export interface Order {
  id: string;
  user_id?: string | null;
  status: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  customer_name: string;
  customer_cpf: string;
  customer_email: string;
  customer_phone: string;
  address_cep: string;
  address_street: string;
  address_number: string;
  address_complement?: string | null;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  payment_link?: string | null;
  created_at: string;
  updated_at?: string;
  total_amount?: number;
  items?: OrderItem[];
}
