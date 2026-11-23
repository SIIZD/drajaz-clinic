import Link from 'next/link';
import { QrCode, PhoneCall, Stethoscope, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-6 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Dr. Ajaz Clinic</h1>
          <p className="text-sm text-slate-500">
            Chhatrapati Sambhajinagar • Live Queue System
          </p>
          <p className="text-xs text-slate-400">
            Morning: 10:00 AM – 4:00 PM • Evening: 6:30 PM – 11:00 PM
          </p>
        </div>

        <div className="grid gap-3">
          <Link
            href="/scan?key=DRAJAZ_V8QR5X_SECRET"
            className="flex items-center gap-3 p-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
          >
            <QrCode className="w-6 h-6 shrink-0" />
            <div>
              <div>Patient QR Token Scan</div>
              <div className="text-xs font-normal text-emerald-100">
                GPS geofenced self-registration
              </div>
            </div>
          </Link>

          <Link
            href="/helpdesk"
            className="flex items-center gap-3 p-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            <PhoneCall className="w-6 h-6 shrink-0" />
            <div>
              <div>Helpdesk & Fee Counter</div>
              <div className="text-xs font-normal text-blue-100">
                Phone/walk-in booking & ₹300/₹400 collection
              </div>
            </div>
          </Link>

          <Link
            href="/doctor"
            className="flex items-center gap-3 p-4 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
          >
            <Stethoscope className="w-6 h-6 shrink-0" />
            <div>
              <div>Dr. Ajaz Cabin Console</div>
              <div className="text-xs font-normal text-slate-300">
                Call next patient, monitor live queue & fee status
              </div>
            </div>
          </Link>

          <Link
            href="/admin"
            className="flex items-center gap-3 p-4 rounded-xl bg-slate-100 text-slate-800 font-semibold hover:bg-slate-200 transition border border-slate-200"
          >
            <ShieldCheck className="w-6 h-6 shrink-0 text-slate-600" />
            <div>
              <div>Admin Queue Override</div>
              <div className="text-xs font-normal text-slate-500">
                Reorder tokens & manage daily sessions
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}