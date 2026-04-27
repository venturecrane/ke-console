export function Problem() {
  return (
    <section className="bg-ke-elevated py-16 px-4 sm:px-ke-card">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-ke-display sm:text-ke-display font-semibold text-ke-primary mb-10">
          Money was supposed to be the easy part. It is not.
        </h2>
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <h3 className="text-ke-label font-semibold uppercase tracking-widest text-ke-muted mb-4">
              How it usually goes
            </h3>
            <ul className="space-y-3 text-ke-secondary">
              <li className="flex gap-ke-row">
                <span className="shrink-0 mt-1 text-ke-muted" aria-hidden="true">
                  ×
                </span>
                <span>Texts and screenshots about who paid for what.</span>
              </li>
              <li className="flex gap-ke-row">
                <span className="shrink-0 mt-1 text-ke-muted" aria-hidden="true">
                  ×
                </span>
                <span>A spreadsheet that nobody updates after month two.</span>
              </li>
              <li className="flex gap-ke-row">
                <span className="shrink-0 mt-1 text-ke-muted" aria-hidden="true">
                  ×
                </span>
                <span>Owed amounts becoming a fight instead of a number.</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-ke-label font-semibold uppercase tracking-widest text-ke-accent mb-4">
              How it works in Kid Expenses
            </h3>
            <ul className="space-y-3 text-ke-primary">
              <li className="flex gap-ke-row">
                <span className="shrink-0 mt-1 text-ke-accent" aria-hidden="true">
                  ✓
                </span>
                <span>Both co-parents see the same ledger in real time.</span>
              </li>
              <li className="flex gap-ke-row">
                <span className="shrink-0 mt-1 text-ke-accent" aria-hidden="true">
                  ✓
                </span>
                <span>Recurring expenses post automatically each month.</span>
              </li>
              <li className="flex gap-ke-row">
                <span className="shrink-0 mt-1 text-ke-accent" aria-hidden="true">
                  ✓
                </span>
                <span>Running balance to the cent. No interpretation. No drama.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
