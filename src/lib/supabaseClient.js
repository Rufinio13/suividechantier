import { createClient } from '@supabase/supabase-js';

// ✅ Récupère les variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// ✅ Crée le client Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);
