import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Dr. Ajaz Clinic • Hospital Queue Management System',
  description:
    'Live OPD Token Registration, Helpdesk Counter, and Cabin Console — Dr. Ajaz Clinic, Aurangabad.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-slate-50 text-slate-900 selection:bg-teal-100 selection:text-teal-900`}>
        {children}
      </body>
    </html>
  );
}
