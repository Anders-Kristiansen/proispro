import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://odqhusmmqgipvazusrxs.supabase.co'
const SUPABASE_ANON = 'sb_publishable_p0KpjMepMloZb6SI-y6ang_2uzbdQ9U'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
