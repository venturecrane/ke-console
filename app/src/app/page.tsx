import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Footer } from '@/components/marketing/Footer'
import { Hero } from '@/components/marketing/Hero'
import { HowItWorks } from '@/components/marketing/HowItWorks'
import { Nav } from '@/components/marketing/Nav'
import { Problem } from '@/components/marketing/Problem'
import { WaitlistCTA } from '@/components/marketing/WaitlistCTA'
import { WhyDifferent } from '@/components/marketing/WhyDifferent'

export const metadata: Metadata = {
  title: 'Kid Expenses — The shared ledger for co-parents',
  description:
    'A neutral space to log shared child expenses, track running balance, and settle without arguments. In private alpha — request access.',
  openGraph: {
    title: 'Kid Expenses — The shared ledger for co-parents',
    description:
      'A neutral space to log shared child expenses, track running balance, and settle without arguments.',
    url: 'https://kidexpenses.app',
    siteName: 'Kid Expenses',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kid Expenses — The shared ledger for co-parents',
    description: 'A neutral space for co-parents. In private alpha — request access.',
  },
}

export default async function LandingPage() {
  const { userId } = await auth()

  // Authenticated testers go straight to their dashboard, not the marketing page.
  if (userId) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-dvh bg-ke-bg">
      <Nav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <WhyDifferent />
        <WaitlistCTA />
      </main>
      <Footer />
    </div>
  )
}
