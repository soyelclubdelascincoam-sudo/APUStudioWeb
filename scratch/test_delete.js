import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jhptluunvyxxclcrqgvv.supabase.co';
const supabaseAnonKey = 'sb_publishable_t2lLpA6uLK6KDCptJh0-vQ_zqRQ3yjj';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Fetching one row to test delete...");
  const { data, error } = await supabase.from('RECETA_MAT').select('*').limit(1);
  if (error) {
    console.error("Error fetching data:", error);
    return;
  }
  if (!data || data.length === 0) {
    console.log("No data found in RECETA_MAT.");
    return;
  }

  const row = data[0];
  console.log("Row to test delete:", row);

  console.log("Attempting to delete this row...");
  const deleteResult = await supabase
    .from('RECETA_MAT')
    .delete()
    .eq('id_rubro', row.id_rubro)
    .eq('id_insumo_', row.id_insumo_);

  console.log("Delete result:", deleteResult);
}

run();
