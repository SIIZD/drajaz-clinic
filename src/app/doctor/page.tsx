'use client';

import { supabase, QueueToken } from '@/lib/supabase';
import { useLiveQueue } from '@/hooks/useLiveQueue';
import { Stethoscope, UserCheck, CheckCircle2, SkipForward } from 'lucide-react';

export default function DoctorPage() {
  const { tokens, refetch } = useLiveQueue();

  const inCabin = tokens.find((t) => t.status === 'IN_CABIN');
  const waiting = tokens.filter((t) => t.status === 'WAITING');
  const completedCount = tokens.filter((t) => t.status === 'COMPLETED').length;

  const callIn = async (token: QueueToken) => {
    if (inCabin) {
      await supabase
        .from('queue_tokens')
        .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
        .eq('id', inCabin.id);
    }
    await supabase
      .from('queue_tokens')
      .update({ status: 'IN_CABIN', called_at: new Date().toISOString() })
      .eq('id', token.id);
    refetch();
  };

  const completeCurrent = async () => {
    if (!inCabin) return;
    await supabase
      .from('queue_tokens')
      .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
      .eq('id', inCabin.id);
    refetch();
  };

  const skipToken = async (token: QueueToken) => {
    await supabase.from('queue_tokens').update({ status: 'SKIPPED' }).eq('id', token.id);
    refetch();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-xl mx-auto space-y-5">
        <header className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Stethoscope className="w-6 h-6 text-emerald-400" />
            <div>
              <h1 className="font-bold text-lg">Dr. Ajaz Cabin Console</h1>
              <p className="text-xs text-slate-400">Live OPD Queue</p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>Completed Today: <span className="text-white font-bold">{completedCount}</span></div>
            <div>Waiting: <span className="text-amber-400 font-bold">{waiting.length}</span></div>
          </div>
        </header>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
            Currently Inside Cabin
          </div>
          {inCabin ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-3xl font-extrabold">
                  #{inCabin.token_number} • {inCabin.patient_name}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span>{inCabin.patient_phone}</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold ${
                      inCabin.payment_status === 'PAID'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                        : 'bg-red-950 text-red-400 border border-red-700'
                    }`}
                  >
                    {inCabin.payment_status} (₹{inCabin.fee_amount})
                  </span>
                </div>
              </div>
              <button
                onClick={completeCurrent}
                className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm flex items-center gap-1.5 shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                Done
              </button>
            </div>
          ) : (
            <div className="text-sm text-slate-400 py-2">Cabin is currently empty.</div>
          )}
        </section>

        <section className="space-y-2.5">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
            Up Next ({waiting.length})
          </div>
          {waiting.map((token, idx) => (
            <div
              key={token.id}
              className={`rounded-xl p-4 border flex items-center justify-between gap-3 ${
                idx === 0
                  ? 'bg-slate-900 border-emerald-600/60'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-extrabold">#{token.token_number}</span>
                  <span className="font-semibold">{token.patient_name}</span>
                  {token.is_emergency && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded-full">
                      EMERGENCY
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                  <span>{token.booking_source}</span>
                  <span
                    className={
                      token.payment_status === 'PAID' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'
                    }
                  >
                    • {token.payment_status} ₹{token.fee_amount}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => skipToken(token)}
                  title="Skip absent patient"
                  className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <button
                  onClick={() => callIn(token)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm flex items-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  Call In
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
