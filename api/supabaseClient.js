const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fetch = require('cross-fetch');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase URL or Key is missing. Knowledge Base feature might not work.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
