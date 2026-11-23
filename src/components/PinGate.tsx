'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Lock, Loader2, LogOut, ShieldAlert, ArrowLeft, Activity } from 'lucide-react';

type StaffRole = 'HELPDESK' | 'DOCTOR' | 'ADMIN';

export function PinGate({
  role,
  title,
  children,
}: {
  role: StaffRole;
  title: string;
  children: React.ReactNode;
}) {
  const storageKey = `drajaz_pin_ok_${role}`;
  const [unlocked, setUnlocked] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem(storageKey) === '1') {
      setUnlocked(true);
    }
    setCheckingSession(false);
  }, [storageKey]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setVerifying(true);

    const { data, error: rpcError } = await supabase.rpc('verify_staff_pin', {
      p_role: role,
      p_pin: pin.trim(),
    });

    setVerifying(false);

    if (rpcError || data !== true) {
      setError('Invalid security PIN. Please verify and try again.');
      setPin('');
      return;
    }

    sessionStorage.setItem(storageKey, '1');
    setUnlocked(true);
  };

  const handleLock = () => {
    sessionStorage.removeItem(storageKey);
    setUnlocked(false);
    setPin('');
  };

  if (checkingSession) return null;

  if (!unlocked) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white p-4 flex flex-col items-center justify-center">
        <div className="max-w-sm w-full space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Clinic Portal
          </Link>

          <form
            onSubmit={handleUnlock}
            className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-3xl p-7 shadow-2xl space-y-5 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-400">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-teal-400">
                Dr. Ajaz Clinic • Authorized Access
              </div>
              <h1 className="text-xl font-bold text-white">{title}</h1>
              <p className="text-xs text-slate-400">Enter your 4-digit station PIN to unlock</p>
            </div>

            {error && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-red-300 bg-red-950/70 border border-red-800/80 rounded-xl p-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              required
              autoFocus
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center tracking-[0.55em] text-2xl font-bold py-3.5 rounded-2xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
            />

            <button
              type="submit"
              disabled={verifying || pin.length < 4}
              className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 font-semibold text-sm text-white shadow-lg shadow-teal-950/50 flex items-center justify-center gap-2 transition"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying PIN...
                </>
              ) : (
                'Unlock Station'
              )}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-200 px-4 py-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-semibold text-white hover:text-teal-300 transition"
            >
              <Activity className="w-4 h-4 text-teal-400" />
              <span>Dr. Ajaz Clinic</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300 font-medium">{title}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Sync
            </span>
            <button
              type="button"
              onClick={handleLock}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Lock
            </button>
          </div>
        </div>
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}
