const steps = [
  {
    number: '01',
    title: 'Log expenses as they happen',
    body: 'Add an expense in seconds: amount, category, who paid, optional receipt link. Your co-parent sees it instantly.',
  },
  {
    number: '02',
    title: 'Recurring stuff handles itself',
    body: 'School tuition, daycare, insurance — set it once and it posts every month. No more reminders, no more missed entries.',
  },
  {
    number: '03',
    title: 'Settle with one tap',
    body: 'When the balance gets uncomfortable, settle. Mark a payment received, ledger zeros out, audit trail intact.',
  },
]

export function HowItWorks() {
  return (
    <section className="py-16 px-4 sm:px-ke-card">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-ke-display sm:text-ke-display font-semibold text-ke-primary mb-12 text-center">
          How it works
        </h2>
        <div className="grid gap-10 sm:gap-12 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number}>
              <div className="text-ke-accent text-ke-display font-semibold mb-3">{step.number}</div>
              <h3 className="text-ke-title font-semibold text-ke-primary mb-2">{step.title}</h3>
              <p className="text-ke-secondary leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
