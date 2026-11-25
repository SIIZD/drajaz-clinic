'use client';

import { formatShiftTokenLabel } from '@/lib/bookingWindow';
import { useState, useMemo } from 'react';
import {
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Smartphone,
  Copy,
  Check,
  Printer,
  BarChart3,
  Users,
} from 'lucide-react';
import { QueueToken } from '@/lib/supabase';

interface ShiftDoctorBriefingProps {
  tokens: QueueToken[];
  sessionDate: string;
  roleTitle?: string;
}

type ShiftFilter = 'ALL' | 'MORNING' | 'EVENING';
type PaymentFilter = 'ALL' | 'PAID' | 'UNPAID';

function getTokenShiftIST(createdAt?: string): 'MORNING' | 'EVENING' {
  if (!createdAt) return 'MORNING';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(createdAt));

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  const mins = hour * 60 + minute;

  // Evening shift starts at 18:00 / 6:30 PM (1080+ mins); earlier is Morning shift
  return mins >= 17 * 60 ? 'EVENING' : 'MORNING';
}

function summarizeShift(list: QueueToken[]) {
  const activeOrDone = list.filter((t) => t.status !== 'CANCELLED');
  const completed = activeOrDone.filter((t) => t.status === 'COMPLETED');
  const waiting = activeOrDone.filter((t) => t.status === 'WAITING' || t.status === 'IN_CABIN');
  const skipped = activeOrDone.filter((t) => t.status === 'SKIPPED');
  const cancelled = list.filter((t) => t.status === 'CANCELLED');

  const paid = activeOrDone.filter((t) => t.payment_status === 'PAID');
  const unpaid = activeOrDone.filter((t) => t.payment_status !== 'PAID');

  const cashTokens = paid.filter((t) => t.payment_mode === 'CASH');
  const upiTokens = paid.filter((t) => t.payment_mode === 'UPI');

  const cashAmount = cashTokens.reduce((s, t) => s + (Number(t.fee_amount) || 0), 0);
  const upiAmount = upiTokens.reduce((s, t) => s + (Number(t.fee_amount) || 0), 0);
  const collectedAmount = cashAmount + upiAmount;
  const unpaidAmount = unpaid.reduce((s, t) => s + (Number(t.fee_amount) || 0), 0);
  const billedAmount = collectedAmount + unpaidAmount;

  return {
    totalValid: activeOrDone.length,
    completedCount: completed.length,
    waitingCount: waiting.length,
    skippedCount: skipped.length,
    cancelledCount: cancelled.length,
    paidCount: paid.length,
    unpaidCount: unpaid.length,
    cashCount: cashTokens.length,
    upiCount: upiTokens.length,
    cashAmount,
    upiAmount,
    collectedAmount,
    unpaidAmount,
    billedAmount,
  };
}

