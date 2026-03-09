import { Geist, Geist_Mono, Shantell_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import ClientLayout from "./client-layout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const shantellSans = Shantell_Sans({
  variable: "--font-shantell-sans",
  subsets: ["latin"]
})

export const metadata = {
  title: "Slash CRM ",
  description: "This is Slash Rtc CRM",
};

import { cookies } from "next/headers";

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user')?.value;
  let user = null;

  if (userCookie) {
    try {
      user = JSON.parse(decodeURIComponent(userCookie));
    } catch (e) {
      console.warn('Failed to parse user cookie in RootLayout', e);
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientLayout initialUser={user}>{children}</ClientLayout>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
