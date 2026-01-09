/**
 * Test script to check RLS policies and test writing to user_tokens
 * This simulates what happens when saveGoogleCalendarTokens is called
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testWrite() {
  console.log('🧪 Testing write to user_tokens table...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Check current auth state
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.log('⚠️  Not authenticated (this is expected if running from CLI)');
    console.log('   In the web app, you must be logged in for saveGoogleCalendarTokens to work');
    console.log('');
    console.log('📋 Environment Variables Status:');
    console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
    console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);
    console.log('');
    console.log('✅ Your env vars are set correctly!');
    console.log('');
    console.log('🔍 To write tokens, you need:');
    console.log('   1. ✅ NEXT_PUBLIC_SUPABASE_URL (you have it)');
    console.log('   2. ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY (you have it)');
    console.log('   3. ✅ User must be logged in (in web browser)');
    console.log('   4. ⚠️  RLS policies must allow INSERT/UPDATE');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Make sure you\'re logged in on web');
    console.log('   2. Go to Settings → Connect Google Calendar');
    console.log('   3. Check browser console for errors');
    console.log('   4. If you see RLS errors, run the SQL in check-rls-policies.sql');
  } else {
    console.log(`✅ Authenticated as user: ${user.id}`);
    console.log('   Testing write operation...');
    
    // Try to write a test token (this will fail if RLS blocks it)
    const { data, error } = await supabase
      .from('user_tokens')
      .upsert({
        user_id: user.id,
        google_access_token: 'test_token_' + Date.now(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select();

    if (error) {
      console.log(`❌ Write failed: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      if (error.code === '42501' || error.message.includes('policy')) {
        console.log('');
        console.log('⚠️  RLS Policy Error!');
        console.log('   The table exists but RLS policies are blocking writes.');
        console.log('   Run the SQL in check-rls-policies.sql in Supabase SQL Editor');
      }
    } else {
      console.log('✅ Write successful!');
      console.log('   RLS policies are working correctly');
    }
  }
}

testWrite().catch(console.error);
