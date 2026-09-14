import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CTNP Account Analytics Portal",
  description: "Account analytics dashboard",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const darkMode = cookieStore.get("dashboard-theme")?.value === "dark";
  const backgroundColor = darkMode ? "#101c39" : "#ffffff";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{
        backgroundColor,
        colorScheme: darkMode ? "dark" : "light",
      }}
    >
      <body
        className={`m-0 flex min-h-full flex-col font-[Arial,Helvetica,sans-serif] [&_button]:cursor-pointer ${
          darkMode ? "bg-[#101c39] text-[#edf4ff]" : "bg-white text-[#0e1838]"
        }`}
        style={{ backgroundColor }}
      >
        {children}
      </body>
    </html>
  );
}
