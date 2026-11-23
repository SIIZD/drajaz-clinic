'use client';

import { useState, useEffect } from 'react';
import { supabase, getTodayIST, getTodayFee, QueueToken } from '@/lib/supabase';
import { useLiveQueue } from '@/hooks/useLiveQueue';
import { PinGate } from '@/components/PinGate';
import {
  PhoneCall,
  AlertTriangle,
  IndianRupee,
  CheckCircle2,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';

export default function HelpdeskPage() {
  const { tokens, refetch } = useLiveQueue();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [todayFee, setTodayFee] = useState<number>(300);
  const [source, setSource] = useState<'HELPDESK_PHONE' | 'HELPDESK_WALKIN'>('HELPDESK_PHONE');
  const [isEmergency, setIsEmergency] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTodayFee(getTodayFee());
  }, []);

  const activeTokens = tokens.filter((t) => t.status === 'WAITING' || t.status === 'IN_CABIN');
  const paidToday = tokens.filter((t) => t.payment_status === 'PAID');
  const totalCollected = paidToday.reduce((sum, t) => sum + t.fee_amount, 0);

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
    <PinGate role="HELPDESK" title="Helpdesk & Fee Counter">
      <main className="min-h-screen bg-slate-100 text-slate-900 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Active Queue</div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums">
                  {activeTokens.length}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Collected Today</div>
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 tabular-nums">
                  ₹{totalCollected}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Standard Fee</div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums">
                  ₹{todayFee}
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-6 items-start">
            {/* Manual Registration Card */}
            <form
              onSubmit={handleManualBook}
              className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <h2 className="font-bold text-sm text-slate-900">Issue Manual Token</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Patient Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shaikh Imran"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    10-Digit Mobile Number
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9823012345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Booking Channel
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSource('HELPDESK_PHONE')}
                      className={`py-2 px-3 rounded-xl font-semibold border transition flex items-center justify-center gap-1.5 ${
                        source === 'HELPDESK_PHONE'
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      Phone Call
                    </button>
                    <button
                      type="button"
                      onClick={() => setSource('HELPDESK_WALKIN')}
                      className={`py-2 px-3 rounded-xl font-semibold border transition ${
                        source === 'HELPDESK_WALKIN'
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Walk-In
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50/70 border border-red-200/80 text-xs font-semibold text-red-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEmergency}
                    onChange={(e) => setIsEmergency(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>Emergency Priority (Jump to #1)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 shadow-md shadow-blue-600/20 transition"
              >
                {busy ? 'Issuing Token...' : 'Issue Token'}
              </button>
            </form>

            {/* Live Queue & Fee Collection List */}
            <div className="lg:col-span-3 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Live Queue & Fee Status ({activeTokens.length})
                </h2>
              </div>

              {activeTokens.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-sm text-slate-400">
                  No active patients in the queue right now.
                </div>
              ) : (
                activeTokens.map((token) => (
                  <div
                    key={token.id}
                    className={`bg-white rounded-2xl p-4 border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      token.status === 'IN_CABIN'
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg tabular-nums shrink-0 ${
                          token.status === 'IN_CABIN'
                            ? 'bg-emerald-600 text-white'
                            : token.is_emergency
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-900 text-white'
                        }`}
                      >
                        #{token.token_number}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">
                            {token.patient_name}
                          </span>
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
                        <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                          {token.patient_phone} •{' '}
                          <span className="font-medium text-slate-600">{token.booking_source}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      {token.payment_status === 'PAID' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          PAID ₹{token.fee_amount} ({token.payment_mode})
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => markPaid(token, 'CASH')}
                            className="px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 shadow-sm flex items-center gap-1 transition"
                          >
                            <IndianRupee className="w-3 h-3" />
                            {token.fee_amount} Cash
                          </button>
                          <button
                            onClick={() => markPaid(token, 'UPI')}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm transition"
                          >
                            UPI
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </PinGate>
  );
}
