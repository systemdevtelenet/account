import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { InlineScript } from "@/components/InlineScript";
import "./globals.css";

// Register the app's fonts as CSS variables so components can use them consistently.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Provide the default metadata used by browser tabs and search previews.
export const metadata: Metadata = {
  title: "Operation System",
  description: "Operation System workforce and account dashboard",
  icons: {
    icon: "/ctnp-logo.png",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  // Apply the saved theme before hydration so page colors and native controls agree.
  const darkMode = cookieStore.get("dashboard-theme")?.value === "dark";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme={darkMode ? "dark" : "light"}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: darkMode ? "dark" : "light" }}
    >
      {/* Keep the document content in a full-height app shell. */}
      <body
        className="m-0 flex min-h-full flex-col [&_button]:cursor-pointer"
      >
        {/* Mark scripting availability before paint; <html> suppresses that intentional DOM change during hydration. */}
        <InlineScript html="document.documentElement.dataset.js='true';" />
        {children}
      </body>
    </html>
  );
}
