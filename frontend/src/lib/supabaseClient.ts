import { createClient } from '@supabase/supabase-js';

// URL-er sheshe jeno Slash (/) na thake ebong env variable dynamic load hoy
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dyodvvklgjhhswkxtlah.supabase.co/rest/v1';
const supabaseUrl = rawUrl.replace(/\/$/, ''); 

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5b2R2dmtsZ2poaHN3a3h0bGFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNzI4MzIsImV4cCI6MjEwNzc0ODgzMn0.vP0N3PSjdhdcu85LBeneOclKKlP4l8cUtdKkFKLVuco';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);