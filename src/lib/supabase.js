import { createClient } from '@supabase/supabase-js'

// TODO: Ganti dengan URL dan API Key dari dashboard Supabase Anda
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://acnodfounuteyoamfvtv.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_zCVAP23BvCOY7HTAv0jA6w_8gduz-qp'

export const supabase = createClient(supabaseUrl, supabaseKey)
