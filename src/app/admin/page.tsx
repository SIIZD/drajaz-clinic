'use client';

import { supabase, QueueToken } from '@/lib/supabase';
import { useLiveQueue } from '@/hooks/useLiveQueue';
import { PinGate } from '@/components/PinGate';
import { ArrowUp, ArrowDown, Trash2, ShieldCheck } from 'lucide-react';

export default function AdminPage() {
  const { tokens, refetch } = useLiveQueue();
  const waiting = tokens.filter((t) => t.status === 'WAITING');

  const swapOrder = async (indexA: number, indexB: number) => {
    const a = waiting[indexA];
    const b = waiting[indexB];
    if (!a || !b) return;

    await Promise.all([
      supabase.from('queue_tokens').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('queue_tokens').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    refetch();
  };

  const cancelToken = async (token: QueueToken) => {
    await supabase.from('queue_tokens').update({ status: 'CANCELLED' }).eq('id', token.id);
    refetch();
  };

  return (
    <PinGate role="ADMIN" title="Admin Queue Override">
      <main className="min-h-screen bg-slate-100 text-slate-900 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto space-y-5">
          <header className="bg-slate-900 text-white rounded-2xl p-5 flex items-center gap-3.5 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Admin Queue Override</h1>
              <p className="text-xs text-slate-400">
                Adjust waiting order or remove duplicate/cancelled tokens
              </p>
            </div>
          </header>

          {waiting.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-sm text-slate-400">
              No waiting tokens to reorder.
            </div>
          ) : (
            <div className="space-y-2.5">
              {waiting.map((token, idx) => (
                <div
                  key={token.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-base tabular-nums shrink-0">
                      #{token.token_number}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">
                        {token.patient_name}
                        <span className="ml-2 text-xs font-medium text-slate-400">
                          (Position #{idx + 1})
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                        {token.patient_phone} • {token.booking_source} •{' '}
                        <span className="font-semibold">{token.payment_status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={idx === 0}
                      onClick={() => swapOrder(idx, idx - 1)}
                      title="Move up"
                      className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 transition"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      disabled={idx === waiting.length - 1}
                      onClick={() => swapOrder(idx, idx + 1)}
                      title="Move down"
                      className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 transition"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => cancelToken(token)}
                      title="Cancel token"
                      className="p-2.5 rounded-xl border border-red-200 bg-red-50/50 text-red-600 hover:bg-red-100 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </PinGate>
  );
}
