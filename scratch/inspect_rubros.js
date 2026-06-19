import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jhptluunvyxxclcrqgvv.supabase.co';
const supabaseAnonKey = 'sb_publishable_t2lLpA6uLK6KDCptJh0-vQ_zqRQ3yjj';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('\n--- INSPECTING RUBROS ---');
  const { data, error } = await supabase.from('RUBROS').select('*').limit(2);
  if (error) {
    console.error('Error fetching RUBROS:', error.message);
  } else {
    console.log('RUBROS sample rows:', data);
  }
}

run();
