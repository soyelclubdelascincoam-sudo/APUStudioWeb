import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jhptluunvyxxclcrqgvv.supabase.co';
const supabaseAnonKey = 'sb_publishable_t2lLpA6uLK6KDCptJh0-vQ_zqRQ3yjj';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const tables = ['RECETA_MAT', 'RECETA_MOB', 'RECETA_EYH', 'RECETA_TRANSP', 'RECETA_TRASNP'];
  for (const table of tables) {
    console.log(`\n--- INSPECTING ${table} ---`);
    const { data, error } = await supabase.from(table).select('*').limit(2);
    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
    } else {
      console.log(`${table} sample rows:`, data);
    }
  }
}

run();
