'use client';

import { formatShiftTokenLabel } from '@/lib/bookingWindow';
import { useState, useEffect, useCallback } from 'react';
import { supabase, getTodayIST, QueueToken } from '@/lib/supabase';
import { PinGate, useStaffPin } from '@/components/PinGate';
import ShiftDoctorBriefing from '@/components/ShiftDoctorBriefing';
import {
  Stethoscope,
  UserCheck,
  CheckCircle2,
  SkipForward,
  Users,
  CheckCheck,
  Phone,
  BarChart3,
} from 'lucide-react';

function DoctorConsole() {
  const pin = useStaffPin();
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [sessionDate, setSessionDate] = useState<string>(() => getTodayIST());
  const [showBriefing, setShowBriefing] = useState<boolean>(true);

  const loadStaffQueue = useCallback(async () => {
    if (!pin) return;
    const today = getTodayIST();
    setSessionDate(today);
    const { data } = await supabase.rpc('staff_get_queue', {
      p_role: 'DOCTOR',
      p_pin: pin,
      p_session_date: today,
    });
    if (data) setTokens(data as QueueToken[]);
  }, [pin]);

  useEffect(() => {
    loadStaffQueue();
    const channel = supabase
      .channel('doctor-staff-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tokens' }, () => {
        loadStaffQueue();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadStaffQueue]);

  const inCabin = tokens.find((t) => t.status === 'IN_CABIN');
  const waiting = tokens.filter((t) => t.status === 'WAITING');
  const completedCount = tokens.filter((t) => t.status === 'COMPLETED').length;

  const callIn = async (token: QueueToken) => {
    await supabase.rpc('doctor_update_token_status', {
      p_pin: pin,
      p_token_id: token.id,
      p_status: 'IN_CABIN',
      p_complete_current_cabin: true,
    });
    loadStaffQueue();
  };

  const completeCurrent = async () => {
    if (!inCabin) return;
    await supabase.rpc('doctor_update_token_status', {
      p_pin: pin,
      p_token_id: inCabin.id,
      p_status: 'COMPLETED',
      p_complete_current_cabin: false,
    });
    loadStaffQueue();
  };

  const skipToken = async (token: QueueToken) => {
    await supabase.rpc('doctor_update_token_status', {
      p_pin: pin,
      p_token_id: token.id,
      p_status: 'SKIPPED',
      p_complete_current_cabin: false,
    });
    loadStaffQueue();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">Dr. Ajaz Cabin Console</h1>
              <p className="text-xs text-slate-400">Aurangabad • Live OPD</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-2.5">
              <Users className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Waiting</div>
                <div className="text-base font-extrabold text-amber-400 tabular-nums">
                  {waiting.length}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-2.5">
              <CheckCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Completed</div>
                <div className="text-base font-extrabold text-emerald-400 tabular-nums">
                  {completedCount}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowBriefing((prev) => !prev)}
              className={`rounded-xl px-3.5 py-2.5 text-xs font-bold border flex items-center gap-1.5 transition ${
                showBriefing
                  ? 'bg-teal-600 border-teal-500 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              {showBriefing ? 'Hide Shift Report' : 'Shift & Fee Report'}
            </button>
          </div>
        </header>

        <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/50 border border-teal-500/30 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-teal-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              Currently Inside Cabin
            </span>
            {inCabin && (
              <span className="text-xs text-slate-400">{inCabin.booking_source}</span>
            )}
          </div>

          {inCabin ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-teal-500 text-slate-950 flex items-center justify-center font-black text-2xl tabular-nums shrink-0">
                  {formatShiftTokenLabel(inCabin.token_number, inCabin.shift_slot, inCabin.created_at)}
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-white">{inCabin.patient_name}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                    <span className="inline-flex items-center gap-1 text-slate-300 tabular-nums">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {inCabin.patient_phone}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold ${
                        inCabin.payment_status === 'PAID'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-red-500/20 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {inCabin.payment_status} • ₹{inCabin.fee_amount}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={completeCurrent}
                className="px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 shrink-0 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                Complete Visit
              </button>
            </div>
          ) : (
            <div className="py-4 text-sm text-slate-400 flex items-center justify-between">
              <span>Cabin is currently vacant. Call the next waiting patient below.</span>
              {waiting[0] && (
                <button
                  onClick={() => callIn(waiting[0])}
                  className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <UserCheck className="w-4 h-4" />
                  Call #{waiting[0].token_number}
                </button>
              )}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">
            Up Next in Queue ({waiting.length})
          </div>

          {waiting.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-500">
              No patients waiting in the queue.
            </div>
          ) : (
            waiting.map((token, idx) => (
              <div
                key={token.id}
                className={`rounded-2xl p-4 border flex items-center justify-between gap-3 transition ${
                  idx === 0
                    ? 'bg-slate-900 border-teal-500/60 shadow-md'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg tabular-nums shrink-0 ${
                      token.is_emergency
                        ? 'bg-red-600 text-white'
                        : idx === 0
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    {formatShiftTokenLabel(token.token_number, token.shift_slot, token.created_at)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-base text-white">{token.patient_name}</span>
                      {token.is_emergency && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded-full">
                          EMERGENCY
                        </span>
                      )}
                      {idx === 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-500/20 text-teal-300 rounded-full">
                          NEXT
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                      <span>{token.booking_source}</span>
                      <span>•</span>
                      <span
                        className={
                          token.payment_status === 'PAID'
                            ? 'text-emerald-400 font-bold'
                            : 'text-red-400 font-bold'
                        }
                      >
                        {token.payment_status} (₹{token.fee_amount})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => skipToken(token)}
                    title="Skip absent patient"
                    className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => callIn(token)}
                    className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm flex items-center gap-1.5 transition"
                  >
                    <UserCheck className="w-4 h-4" />
                    Call In
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        {showBriefing && (
          <div className="text-slate-900 pt-2">
            <ShiftDoctorBriefing
              tokens={tokens}
              sessionDate={sessionDate}
              roleTitle="Dr. Ajaz Shift Completion & Fee Report"
            />
          </div>
        )}
      </div>
    </main>
  );
}

export default function DoctorPage() {
  return (
    <PinGate role="DOCTOR" title="Dr. Ajaz Cabin Console">
      <DoctorConsole />
    </PinGate>
  );
}
