const differentiators = [
  {
    title: 'Neutral by design',
    body: 'No celebratory colors. No nudges. No loaded language. Numbers, status, balance. The product gets out of the way so the family can move on.',
  },
  {
    title: 'Built mobile-first',
    body: 'You log expenses where they happen — at the pediatrician, at the school office, at pickup. The app works on the phone in your hand, not the laptop in your bag.',
  },
  {
    title: 'Your data is yours',
    body: 'Export the full ledger any time. No vendor lock-in. If the relationship changes, the records come with you.',
  },
]

export function WhyDifferent() {
  return (
    <section className="bg-ke-elevated py-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-semibold text-ke-primary mb-12 text-center">
          Why it is different
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {differentiators.map((item) => (
            <div key={item.title} className="bg-ke-surface p-6 rounded-xl border border-ke-border">
              <h3 className="text-lg font-semibold text-ke-primary mb-2">{item.title}</h3>
              <p className="text-ke-secondary leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
