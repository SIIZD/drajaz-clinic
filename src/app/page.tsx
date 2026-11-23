import Link from 'next/link';
import {
  QrCode,
  PhoneCall,
  Stethoscope,
  ShieldCheck,
  Clock,
  MapPin,
  ChevronRight,
  Activity,
  IndianRupee,
} from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white text-slate-900 flex flex-col justify-between">
      {/* Top Clinical Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-5 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-400/30 flex items-center justify-center text-teal-400 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-teal-400">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Live OPD Queue System
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Dr. Ajaz Clinic</h1>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                Aurangabad, Maharashtra
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-start sm:items-end justify-between gap-1 text-xs bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5">
            <div className="flex items-center gap-1.5 text-slate-200 font-medium">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span>10:00 AM – 4:00 PM • 6:30 PM – 11:00 PM</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <IndianRupee className="w-3 h-3 text-amber-400" />
              <span>Consultation: ₹300 (Mon–Sat) • ₹400 (Sun)</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Portal Cards */}
      <section className="max-w-3xl w-full mx-auto px-5 py-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Select Station or Patient Portal
          </h2>
          <p className="text-xs text-slate-500">
            Staff stations are PIN-protected. Patient registration requires on-premises GPS verification.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            href="/scan?key=DRAJAZ_V8QR5X_SECRET"
            className="group relative bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-500 transition flex flex-col justify-between gap-4"
          >
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition">
                <QrCode className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                Patient Self-Service
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900">Patient QR Token Scan</h3>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition" />
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                GPS-verified waiting room check-in with live token tracker and wait-time countdown.
              </p>
            </div>
          </Link>

          <Link
            href="/helpdesk"
            className="group relative bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-500 transition flex flex-col justify-between gap-4"
          >
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                <PhoneCall className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                PIN Protected
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900">Helpdesk & Fee Counter</h3>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Register phone/walk-in/emergency patients and collect Cash or UPI consultation fees.
              </p>
            </div>
          </Link>

          <Link
            href="/doctor"
            className="group relative bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-900 transition flex flex-col justify-between gap-4"
          >
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-teal-400 flex items-center justify-center group-hover:bg-slate-800 transition">
                <Stethoscope className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                PIN Protected
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900">Dr. Ajaz Cabin Console</h3>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition" />
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Call next patient into cabin, track real-time fee clearance, and manage OPD flow.
              </p>
            </div>
          </Link>

          <Link
            href="/admin"
            className="group relative bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-500 transition flex flex-col justify-between gap-4"
          >
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                Admin PIN
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900">Admin Queue Override</h3>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition" />
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Reorder active queue positions or cancel duplicate and no-show registrations.
              </p>
            </div>
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200/80 py-4 px-5 text-center text-xs text-slate-400">
        Dr. Ajaz Clinic • Aurangabad • Real-Time Queue Management
      </footer>
    </main>
  );
}
