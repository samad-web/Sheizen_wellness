import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const { data } = await s.from('profiles').select('email');
console.log('Profiles:', data);
const { data: roles } = await s.from('user_roles').select('*');
console.log('Roles:', roles);
