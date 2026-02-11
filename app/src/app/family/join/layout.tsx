import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Join KidExpenses',
  description: 'Track shared kid expenses together with your co-parent',
  openGraph: {
    title: 'Join KidExpenses',
    description: 'Track shared kid expenses together with your co-parent',
    siteName: 'KidExpenses',
    type: 'website',
    // Add og:image once a logo is available:
    // images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary',
    title: 'Join KidExpenses',
    description: 'Track shared kid expenses together with your co-parent',
  },
}

export default function JoinFamilyLayout({ children }: { children: React.ReactNode }) {
  return children
}
