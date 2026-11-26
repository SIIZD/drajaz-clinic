'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase, getTodayIST, QueueToken } from '@/lib/supabase';
import { formatShiftTokenLabel } from '@/lib/bookingWindow';
import { PinGate, useStaffPin } from '@/components/PinGate';
import EndOfDaySettlementCard from '@/components/EndOfDaySettlementCard';
import ShiftDoctorBriefing from '@/components/ShiftDoctorBriefing';
import {
  ShieldCheck,
  Settings,
  Users,
  Trash2,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
} from 'lucide-react';

interface ClinicConfigState {
  weekday_fee: number;
  sunday_fee: number;
  avg_mins_per_patient: number;
  morning_start: string;
  morning_end: string;
  evening_start: string;
  evening_end: string;
  clinic_lat: number;
  clinic_lng: number;
  geofence_radius_m: number;
  qr_secret: string;
}

const DEFAULT_CONFIG: ClinicConfigState = {
  weekday_fee: 300,
  sunday_fee: 400,
  avg_mins_per_patient: 7,
  morning_start: '10:00:00',
  morning_end: '16:00:00',
  evening_start: '18:30:00',
  evening_end: '23:00:00',
  clinic_lat: 19.888,
  clinic_lng: 75.3421,
  geofence_radius_m: 150,
  qr_secret: 'DRAJAZ_V8QR5X_SECRET',
};

function normalizeTimeInput(val?: string | null, fallback = '10:00'): string {
  if (!val) return fallback;
  return val.slice(0, 5);
}

