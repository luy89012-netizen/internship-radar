import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[supabase] 未设置 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export type Internship = {
  id: number;
  title: string;
  company: string;
  city: string | null;
  is_remote: boolean;
  category: string | null;
  description: string | null;
  requirements: string | null;
  base_departments: string | null;
  posted_at: string | null;
  deadline: string | null;
  salary: string | null;
  duration: string | null;
  source: 'official' | 'xhs_note' | 'manual';
  source_url: string | null;
  source_company_key: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  contributor_id: number | null;
};

export type Contributor = {
  id: number;
  name: string;
  email: string | null;
};
