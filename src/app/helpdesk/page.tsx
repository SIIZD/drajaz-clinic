'use client';

import { useState } from 'react';
import { supabase, getTodayIST, getTodayFee, QueueToken } from '@/lib/supabase';
import { useLiveQueue } from '@/hooks/useLiveQueue';
import { PhoneCall, AlertTriangle, IndianRupee, CheckCircle } from 'lucide-react';

export default function HelpdeskPage() {
  const { tokens, refetch } = useLiveQueue();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState<'HELPDESK_PHONE' | 'HELPDESK_WALKIN'>('HELPDESK_PHONE');
  const [isEmergency, setIsEmergency] = useState(false);
  const [busy, setBusy] = useState(false);

  const activeTokens = tokens.filter((t) => t.status === 'WAITING' || t.status === 'IN_CABIN');

  const handleManualBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setBusy(true);

    const sessionDate = getTodayIST();
    const maxTokenNum = tokens.reduce((max, t) => Math.max(max, t.token_number), 0);
    const minSort = activeTokens.reduce((min, t) => Math.min(min, t.sort_order), 100);
    const maxSort = tokens.reduce((max, t) => Math.max(max, t.sort_order), 0);

    await supabase.from('queue_tokens').insert({
      session_date: sessionDate,
      token_number: maxTokenNum + 1,
      patient_name: name.trim(),
      patient_phone: phone.trim(),
      booking_source: isEmergency ? 'EMERGENCY' : source,
      status: 'WAITING',
      fee_amount: getTodayFee(),
      payment_status: 'UNPAID',
      payment_mode: 'NONE',
      sort_order: isEmergency ? minSort - 10 : maxSort + 10,
      is_emergency: isEmergency,
    });

    setName('');
    setPhone('');
    setIsEmergency(false);
    setBusy(false);
    refetch();
  };

  const markPaid = async (token: QueueToken, mode: 'CASH' | 'UPI') => {
    await supabase
      .from('queue_tokens')
      .update({ payment_status: 'PAID', payment_mode: mode })
      .eq('id', token.id);
    refetch();
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 p-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <header className="bg-blue-700 text-white rounded-2xl p-5 flex items-center justify-between">
          <div>
            <PhoneCall className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-blue-100">Dr. Ajaz Clinic • Chhatrapati Sambhajinagar</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-blue-200">Active Queue</div>
            <div className="text-2xl font-extrabold">{activeTokens.length}</div>
          </div>
        </header>

        <form
          onSubmit={handleManualBook}
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <PhonePlus className="w-4 h-4 text-blue-600" />
              Add Phone / Walk-In / Emergency Patient
            </h2>
            <span className="text-xs font-semibold text-slate-500">Fee: ₹{getTodayFee()}</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Patient Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
            <input
              type="tel"
              required
              maxLength={10}
              placeholder="10-Digit Mobile Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSource('HELPDESK_PHONE')}
                className={`px-3 py-1.5 rounded-lg font-medium border ${
                  source === 'HELPDESK_PHONE'
                    ? 'bg-blue-50 border-blue-600 text-blue-700'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Phone Call
              </button>
              <button
                type="button"
                onClick={() => setSource('HELPDESK_WALKIN')}
                className={`px-3 py-1.5 rounded-lg font-medium border ${
                  source === 'HELPDESK_WALKIN'
                    ? 'bg-blue-50 border-blue-600 text-blue-700'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Walk-In
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-red-600 cursor-pointer">
              <input
                type="checkbox"
                checked={isEmergency}
                onChange={(e) => setIsEmergency(e.target.checked)}
                className="rounded text-red-600"
              />
              <AlertTriangle className="w-3.5 h-3.5" />
              Emergency (Jump to #1)
            </label>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition"
          >
            {busy ? 'Issuing Token...' : 'Issue Token'}
          </button>
        </form>

        <div className="space-y-2.5">
          {activeTokens.map((token) => (
            <div
              key={token.id}
              className={`bg-white rounded-xl p-4 border flex items-center justify-between gap-3 ${
                token.status === 'IN_CABIN' ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg text-slate-900">#{token.token_number}</span>
                  <span className="font-semibold text-sm">{token.patient_name}</span>
                  {token.is_emergency && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full">
                      EMERGENCY
                    </span>
                  )}
                  {token.status === 'IN_CABIN' && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">
                      IN CABIN
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {token.patient_phone} • {token.booking_source}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {token.payment_status === 'PAID' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5" />
                    PAID ({token.payment_mode})
                  </span>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => markPaid(token, 'CASH')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 flex items-center gap-1"
                    >
                      <IndianRupee className="w-3 h-3" />
                      {token.fee_amount} Cash
                    </button>
                    <button
                      onClick={() => markPaid(token, 'UPI')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                    >
                      UPI
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}