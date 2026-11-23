'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase, getTodayFee, QueueToken } from '@/lib/supabase';
import { useLiveQueue } from '@/hooks/useLiveQueue';
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Activity,
  Users,
  IndianRupee,
  UserPlus,
  BellRing,
} from 'lucide-react';

function ScanContent() {
  const searchParams = useSearchParams();
  const qrKey = searchParams.get('key') || '';
  const { tokens, refetch } = useLiveQueue();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [todayFee, setTodayFee] = useState<number>(300);
  const [bookedTokenId, setBookedTokenId] = useState<string | null>(null);
  const [bookedTokenData, setBookedTokenData] = useState<QueueToken | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setTodayFee(getTodayFee());
    const savedId = localStorage.getItem('drajaz_active_token_id');
    if (savedId) setBookedTokenId(savedId);
  }, []);

  const liveMatch = tokens.find((t) => t.id === bookedTokenId);
  const myToken = liveMatch || bookedTokenData;
  const inCabin = tokens.find((t) => t.status === 'IN_CABIN');
  const waitingList = tokens.filter((t) => t.status === 'WAITING');

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim() || !/^\d{10}$/.test(phone.trim())) {
      setErrorMsg('Please enter your full name and a valid 10-digit mobile number.');
      return;
    }

    if (!navigator.geolocation) {
      setErrorMsg('Location services are not supported by your browser.');
      return;
    }

    setSubmitting(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        const { data, error } = await supabase.rpc('book_qr_token', {
          p_qr_secret: qrKey,
          p_patient_name: name.trim(),
          p_patient_phone: phone.trim(),
          p_lat: latitude,
          p_lng: longitude,
        });

        setSubmitting(false);

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        if (data && data.id) {
          setBookedTokenId(data.id);
          setBookedTokenData(data as QueueToken);
          localStorage.setItem('drajaz_active_token_id', data.id);
          refetch();
        } else {
          setErrorMsg('Booking did not return a token. Please try again.');
        }
      },
      () => {
        setSubmitting(false);
        setErrorMsg(
          'Location permission denied. Please allow GPS/Location access in your browser settings to register at Dr. Ajaz Clinic.'
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  if (myToken && (myToken.status === 'WAITING' || myToken.status === 'IN_CABIN')) {
    const idxInWaiting = waitingList.findIndex((t) => t.id === myToken.id);
    const patientsAhead = idxInWaiting >= 0 ? idxInWaiting : waitingList.length;
    const estWaitMins = patientsAhead > 0 ? patientsAhead * 7 : 0;

    return (
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-200 overflow-hidden">
        {/* Top Clinic Strip */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-400" />
            <span className="font-bold text-sm">Dr. Ajaz Clinic</span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Live Status
          </span>
        </div>

        <div className="p-6 space-y-5 text-center">
          {myToken.status === 'IN_CABIN' ? (
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-6 space-y-2 shadow-lg shadow-emerald-600/20">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto animate-bounce">
                <BellRing className="w-6 h-6" />
              </div>
              <div className="text-xs uppercase tracking-widest font-semibold text-emerald-100">
                Token #{myToken.token_number}
              </div>
              <h2 className="text-2xl font-extrabold">It's Your Turn Now!</h2>
              <p className="text-xs text-emerald-50">
                Please proceed inside Dr. Ajaz's consultation cabin immediately.
              </p>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 space-y-1 shadow-md">
              <div className="text-[11px] uppercase tracking-widest text-teal-400 font-semibold">
                Confirmed OPD Token
              </div>
              <div className="text-6xl font-black tracking-tight tabular-nums py-1">
                #{myToken.token_number}
              </div>
              <div className="text-sm font-medium text-slate-200">{myToken.patient_name}</div>
              <div className="text-xs text-slate-400">{myToken.patient_phone}</div>
            </div>
          )}

          {/* Live Metrics */}
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="text-[11px] font-medium text-slate-500">Now in Cabin</div>
              <div className="text-lg font-extrabold text-slate-900 mt-0.5 tabular-nums">
                {inCabin ? `Token #${inCabin.token_number}` : 'Waiting to Start'}
              </div>
            </div>
            <div className="bg-teal-50/70 p-3.5 rounded-2xl border border-teal-200/80">
              <div className="text-[11px] font-medium text-teal-800">Estimated Wait</div>
              <div className="text-lg font-extrabold text-teal-700 mt-0.5 tabular-nums">
                {myToken.status === 'IN_CABIN'
                  ? 'Now'
                  : patientsAhead === 0
                  ? 'Next (~7m)'
                  : `~${estWaitMins} mins`}
              </div>
            </div>
          </div>

          {/* Fee Banner */}
          <div
            className={`rounded-2xl p-3.5 text-xs flex items-center justify-between border ${
              myToken.payment_status === 'PAID'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <div className="text-left">
              <div className="font-semibold">
                Consultation Fee •{' '}
                <span className="uppercase">{myToken.payment_status}</span>
              </div>
              <div className="text-[11px] opacity-80">
                {myToken.payment_status === 'PAID'
                  ? `Received via ${myToken.payment_mode}`
                  : 'Please pay Cash or UPI at the Helpdesk counter'}
              </div>
            </div>
            <div className="text-base font-extrabold tabular-nums">₹{myToken.fee_amount}</div>
          </div>

          <div className="pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('drajaz_active_token_id');
                setBookedTokenId(null);
                setBookedTokenData(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-teal-700 transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Register another family member
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-200 overflow-hidden">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-300 text-[11px] font-semibold">
          <MapPin className="w-3 h-3" />
          Aurangabad • GPS Verified
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Dr. Ajaz Clinic</h1>
        <p className="text-xs text-slate-400">Self-Service OPD Token Registration</p>
      </div>

      <div className="p-6 space-y-5">
        {/* Live Queue & Fee Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">In Queue</div>
              <div className="font-extrabold text-base text-slate-900 tabular-nums">
                {waitingList.length} Patients
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Today's Fee</div>
              <div className="font-extrabold text-base text-emerald-700 tabular-nums">
                ₹{todayFee}
              </div>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleBook} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Patient Full Name
            </label>
            <input
              type="text"
              required
              placeholder="Enter patient name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              10-Digit Mobile Number
            </label>
            <input
              type="tel"
              required
              maxLength={10}
              placeholder="e.g. 9823012345"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-sm text-slate-900 tabular-nums placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 disabled:opacity-60 shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 transition"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying Clinic Location...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Get Live Token
              </>
            )}
          </button>

          <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            Estimated consultation time: ~7 mins per patient
          </p>
        </form>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200/60 text-slate-900 p-4 flex items-center justify-center">
      <Suspense fallback={<div className="text-sm text-slate-500">Loading registration portal...</div>}>
        <ScanContent />
      </Suspense>
    </main>
  );
}
