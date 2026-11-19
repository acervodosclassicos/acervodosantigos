import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { error } = await supabase.from('products').insert([{ title: 'test', slug: 'test', price: 0 }]);
  console.log(error);
}
run();
