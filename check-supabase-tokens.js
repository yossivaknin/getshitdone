/**
 * Diagnostic script to check Supabase connection and user_tokens table
 * Run with: node check-supabase-tokens.js
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

async function checkSupabase() {
  console.log('🔍 Checking Supabase connection and user_tokens table...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('📋 Environment Variables:');
  console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set (' + supabaseUrl.substring(0, 30) + '...)' : '❌ Missing'}`);
  console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set (' + supabaseAnonKey.substring(0, 20) + '...)' : '❌ Missing'}`);
  console.log('');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing required environment variables!');
    console.error('   Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Test connection
  console.log('🔌 Testing Supabase connection...');
  try {
    const { data: healthCheck, error: healthError } = await supabase
      .from('user_tokens')
      .select('count')
      .limit(0);

    if (healthError && healthError.code === 'PGRST116') {
      console.log('  ⚠️  Table might not exist (PGRST116 = table not found)');
    } else if (healthError) {
      console.log(`  ❌ Connection error: ${healthError.message} (code: ${healthError.code})`);
    } else {
      console.log('  ✅ Connection successful!');
    }
  } catch (error) {
    console.log(`  ❌ Connection failed: ${error.message}`);
    process.exit(1);
  }

  console.log('');

  // Check if table exists by trying to query it
  console.log('📊 Checking user_tokens table...');
  try {
    const { data, error } = await supabase
      .from('user_tokens')
      .select('*')
      .limit(10);

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log('  ❌ Table "user_tokens" does NOT exist!');
        console.log('');
        console.log('  📝 To create the table, run this SQL in Supabase SQL Editor:');
        console.log('');
        console.log(`    CREATE TABLE IF NOT EXISTS user_tokens (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      google_access_token TEXT,
      google_refresh_token TEXT,
      token_expires_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`);
        console.log('');
        console.log('    -- Enable RLS (Row Level Security)');
        console.log('    ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;');
        console.log('');
        console.log('    -- Policy: Users can only see/edit their own tokens');
        console.log(`    CREATE POLICY "Users can view own tokens" ON user_tokens
      FOR SELECT USING (auth.uid() = user_id);`);
        console.log('');
        console.log(`    CREATE POLICY "Users can insert own tokens" ON user_tokens
      FOR INSERT WITH CHECK (auth.uid() = user_id);`);
        console.log('');
        console.log(`    CREATE POLICY "Users can update own tokens" ON user_tokens
      FOR UPDATE USING (auth.uid() = user_id);`);
      } else {
        console.log(`  ❌ Error querying table: ${error.message} (code: ${error.code})`);
        console.log(`     Details: ${JSON.stringify(error, null, 2)}`);
      }
    } else {
      console.log(`  ✅ Table exists!`);
      console.log(`  📈 Found ${data.length} row(s) in user_tokens table`);
      console.log('');

      if (data.length === 0) {
        console.log('  ⚠️  Table is empty - no tokens stored yet');
        console.log('     Connect Google Calendar on web to save tokens');
      } else {
        console.log('  📋 Current tokens in table:');
        data.forEach((row, index) => {
          console.log(`\n  Row ${index + 1}:`);
          console.log(`    user_id: ${row.user_id}`);
          console.log(`    has_access_token: ${!!row.google_access_token} (${row.google_access_token ? row.google_access_token.substring(0, 20) + '...' : 'null'})`);
          console.log(`    has_refresh_token: ${!!row.google_refresh_token} (${row.google_refresh_token ? row.google_refresh_token.substring(0, 20) + '...' : 'null'})`);
          console.log(`    token_expires_at: ${row.token_expires_at || 'null'}`);
          console.log(`    updated_at: ${row.updated_at || 'null'}`);
          console.log(`    created_at: ${row.created_at || 'null'}`);
        });
      }
    }
  } catch (error) {
    console.log(`  ❌ Exception: ${error.message}`);
    console.log(`     Stack: ${error.stack}`);
  }

  console.log('');
  console.log('✅ Diagnostic complete!');
}

checkSupabase().catch(console.error);
