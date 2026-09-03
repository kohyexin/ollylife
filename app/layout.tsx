import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OlyLife Wallet Activation Demo',
  description: 'OlyLife, VCCHUB and Sumsub wallet onboarding demonstration.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
