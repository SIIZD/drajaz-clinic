import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let cachedClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  if (!supabaseUrl || !supabaseAnonKey) {
    // Fallback during build/prerender when env vars are not injected yet
    return createClient('https://placeholder.supabase.co', 'public-anon-key');
  }
  cachedClient = createClient(supabaseUrl, supabaseAnonKey);
  return cachedClient;
}

export const supabase = getSupabaseClient();

export type QueueToken = {
  id: string;
  session_date: string;
  token_number: number;
  patient_name: string;
  patient_phone: string;
  booking_source: 'QR_SCAN' | 'HELPDESK_PHONE' | 'HELPDESK_WALKIN' | 'EMERGENCY';
  status: 'WAITING' | 'IN_CABIN' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';
  fee_amount: number;
  payment_status: 'UNPAID' | 'PAID' | 'WAIVED';
  payment_mode: 'CASH' | 'UPI' | 'NONE';
  sort_order: number;
  is_emergency: boolean;
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
};

export function getTodayIST(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
}

export function getTodayFee(): number {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.getUTCDay() === 0 ? 400 : 300;
}