function AdminConsole() {
  const pin = useStaffPin();
  const [sessionDate, setSessionDate] = useState<string>(() => getTodayIST());
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [cfg, setCfg] = useState<ClinicConfigState>(DEFAULT_CONFIG);
  const [morningStart, setMorningStart] = useState('10:00');
  const [morningEnd, setMorningEnd] = useState('16:00');
  const [eveningStart, setEveningStart] = useState('18:30');
  const [eveningEnd, setEveningEnd] = useState('23:00');

  const [searchQuery, setSearchQuery] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'ALL' | 'MORNING' | 'EVENING'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [savingConfig, setSavingConfig] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadAdminData = useCallback(
    async (targetDate?: string) => {
      if (!pin) return;
      const dateToUse = targetDate || sessionDate || getTodayIST();

      const [queueRes, cfgRes] = await Promise.all([
        supabase.rpc('staff_get_queue', {
          p_role: 'ADMIN',
          p_pin: pin,
          p_session_date: dateToUse,
        }),
        supabase.rpc('admin_get_config', { p_pin: pin }),
      ]);

      if (queueRes.data) {
        setTokens(queueRes.data as QueueToken[]);
      }

      if (cfgRes.data && typeof cfgRes.data === 'object') {
        const loaded = cfgRes.data as Partial<ClinicConfigState>;
        setCfg({ ...DEFAULT_CONFIG, ...loaded });
        setMorningStart(normalizeTimeInput(loaded.morning_start, '10:00'));
        setMorningEnd(normalizeTimeInput(loaded.morning_end, '16:00'));
        setEveningStart(normalizeTimeInput(loaded.evening_start, '18:30'));
        setEveningEnd(normalizeTimeInput(loaded.evening_end, '23:00'));
      }
    },
    [pin, sessionDate]
  );

  useEffect(() => {
    loadAdminData(sessionDate);
    const channel = supabase
      .channel('admin-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tokens' }, () => {
        loadAdminData();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAdminData, sessionDate]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerMsg(null);
    setSavingConfig(true);

    const { error } = await supabase.rpc('admin_update_config', {
      p_pin: pin,
      p_weekday_fee: Number(cfg.weekday_fee),
      p_sunday_fee: Number(cfg.sunday_fee),
      p_avg_mins: Number(cfg.avg_mins_per_patient),
      p_morning_start: `${morningStart}:00`,
      p_morning_end: `${morningEnd}:00`,
      p_evening_start: `${eveningStart}:00`,
      p_evening_end: `${eveningEnd}:00`,
      p_clinic_lat: Number(cfg.clinic_lat),
      p_clinic_lng: Number(cfg.clinic_lng),
      p_geofence_radius_m: Number(cfg.geofence_radius_m),
      p_qr_secret: cfg.qr_secret.trim(),
    });

    setSavingConfig(false);
    if (error) {
      setBannerMsg({ type: 'err', text: error.message });
    } else {
      setBannerMsg({ type: 'ok', text: 'Clinic configuration saved to Supabase.' });
      loadAdminData();
    }
  };

  const updateToken = async (
    tokenId: string,
    updates: { status?: string; payment_status?: string; payment_mode?: string }
  ) => {
    setBannerMsg(null);
    setBusyAction(true);
    const { error } = await supabase.rpc('admin_manage_token', {
      p_pin: pin,
      p_token_id: tokenId,
      p_status: updates.status ?? null,
      p_payment_status: updates.payment_status ?? null,
      p_payment_mode: updates.payment_mode ?? null,
    });
    setBusyAction(false);
    if (error) {
      setBannerMsg({ type: 'err', text: error.message });
    } else {
      loadAdminData();
    }
  };

  const handleClearSession = async (targetShift: 'ALL' | 'MORNING' | 'EVENING') => {
    const label = targetShift === 'ALL' ? `all tokens for ${sessionDate}` : `${targetShift} shift tokens for ${sessionDate}`;
    const confirmed = window.confirm(`Delete ${label}? This cannot be undone.`);
    if (!confirmed) return;

    setBannerMsg(null);
    setBusyAction(true);
    const { error } = await supabase.rpc('admin_clear_session_tokens', {
      p_pin: pin,
      p_session_date: sessionDate,
      p_shift_slot: targetShift,
    });
    setBusyAction(false);

    if (error) {
      setBannerMsg({ type: 'err', text: error.message });
    } else {
      setBannerMsg({ type: 'ok', text: `Cleared ${label}.` });
      loadAdminData();
    }
  };

  const filteredTokens = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tokens.filter((t) => {
      if (shiftFilter !== 'ALL' && t.shift_slot && t.shift_slot !== shiftFilter) return false;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (!q) return true;
      const label = formatShiftTokenLabel(t.token_number, t.shift_slot, t.created_at).toLowerCase();
      return (
        t.patient_name.toLowerCase().includes(q) ||
        t.patient_phone.includes(q) ||
        label.includes(q)
      );
    });
  }, [tokens, searchQuery, shiftFilter, statusFilter]);

  const paidCount = tokens.filter((t) => t.status !== 'CANCELLED' && t.payment_status === 'PAID').length;
  const totalCollected = tokens
    .filter((t) => t.status !== 'CANCELLED' && t.payment_status === 'PAID')
    .reduce((sum, t) => sum + (Number(t.fee_amount) || 0), 0);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Admin Header */}
        <header className="bg-slate-900 text-white rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Dr. Ajaz Clinic • Admin Control Center</h1>
              <p className="text-xs text-slate-400">
                Aurangabad • Full Operations, Rules, Queue & Settlement Control
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white font-semibold"
            />
            <button
              type="button"
              onClick={() => loadAdminData(sessionDate)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 font-semibold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <Link
              href="/helpdesk"
              className="inline-flex items-center gap-1 rounded-xl bg-teal-600 hover:bg-teal-500 px-3 py-2 font-semibold text-white transition"
            >
              Helpdesk <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/doctor"
              className="inline-flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 font-semibold transition"
            >
              Doctor <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {bannerMsg && (
          <div
            className={`rounded-2xl p-4 text-xs font-semibold flex items-center gap-2.5 border ${
              bannerMsg.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {bannerMsg.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{bannerMsg.text}</span>
          </div>
        )}

        {/* Top KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="text-xs font-medium text-slate-500">Total Tokens ({sessionDate})</div>
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">
              {tokens.length}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="text-xs font-medium text-slate-500">Paid Tokens</div>
            <div className="text-2xl font-extrabold text-emerald-700 tabular-nums mt-1">
              {paidCount}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="text-xs font-medium text-slate-500">Total Collected</div>
            <div className="text-2xl font-extrabold text-teal-700 tabular-nums mt-1">
              ₹{totalCollected.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="text-xs font-medium text-slate-500">QR / Geofence Radius</div>
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">
              {cfg.geofence_radius_m}m
            </div>
          </div>
        </div>

        {/* Settlement + Shift Briefing */}
        <EndOfDaySettlementCard tokens={tokens} sessionDate={sessionDate} />
        <ShiftDoctorBriefing
          tokens={tokens}
          sessionDate={sessionDate}
          roleTitle="Admin Shift Completion & Revenue Briefing"
        />

        {/* Clinic Configuration Form */}
        <form
          onSubmit={handleSaveConfig}
          className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-teal-700" />
              <h2 className="text-base font-bold text-slate-900">
                Clinic Fees, Shift Timings & GPS Geofence Settings
              </h2>
            </div>
            <button
              type="submit"
              disabled={savingConfig}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white px-4 py-2 text-xs font-bold transition"
            >
              <Save className="w-3.5 h-3.5" />
              {savingConfig ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Mon–Sat Fee (₹)</label>
              <input
                type="number"
                value={cfg.weekday_fee}
                onChange={(e) => setCfg({ ...cfg, weekday_fee: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Sunday Fee (₹)</label>
              <input
                type="number"
                value={cfg.sunday_fee}
                onChange={(e) => setCfg({ ...cfg, sunday_fee: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Avg Mins / Patient</label>
              <input
                type="number"
                value={cfg.avg_mins_per_patient}
                onChange={(e) => setCfg({ ...cfg, avg_mins_per_patient: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Morning Start (IST)</label>
              <input
                type="time"
                value={morningStart}
                onChange={(e) => setMorningStart(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Morning End (IST)</label>
              <input
                type="time"
                value={morningEnd}
                onChange={(e) => setMorningEnd(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Evening Start (IST)</label>
              <input
                type="time"
                value={eveningStart}
                onChange={(e) => setEveningStart(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Evening End (IST)</label>
              <input
                type="time"
                value={eveningEnd}
                onChange={(e) => setEveningEnd(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Clinic Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={cfg.clinic_lat}
                onChange={(e) => setCfg({ ...cfg, clinic_lat: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Clinic Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={cfg.clinic_lng}
                onChange={(e) => setCfg({ ...cfg, clinic_lng: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Geofence Radius (m)</label>
              <input
                type="number"
                value={cfg.geofence_radius_m}
                onChange={(e) => setCfg({ ...cfg, geofence_radius_m: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">QR Secret Key</label>
              <input
                type="text"
                value={cfg.qr_secret}
                onChange={(e) => setCfg({ ...cfg, qr_secret: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
        </form>

        {/* Master Token & Payment Management Table */}
        <section className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-700" />
              <h2 className="text-base font-bold text-slate-900">
                Full Token & Payment Control ({filteredTokens.length})
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                disabled={busyAction}
                onClick={() => handleClearSession('MORNING')}
                className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-1.5 font-semibold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Morning
              </button>
              <button
                type="button"
                disabled={busyAction}
                onClick={() => handleClearSession('EVENING')}
                className="inline-flex items-center gap-1 rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 px-3 py-1.5 font-semibold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Evening
              </button>
              <button
                type="button"
                disabled={busyAction}
                onClick={() => handleClearSession('ALL')}
                className="inline-flex items-center gap-1 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-red-800 px-3 py-1.5 font-semibold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset Day
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search token (M-1, E-1), patient name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value as 'ALL' | 'MORNING' | 'EVENING')}
              className="rounded-xl border border-slate-300 px-3 py-2 font-semibold bg-white"
            >
              <option value="ALL">All Shifts</option>
              <option value="MORNING">Morning</option>
              <option value="EVENING">Evening</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 font-semibold bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="WAITING">WAITING</option>
              <option value="IN_CABIN">IN_CABIN</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="SKIPPED">SKIPPED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-3">Token</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTokens.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No tokens found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredTokens.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-black text-slate-900 tabular-nums">
                        {formatShiftTokenLabel(t.token_number, t.shift_slot, t.created_at)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{t.patient_name}</div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {t.patient_phone} • {t.booking_source} • ₹{t.fee_amount}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                          {t.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {t.payment_status === 'PAID' ? (
                          <span className="font-bold text-emerald-700">PAID ({t.payment_mode})</span>
                        ) : (
                          <span className="font-bold text-amber-700">UNPAID</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          {t.payment_status !== 'PAID' ? (
                            <>
                              <button
                                type="button"
                                disabled={busyAction}
                                onClick={() =>
                                  updateToken(t.id, { payment_status: 'PAID', payment_mode: 'CASH' })
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                              >
                                Cash
                              </button>
                              <button
                                type="button"
                                disabled={busyAction}
                                onClick={() =>
                                  updateToken(t.id, { payment_status: 'PAID', payment_mode: 'UPI' })
                                }
                                className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold"
                              >
                                UPI
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={busyAction}
                              onClick={() =>
                                updateToken(t.id, { payment_status: 'UNPAID', payment_mode: 'NONE' })
                              }
                              className="px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold"
                            >
                              Unpaid
                            </button>
                          )}

                          {t.status !== 'COMPLETED' && (
                            <button
                              type="button"
                              disabled={busyAction}
                              onClick={() => updateToken(t.id, { status: 'COMPLETED' })}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold"
                            >
                              Complete
                            </button>
                          )}

                          {t.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              disabled={busyAction}
                              onClick={() => updateToken(t.id, { status: 'CANCELLED' })}
                              className="px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <PinGate role="ADMIN" title="Admin Control Center">
      <AdminConsole />
    </PinGate>
  );
}
