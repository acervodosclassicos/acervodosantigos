import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('banners').select('*');
  console.log('Error:', error);
  console.log('Banners count:', data?.length);
  console.log('Banners:', JSON.stringify(data, null, 2));
}
run();
