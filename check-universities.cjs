require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.COZE_SUPABASE_URL,
  process.env.COZE_SUPABASE_ANON_KEY
);

// Check what columns exist by selecting first row with limited fields
async function checkSchema() {
  console.log('Checking universities table schema...\n');
  
  // Try to get the actual columns by selecting all
  const { data, error } = await supabase
    .from('universities')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Available columns in universities table:');
    Object.keys(data[0]).forEach(col => console.log(`  - ${col}`));
  }
  
  // Also check if degree_types exists
  const { data: degreeData } = await supabase
    .from('universities')
    .select('id, name_en, province, degree_types')
    .limit(3);
  
  console.log('\ndegree_types column check:', degreeData ? 'EXISTS' : 'NOT FOUND');
  if (degreeData) {
    console.log('Sample:', JSON.stringify(degreeData, null, 2));
  }
}

checkSchema();
