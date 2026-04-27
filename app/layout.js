import { Poppins } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import ClientLayout from "./client-layout";
import Script from "next/script";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata = {
  title: "Slash CRM ",
  description: "This is Slash Rtc CRM",
};

export default async function RootLayout({ children }) {
  // User data is now stored in localStorage (client-side only).
  // The layout hydrates the user on the client via authUtils.
  const user = null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} font-sans antialiased`}
      >
        <ClientLayout initialUser={user}>{children}</ClientLayout>
        <Toaster position="top-right" expand={true} closeButton visibleToasts={6} />
        <Script id="chat-widget-config" strategy="beforeInteractive">
          {`
            window.ChatWidgetConfig = {
              flowId: "0a6afd1a-67aa-42b4-a48c-83ec44c2b356",
              serverUrl: "http://10.10.15.194:3006/api",
              title: "Chat Support",
              primaryColor: "#219175ff",
              position: "bottom-left"
            };
          `}
        </Script>
        <Script src="http://10.10.15.194:3002/chat-widget.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
