import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('banners').upsert({
    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    title: 'PRECISA DE AJUDA?',
    desktop_image_url: 'https://example.com/img.jpg',
    sort_order: 9999
  });
  console.log('Error:', error);
  console.log('Data:', data);
}
run();
