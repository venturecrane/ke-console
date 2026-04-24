import { Button } from '@/components/ui'

export function Hero() {
  return (
    <section className="pt-28 pb-16 px-4 sm:px-6 max-w-5xl mx-auto">
      <p className="text-xs uppercase tracking-widest text-ke-accent mb-5 font-medium">
        Private alpha — invite only
      </p>
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-ke-primary leading-[1.1] mb-6">
        The shared ledger for co-parents.
      </h1>
      <p className="text-lg sm:text-xl text-ke-secondary leading-relaxed mb-10 max-w-2xl">
        A neutral space to log shared child expenses, track running balance, and settle without
        arguments. Built for divorced and separated parents who want clarity, not conflict.
      </p>
      <a href="#waitlist" className="inline-block">
        <Button size="lg" className="px-8">
          Request access
        </Button>
      </a>
    </section>
  )
}
