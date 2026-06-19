import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jhptluunvyxxclcrqgvv.supabase.co';
const supabaseAnonKey = 'sb_publishable_t2lLpA6uLK6KDCptJh0-vQ_zqRQ3yjj';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data } = await supabase.from('RECETA_MAT').select('*').limit(1);
  if (!data || data.length === 0) {
    console.log("No data");
    return;
  }
  const orig = data[0];
  console.log("Original row:", orig);

  const keys = Object.keys(orig);
  const rubroIdKey = keys.find(k =>
    k.toLowerCase() === 'id_rubro' ||
    k.toLowerCase() === 'rubro_id' ||
    k.toLowerCase() === 'id_rubro_presup' ||
    k.toLowerCase() === 'id'
  ) || 'id_rubro';

  const insumoIdKey = keys.find(k =>
    k.toLowerCase().startsWith('id_insumo') ||
    k.toLowerCase() === 'codigo' ||
    k.toLowerCase() === 'codigo_insumo' ||
    k.toLowerCase() === 'insumo_id' ||
    k.toLowerCase() === 'id'
  ) || 'id_insumo_';

  console.log("Resolved Keys:", {
    rubroIdKey,
    insumoIdKey,
    rubroVal: orig[rubroIdKey],
    insumoVal: orig[insumoIdKey]
  });

  const query = supabase
    .from('RECETA_MAT')
    .delete()
    .eq(rubroIdKey, orig[rubroIdKey])
    .eq(insumoIdKey, orig[insumoIdKey]);

  console.log("Executing simulated delete query...");
  const res = await query;
  console.log("Result:", res);
}

run();
