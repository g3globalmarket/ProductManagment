import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { StoreHydrator } from "@/components/StoreHydrator"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Product Import Tool",
  description: "Import and manage products from various stores",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <StoreHydrator />
        {children}
        <Toaster />
      </body>
    </html>
  )
}

