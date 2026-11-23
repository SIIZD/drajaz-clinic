'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase, getTodayFee } from '@/lib/supabase';
import { useLiveQueue } from '@/hooks/useLiveQueue';
import { MapPin, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react';

function ScanContent() {
  const searchParams = useSearchParams();
  const qrKey = searchParams.get('key') || '';
  const { tokens } = useLiveQueue();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bookedTokenId, setBookedTokenId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const savedId = localStorage.getItem('drajaz_active_token_id');
    if (savedId) setBookedTokenId(savedId);
  }, []);

  const myToken = tokens.find((t) => t.id === bookedTokenId);
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
          localStorage.setItem('drajaz_active_token_id', data.id);
        }
      },
      () => {
        setSubmitting(false);
        setErrorMsg(
          'Location permission denied. Please enable GPS/Location access in your browser settings to book at Dr. Ajaz Clinic.'
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  if (myToken && (myToken.status === 'WAITING' || myToken.status === 'IN_CABIN')) {
    const patientsAhead = waitingList.findIndex((t) => t.id === myToken.id);
    const estWaitMins = patientsAhead > 0 ? patientsAhead * 7 : 0;

    return (
      <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-5 text-center">
        {myToken.status === 'IN_CABIN' ? (
          <div className="bg-emerald-600 text-white rounded-xl p-5 space-y-2 animate-pulse">
            <CheckCircle2 className="w-12 h-12 mx-auto" />
            <h2 className="text-2xl font-bold">Your Turn Now!</h2>
            <p className="text-sm text-emerald-100">
              Please enter Dr. Ajaz's cabin immediately.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 text-white rounded-xl p-5 space-y-1">
            <div className="text-xs uppercase tracking-wider text-slate-400">Your Live Token</div>
            <div className="text-5xl font-extrabold">#{myToken.token_number}</div>
            <div className="text-sm text-slate-300 pt-1">{myToken.patient_name}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-500">Now in Cabin</div>
            <div className="text-lg font-bold text-slate-900">
              {inCabin ? `Token #${inCabin.token_number}` : 'None'}
            </div>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-500">Est. Wait Time</div>
            <div className="text-lg font-bold text-emerald-700">
              {myToken.status === 'IN_CABIN'
                ? 'Now'
                : patientsAhead === 0
                ? 'Next (~7 min)'
                : `~${estWaitMins} mins`}
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between">
          <span>Consultation Fee ({myToken.payment_status}):</span>
          <span className="font-bold text-sm">₹{myToken.fee_amount}</span>
        </div>

        <button
          type="button"
          onClick={() => {
            localStorage.removeItem('drajaz_active_token_id');
            setBookedTokenId(null);
          }}
          className="text-xs text-slate-400 underline"
        >
          Book another family member
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-5">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold text-slate-900">Dr. Ajaz Clinic • Token Registration</h1>
        <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          Chhatrapati Sambhajinagar • On-Premises GPS Verified
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
        <div>
          <div className="text-slate-500">Waiting Queue</div>
          <div className="font-bold text-base text-slate-900">{waitingList.length} Patients</div>
        </div>
        <div>
          <div className="text-slate-500">Today's Fee</div>
          <div className="font-bold text-base text-emerald-700">₹{getTodayFee()}</div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleBook} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Full Name</label>
          <input
            type="text"
            required
            placeholder="e.g. Shaikh Imran"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            10-Digit Mobile Number
          </label>
          <input
            type="tel"
            required
            maxLength={10}
            placeholder="e.g. 9823012345"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2 transition"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying Clinic GPS & Booking...
            </>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              Get Live Token
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ScanPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 p-4 flex items-center justify-center">
      <Suspense fallback={<div className="text-sm text-slate-500">Loading scanner...</div>}>
        <ScanContent />
      </Suspense>
    </main>
  );
}