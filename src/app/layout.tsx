import type { Metadata } from "next";
import "./globals.css";
import NavBar from "./_components/NavBar";
import { getActiveAccountSlug } from "@/lib/account";

export const metadata: Metadata = {
  title: "LinkedIn Assistant",
  description: "Personal LinkedIn content assistant for Houtan",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const activeSlug = await getActiveAccountSlug();
  return (
    <html lang="en">
      <body>
        <NavBar activeSlug={activeSlug} />
        {children}
      </body>
    </html>
  );
}
