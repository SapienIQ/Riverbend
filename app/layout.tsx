import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Riverbend Workshop',
  description:
    'A tactile archaeology crafting and reconstruction vertical slice set in the fictional Leth River Basin.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
