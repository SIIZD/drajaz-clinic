'use client';

import { supabase, QueueToken } from '@/lib/supabase';
import { useLiveQueue } from '@/hooks/useLiveQueue';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

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
    <main className="min-h-screen bg-slate-100 text-slate-900 p-4">
      <div className="max-w-xl mx-auto space-y-4">
        <header className="bg-slate-900 text-white rounded-2xl p-5">
          <h1 className="text-lg font-bold">Admin Queue Control</h1>
          <p className="text-xs text-slate-400">Move waiting patients up/down or cancel tokens</p>
        </header>

        <div className="space-y-2">
          {waiting.map((token, idx) => (
            <div
              key={token.id}
              className="bg-white rounded-xl p-4 border border-slate-200 flex items-center justify-between"
            >
              <div>
                <div className="font-bold">
                  #{token.token_number} • {token.patient_name}
                </div>
                <div className="text-xs text-slate-500">
                  {token.patient_phone} • {token.booking_source} • {token.payment_status}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={idx === 0}
                  onClick={() => swapOrder(idx, idx - 1)}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  disabled={idx === waiting.length - 1}
                  onClick={() => swapOrder(idx, idx + 1)}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => cancelToken(token)}
                  className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}