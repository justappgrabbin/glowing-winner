import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YOU·N·I·VERSE',
  description: 'A living world where everything exists and can be experienced',
  themeColor: '#000008',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
