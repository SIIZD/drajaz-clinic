'use client';

import { useState } from 'react';
import { Banknote, Smartphone, AlertCircle, CheckCircle2, Copy, Check } from 'lucide-react';

export interface SettlementToken {
  id: string;
  token_number: number;
  patient_name: string;
  status: string;
  fee_amount: number;
  payment_status: string;
  payment_mode: string;
}

interface EndOfDaySettlementCardProps {
  tokens: SettlementToken[];
  sessionDate: string;
}

export default function EndOfDaySettlementCard({
  tokens,
  sessionDate,
}: EndOfDaySettlementCardProps) {
  const [copied, setCopied] = useState(false);

  const validTokens = tokens.filter((t) => t.status !== 'CANCELLED');
  const paidTokens = validTokens.filter((t) => t.payment_status === 'PAID');
  const unpaidTokens = validTokens.filter((t) => t.payment_status !== 'PAID');

  const cashTokens = paidTokens.filter((t) => t.payment_mode === 'CASH');
  const upiTokens = paidTokens.filter((t) => t.payment_mode === 'UPI');

  const cashTotal = cashTokens.reduce((sum, t) => sum + (Number(t.fee_amount) || 0), 0);
  const upiTotal = upiTokens.reduce((sum, t) => sum + (Number(t.fee_amount) || 0), 0);
  const grandTotal = cashTotal + upiTotal;
  const pendingTotal = unpaidTokens.reduce((sum, t) => sum + (Number(t.fee_amount) || 0), 0);

  const completedCount = validTokens.filter((t) => t.status === 'COMPLETED').length;

  const handleCopySummary = async () => {
    const summaryText = [
      `Dr. Ajaz Clinic, Aurangabad — EOD Settlement (${sessionDate})`,
      `• Cash (${cashTokens.length}): ₹${cashTotal.toLocaleString('en-IN')}`,
      `• UPI (${upiTokens.length}): ₹${upiTotal.toLocaleString('en-IN')}`,
      `• Total Collected (${paidTokens.length}): ₹${grandTotal.toLocaleString('en-IN')}`,
      `• Unpaid / Pending (${unpaidTokens.length}): ₹${pendingTotal.toLocaleString('en-IN')}`,
      `• Consultations Completed: ${completedCount} / ${validTokens.length}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard permission unavailable
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            End-of-Day Counter Settlement
          </span>
          <h2 className="mt-0.5 text-lg font-bold text-slate-900">
            Cash & UPI Reconciliation ({sessionDate})
          </h2>
        </div>

        <button
          type="button"
          onClick={handleCopySummary}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Copied for Register / WhatsApp
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy EOD Tally
            </>
          )}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
            <span>CASH IN DRAWER</span>
            <Banknote className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">
            ₹{cashTotal.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {cashTokens.length} {cashTokens.length === 1 ? 'patient' : 'patients'} paid cash
          </p>
        </div>

        <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-800">
            <span>UPI / QR RECEIVED</span>
            <Smartphone className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">
            ₹{upiTotal.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {upiTokens.length} {upiTokens.length === 1 ? 'patient' : 'patients'} paid via UPI
          </p>
        </div>

        <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-teal-900">
            <span>TOTAL SETTLED</span>
            <CheckCircle2 className="h-4 w-4 text-teal-700" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-teal-900 tabular-nums">
            ₹{grandTotal.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-teal-800">
            {paidTokens.length} of {validTokens.length} active tokens cleared
          </p>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
            <span>PENDING COLLECTION</span>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">
            ₹{pendingTotal.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {unpaidTokens.length} unpaid • {completedCount} visits completed
          </p>
        </div>
      </div>
    </section>
  );
}
