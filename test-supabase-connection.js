// Quick test script to verify Supabase connection
// Run with: node test-supabase-connection.js

require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase Connection...\n');

if (!SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is missing');
  process.exit(1);
}

if (!SUPABASE_ANON_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
  process.exit(1);
}

console.log('✅ Environment variables found');
console.log('   URL:', SUPABASE_URL);
console.log('   Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...');

// Test connection
fetch(`${SUPABASE_URL}/rest/v1/`, {
  headers: {
    'apikey': SUPABASE_ANON_KEY,
  }
})
  .then(response => {
    if (response.ok) {
      console.log('\n✅ Supabase connection successful!');
    } else {
      console.error('\n❌ Supabase connection failed:', response.status, response.statusText);
    }
  })
  .catch(error => {
    console.error('\n❌ Error connecting to Supabase:', error.message);
  });

