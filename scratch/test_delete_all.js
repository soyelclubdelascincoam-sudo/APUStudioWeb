import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jhptluunvyxxclcrqgvv.supabase.co';
const supabaseAnonKey = 'sb_publishable_t2lLpA6uLK6KDCptJh0-vQ_zqRQ3yjj';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTable(tableName) {
  console.log(`\n--- Testing delete on ${tableName} ---`);
  const { data, error } = await supabase.from(tableName).select('*').limit(1);
  if (error) {
    console.error(`Error fetching from ${tableName}:`, error);
    return;
  }
  if (!data || data.length === 0) {
    console.log(`No rows to delete in ${tableName}.`);
    return;
  }

  const row = data[0];
  console.log(`Found row:`, row);

  // Try to delete it
  const { error: deleteError, status } = await supabase
    .from(tableName)
    .delete()
    .eq('id_rubro', row.id_rubro)
    .eq('id_insumo_', row.id_insumo_);

  if (deleteError) {
    console.error(`❌ Deletion FAILED on ${tableName}:`, deleteError);
  } else {
    console.log(`✅ Deletion SUCCEEDED on ${tableName} (Status ${status})`);
  }
}

async function run() {
  const tables = ['RECETA_MAT', 'RECETA_MOB', 'RECETA_EYH', 'RECETA_TRANSP'];
  for (const table of tables) {
    await testTable(table);
  }
}

run();
