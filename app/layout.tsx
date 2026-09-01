import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ollylife Wallet Activation Demo',
  description: 'Ollylife, VCCHUB and Sumsub wallet onboarding demonstration.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
