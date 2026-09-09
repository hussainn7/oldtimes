import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Earth Through Time',
  description:
    'A cinematic expedition through 4.5 billion years of Earth — walk ancient worlds, meet wildlife, and read your survival outlook.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