export default function ShiftDoctorBriefing({
  tokens,
  sessionDate,
  roleTitle = 'Dr. Ajaz Shift & Fee Briefing',
}: ShiftDoctorBriefingProps) {
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('ALL');
  const [copied, setCopied] = useState(false);

  const enrichedTokens = useMemo(
    () =>
      tokens.map((t) => ({
        ...t,
        shift: getTokenShiftIST(t.created_at),
      })),
    [tokens]
  );

  const morningTokens = useMemo(
    () => enrichedTokens.filter((t) => t.shift === 'MORNING'),
    [enrichedTokens]
  );
  const eveningTokens = useMemo(
    () => enrichedTokens.filter((t) => t.shift === 'EVENING'),
    [enrichedTokens]
  );

  const morningStats = useMemo(() => summarizeShift(morningTokens), [morningTokens]);
  const eveningStats = useMemo(() => summarizeShift(eveningTokens), [eveningTokens]);
  const fullDayStats = useMemo(() => summarizeShift(enrichedTokens), [enrichedTokens]);

  const activeStats =
    shiftFilter === 'MORNING'
      ? morningStats
      : shiftFilter === 'EVENING'
      ? eveningStats
      : fullDayStats;

  const filteredLedger = useMemo(() => {
    return enrichedTokens.filter((t) => {
      if (shiftFilter !== 'ALL' && t.shift !== shiftFilter) return false;
      if (paymentFilter === 'PAID' && t.payment_status !== 'PAID') return false;
      if (paymentFilter === 'UNPAID' && (t.payment_status === 'PAID' || t.status === 'CANCELLED'))
        return false;
      return true;
    });
  }, [enrichedTokens, shiftFilter, paymentFilter]);

  const cashPct =
    activeStats.billedAmount > 0
      ? Math.round((activeStats.cashAmount / activeStats.billedAmount) * 100)
      : 0;
  const upiPct =
    activeStats.billedAmount > 0
      ? Math.round((activeStats.upiAmount / activeStats.billedAmount) * 100)
      : 0;
  const unpaidPct =
    activeStats.billedAmount > 0 ? Math.max(0, 100 - cashPct - upiPct) : 0;

  const maxShiftPatients = Math.max(
    morningStats.totalValid,
    eveningStats.totalValid,
    1
  );

  const handleCopyDoctorBrief = async () => {
    const unpaidNames = enrichedTokens
      .filter((t) => t.status !== 'CANCELLED' && t.payment_status !== 'PAID')
      .map((t) => `#${t.token_number} ${t.patient_name} (₹${t.fee_amount})`)
      .join(', ');

    const report = [
      `Dr. Ajaz Clinic, Aurangabad — Shift Completion Briefing (${sessionDate})`,
      ``,
      `1. MORNING SHIFT (10:00 AM – 4:00 PM)`,
      `   • Patients: ${morningStats.totalValid} total | ${morningStats.completedCount} completed | ${morningStats.waitingCount} waiting | ${morningStats.skippedCount} skipped`,
      `   • Fees: ₹${morningStats.collectedAmount.toLocaleString('en-IN')} collected (Cash: ₹${morningStats.cashAmount.toLocaleString('en-IN')}, UPI: ₹${morningStats.upiAmount.toLocaleString('en-IN')}) | Unpaid: ₹${morningStats.unpaidAmount.toLocaleString('en-IN')} (${morningStats.unpaidCount})`,
      ``,
      `2. EVENING SHIFT (6:30 PM – 11:00 PM)`,
      `   • Patients: ${eveningStats.totalValid} total | ${eveningStats.completedCount} completed | ${eveningStats.waitingCount} waiting | ${eveningStats.skippedCount} skipped`,
      `   • Fees: ₹${eveningStats.collectedAmount.toLocaleString('en-IN')} collected (Cash: ₹${eveningStats.cashAmount.toLocaleString('en-IN')}, UPI: ₹${eveningStats.upiAmount.toLocaleString('en-IN')}) | Unpaid: ₹${eveningStats.unpaidAmount.toLocaleString('en-IN')} (${eveningStats.unpaidCount})`,
      ``,
      `3. FULL DAY SUMMARY`,
      `   • Total Patients: ${fullDayStats.totalValid} (${fullDayStats.completedCount} Completed, ${fullDayStats.cancelledCount} Cancelled)`,
      `   • Paid (${fullDayStats.paidCount}): ₹${fullDayStats.collectedAmount.toLocaleString('en-IN')} [Cash: ₹${fullDayStats.cashAmount.toLocaleString('en-IN')} | UPI: ₹${fullDayStats.upiAmount.toLocaleString('en-IN')}]`,
      `   • Unpaid (${fullDayStats.unpaidCount}): ₹${fullDayStats.unpaidAmount.toLocaleString('en-IN')}${unpaidNames ? ` -> ${unpaidNames}` : ''}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore if clipboard unavailable
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-700">
            <BarChart3 className="h-3.5 w-3.5" />
            {roleTitle}
          </span>
          <h2 className="mt-0.5 text-lg font-bold text-slate-900">
            Morning & Evening Shift Completion + Paid / Unpaid Report ({sessionDate})
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyDoctorBrief}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Briefing Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Briefing for Doctor
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Shift Comparison Cards: Morning vs Evening */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Morning Shift */}
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Morning Shift</h3>
                <p className="text-[11px] text-slate-500">10:00 AM – 4:00 PM IST</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white border border-amber-200 text-amber-800">
              {morningStats.completedCount}/{morningStats.totalValid} Completed
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white rounded-xl p-2.5 border border-slate-200/70">
              <div className="text-[10px] font-semibold text-slate-500">COLLECTED</div>
              <div className="text-sm font-extrabold text-emerald-700 tabular-nums mt-0.5">
                ₹{morningStats.collectedAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-400">{morningStats.paidCount} paid</div>
            </div>
            <div className="bg-white rounded-xl p-2.5 border border-slate-200/70">
              <div className="text-[10px] font-semibold text-slate-500">UNPAID</div>
              <div className="text-sm font-extrabold text-amber-700 tabular-nums mt-0.5">
                ₹{morningStats.unpaidAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-400">{morningStats.unpaidCount} due</div>
            </div>
            <div className="bg-white rounded-xl p-2.5 border border-slate-200/70">
              <div className="text-[10px] font-semibold text-slate-500">WAITING/SKIP</div>
              <div className="text-sm font-extrabold text-slate-800 tabular-nums mt-0.5">
                {morningStats.waitingCount} / {morningStats.skippedCount}
              </div>
              <div className="text-[10px] text-slate-400">active / skip</div>
            </div>
          </div>
        </div>

        {/* Evening Shift */}
        <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Evening Shift</h3>
                <p className="text-[11px] text-slate-500">6:30 PM – 11:00 PM IST</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white border border-indigo-200 text-indigo-800">
              {eveningStats.completedCount}/{eveningStats.totalValid} Completed
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white rounded-xl p-2.5 border border-slate-200/70">
              <div className="text-[10px] font-semibold text-slate-500">COLLECTED</div>
              <div className="text-sm font-extrabold text-emerald-700 tabular-nums mt-0.5">
                ₹{eveningStats.collectedAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-400">{eveningStats.paidCount} paid</div>
            </div>
            <div className="bg-white rounded-xl p-2.5 border border-slate-200/70">
              <div className="text-[10px] font-semibold text-slate-500">UNPAID</div>
              <div className="text-sm font-extrabold text-amber-700 tabular-nums mt-0.5">
                ₹{eveningStats.unpaidAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-400">{eveningStats.unpaidCount} due</div>
            </div>
            <div className="bg-white rounded-xl p-2.5 border border-slate-200/70">
              <div className="text-[10px] font-semibold text-slate-500">WAITING/SKIP</div>
              <div className="text-sm font-extrabold text-slate-800 tabular-nums mt-0.5">
                {eveningStats.waitingCount} / {eveningStats.skippedCount}
              </div>
              <div className="text-[10px] text-slate-400">active / skip</div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Revenue & Collection Split Bar */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Fee Collection Chart ({shiftFilter === 'ALL' ? 'Full Day' : `${shiftFilter} Shift`})
            </h3>
            <span className="text-xs font-extrabold text-slate-900 tabular-nums">
              Total Billed: ₹{activeStats.billedAmount.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Stacked Bar */}
          <div className="h-4 w-full rounded-full bg-slate-200 overflow-hidden flex">
            {cashPct > 0 && (
              <div
                style={{ width: `${cashPct}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Cash: ${cashPct}%`}
              />
            )}
            {upiPct > 0 && (
              <div
                style={{ width: `${upiPct}%` }}
                className="bg-sky-500 h-full transition-all"
                title={`UPI: ${upiPct}%`}
              />
            )}
            {unpaidPct > 0 && (
              <div
                style={{ width: `${unpaidPct}%` }}
                className="bg-amber-400 h-full transition-all"
                title={`Unpaid: ${unpaidPct}%`}
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div>
                <div className="font-semibold text-slate-700">Cash ({cashPct}%)</div>
                <div className="text-slate-500 tabular-nums">
                  ₹{activeStats.cashAmount.toLocaleString('en-IN')} ({activeStats.cashCount})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
              <div>
                <div className="font-semibold text-slate-700">UPI ({upiPct}%)</div>
                <div className="text-slate-500 tabular-nums">
                  ₹{activeStats.upiAmount.toLocaleString('en-IN')} ({activeStats.upiCount})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
              <div>
                <div className="font-semibold text-slate-700">Unpaid ({unpaidPct}%)</div>
                <div className="text-slate-500 tabular-nums">
                  ₹{activeStats.unpaidAmount.toLocaleString('en-IN')} ({activeStats.unpaidCount})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Morning vs Evening Patient Volume & Paid/Unpaid Comparison */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Shift Volume & Paid vs. Unpaid Chart
            </h3>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
              <Users className="w-3.5 h-3.5" />
              {fullDayStats.totalValid} Patients
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Morning bar */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-slate-700">
                  Morning (10 AM – 4 PM)
                </span>
                <span className="tabular-nums text-slate-600">
                  {morningStats.paidCount} Paid • {morningStats.unpaidCount} Unpaid (Total:{' '}
                  {morningStats.totalValid})
                </span>
              </div>
              <div className="h-3.5 w-full rounded-full bg-slate-200 overflow-hidden flex">
                <div
                  style={{
                    width: `${(morningStats.paidCount / maxShiftPatients) * 100}%`,
                  }}
                  className="bg-teal-600 h-full transition-all"
                />
                <div
                  style={{
                    width: `${(morningStats.unpaidCount / maxShiftPatients) * 100}%`,
                  }}
                  className="bg-amber-400 h-full transition-all"
                />
              </div>
            </div>

            {/* Evening bar */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-slate-700">
                  Evening (6:30 PM – 11 PM)
                </span>
                <span className="tabular-nums text-slate-600">
                  {eveningStats.paidCount} Paid • {eveningStats.unpaidCount} Unpaid (Total:{' '}
                  {eveningStats.totalValid})
                </span>
              </div>
              <div className="h-3.5 w-full rounded-full bg-slate-200 overflow-hidden flex">
                <div
                  style={{
                    width: `${(eveningStats.paidCount / maxShiftPatients) * 100}%`,
                  }}
                  className="bg-indigo-600 h-full transition-all"
                />
                <div
                  style={{
                    width: `${(eveningStats.unpaidCount / maxShiftPatients) * 100}%`,
                  }}
                  className="bg-amber-400 h-full transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters + Paid & Unpaid Patient Ledger */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {(['ALL', 'MORNING', 'EVENING'] as ShiftFilter[]).map((sf) => (
              <button
                key={sf}
                type="button"
                onClick={() => setShiftFilter(sf)}
                className={`px-3 py-1.5 rounded-lg font-semibold border transition ${
                  shiftFilter === sf
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {sf === 'ALL'
                  ? 'All Shifts'
                  : sf === 'MORNING'
                  ? 'Morning Shift'
                  : 'Evening Shift'}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {(['ALL', 'PAID', 'UNPAID'] as PaymentFilter[]).map((pf) => (
              <button
                key={pf}
                type="button"
                onClick={() => setPaymentFilter(pf)}
                className={`px-3 py-1.5 rounded-lg font-semibold border transition ${
                  paymentFilter === pf
                    ? pf === 'UNPAID'
                      ? 'bg-amber-600 border-amber-600 text-white'
                      : pf === 'PAID'
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-teal-700 border-teal-700 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {pf === 'ALL'
                  ? `All (${enrichedTokens.length})`
                  : pf === 'PAID'
                  ? `Paid (${fullDayStats.paidCount})`
                  : `Unpaid (${fullDayStats.unpaidCount})`}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-3">Token</th>
                <th className="py-2.5 px-3">Patient</th>
                <th className="py-2.5 px-3">Shift</th>
                <th className="py-2.5 px-3">Visit Status</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3 text-right">Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No patients match the selected shift and payment filter.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-extrabold text-slate-900 tabular-nums">
                      #{t.token_number}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{t.patient_name}</div>
                      <div className="text-[11px] text-slate-500 tabular-nums">
                        {t.patient_phone} • {t.booking_source}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.shift === 'MORNING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {t.shift === 'MORNING' ? 'Morning' : 'Evening'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : t.status === 'IN_CABIN'
                            ? 'bg-teal-100 text-teal-800'
                            : t.status === 'CANCELLED'
                            ? 'bg-slate-200 text-slate-600'
                            : t.status === 'SKIPPED'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {t.status === 'CANCELLED' ? (
                        <span className="text-slate-400">—</span>
                      ) : t.payment_status === 'PAID' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                          {t.payment_mode === 'UPI' ? (
                            <Smartphone className="w-3.5 h-3.5 text-sky-600" />
                          ) : (
                            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          PAID ({t.payment_mode})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                          <AlertCircle className="w-3.5 h-3.5" />
                          UNPAID
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold tabular-nums text-slate-900">
                      ₹{t.fee_amount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
