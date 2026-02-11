# Kid Expenses PRD — Product Manager Contributions

**Author:** Product Manager
**Date:** February 6, 2026
**Status:** Draft for Review

---

## 1. Executive Summary

Kid Expenses (KE) is a co-parent expense tracking application designed to reduce financial conflict between divorced or separated parents who share child-related costs. The product provides a neutral, auditable shared ledger where both parents can log expenses, see a running balance, and resolve disagreements through a structured workflow. Unlike spreadsheets or payment apps like Venmo, KE offers a purpose-built solution with an 8-status questioning workflow, configurable split ratios, and a complete audit trail of every financial decision.

The core product thesis is that financial friction between co-parents stems from lack of transparency and unclear processes for disagreement resolution. By providing a neutral platform with clear rules — where questioned items are automatically excluded from the balance until resolved, and where every action is logged — KE removes ambiguity and reduces the emotional labor of coordinating shared expenses. The product is mobile-web-first (responsive, not native) to maximize accessibility without app store friction.

KE is approximately 60-70% through Phase 1 MVP development. The technical stack (Next.js 16, Cloudflare Workers, D1, Clerk, Stripe) is proven and the core expense/payment flows are functional. Remaining MVP work includes completing the questioning workflow UI, payment recording polish, and Stripe integration for the Pro tier. The product targets launch with a Free tier ($0, limited features) and Pro tier ($5/month, unlimited features) to establish product-market fit before expanding functionality.

---

## 2. Product Vision & Identity

### Mission Statement

To eliminate money as a source of weekly conflict between co-parents by providing transparent, auditable expense tracking that both parties trust.

### Positioning Statement

> "A neutral ledger for kid costs — so money doesn't become a weekly argument."

For divorced or separated parents who share child expenses, Kid Expenses is a shared financial tracking app that provides structured disagreement resolution and complete audit trails. Unlike spreadsheets, Venmo screenshots, or text message negotiations, KE ensures both parents have equal visibility, clear processes for questioning expenses, and an immutable record of all decisions.

### What KE Is

- A shared, two-parent expense ledger with equal access for both parents
- A structured questioning workflow with clear resolution paths and timeouts
- An audit trail that logs who did what, when, and why
- A balance calculator that shows exactly who owes whom at any moment
- A tool for reducing conflict through transparency and process

### What KE Is Not

- Not a payment processor (payments happen externally via Venmo, Zelle, cash, etc.)
- Not a custody calendar or scheduling tool
- Not a communication platform for co-parent messaging
- Not a legal documentation system (though exports may support legal needs in v2)
- Not a family budgeting app for intact households

### Core Test

Every feature decision must pass this test:

> "Does this feature reduce financial conflict between co-parents, or make the shared expense process more transparent?"

If the answer is no, the feature does not belong in KE. This test explicitly deprioritizes features that are "nice to have" for expense tracking but do not address the core problem of co-parent financial friction.

---

## 3. Product Principles

The following principles guide all product decisions for Kid Expenses. When principles conflict, earlier principles take precedence.

### Principle 1: Neutrality Above All

KE must never appear to favor one parent over the other. The UI, copy, notifications, and workflows must treat both parents as equals. We use "other parent" not "ex" or "opponent." We show the same information to both parties. The balance display is factual, not accusatory ("Net balance: Parent A owes $50" not "You haven't paid your share").

### Principle 2: Transparency Reduces Conflict

Every action in KE is visible to both parents. There are no private notes, hidden edits, or silent deletions. The audit trail exists not for legal purposes (though it may serve that need) but because visibility creates accountability and accountability reduces disagreements.

### Principle 3: Process Over Persuasion

When parents disagree about an expense, KE does not try to resolve the disagreement — it provides a structured process for the disagreement to reach resolution. The questioning workflow (questioned, pending_satisfaction, resolved, etc.) ensures both parties have defined actions and timeouts, reducing endless back-and-forth.

### Principle 4: Exclude the Uncertain

Expenses under active questioning are excluded from the balance until resolution. This prevents the common frustration of "you're counting money I never agreed to." Only posted, resolved, and resolved_creator_decided expenses affect the net balance.

### Principle 5: Simple Defaults, Configurable Details

The default experience is a 50/50 split with no complexity. Parents who need different split ratios can configure them, but the product does not assume complexity. Every configuration option adds cognitive load; we add them only when the benefit clearly exceeds the cost.

### Principle 6: Mobile-First, Web-Only

Parents check expenses on their phones while picking up kids, not at desks. Every screen must work on a 375px viewport. We do not build native apps — the web provides sufficient capability without app store friction, update delays, or platform-specific maintenance.

### Principle 7: Monetize Through Value, Not Lock-In

The Free tier must be genuinely useful, not a crippled demo. Pro features add convenience and depth (unlimited history, unlimited recurring expenses, CSV export) but do not create artificial pain points. Users upgrade because Pro is better, not because Free is broken.

---

## 4. Pricing Strategy

### Tier Comparison

| Feature                     | Free ($0)          | Pro ($5/month)     |
| --------------------------- | ------------------ | ------------------ |
| Two-parent shared ledger    | Yes                | Yes                |
| Add expenses                | Unlimited          | Unlimited          |
| Record payments             | Unlimited          | Unlimited          |
| Questioning workflow        | Full 8-status flow | Full 8-status flow |
| Audit trail                 | Full visibility    | Full visibility    |
| Split ratio configuration   | Yes                | Yes                |
| Expense history             | 3 months rolling   | Unlimited          |
| Recurring expense templates | Max 2 active       | Unlimited          |
| CSV export                  | No                 | Yes                |
| Receipt image attachments   | No                 | Yes (v1.1)         |
| Annual summary reports      | No                 | Yes (v1.2)         |
| Per-category split ratios   | No                 | Yes (v1.2)         |

### Pricing Rationale

**$5/month was chosen because:**

1. **Accessibility:** Co-parents facing divorce/separation often have financial strain. $5 is low enough that both parents can reasonably afford it, and one parent upgrading benefits both.
2. **Psychological threshold:** $5 feels like a "cup of coffee" — an easy impulse decision rather than a budget line item.
3. **Per-family, not per-user:** One Pro subscription covers the entire family ledger. Both parents benefit when either one subscribes.
4. **Monthly, not annual:** Co-parenting situations can change. Monthly billing respects that reality.

**No annual discount initially:** We do not offer annual plans at launch because (a) we need monthly churn data to understand retention, and (b) annual plans create refund complexity for a small team.

### Conversion Triggers

Free users are most likely to convert when they:

1. **Hit the 3-month history wall:** Trying to reference an old expense for tax purposes or a disagreement
2. **Need a third recurring expense:** School tuition, after-school care, and activity fees exceed the 2-template limit
3. **Need to export for legal/tax purposes:** Divorce proceedings, tax documentation, mediation sessions
4. **Add receipt images:** Visual documentation of expenses (v1.1 feature)

### Upgrade UX

- Upgrade prompts appear contextually (e.g., when trying to add a 3rd recurring expense)
- No interstitials, pop-ups, or aggressive upselling
- Upgrade/downgrade is self-service, immediate, and reversible
- Downgrade does not delete data; it restricts access to older history

### Future Pricing Considerations

- **Family Pro ($8/month):** If we add multi-family support, a family-bundle tier may make sense
- **Mediator tier:** If therapist/mediator view launches in v2, separate pricing for professional access

---

## 5. Success Metrics & Kill Criteria

### Primary KPIs

| Metric                          | Definition                                                               | Target | Timeframe |
| ------------------------------- | ------------------------------------------------------------------------ | ------ | --------- |
| Weekly Active Families (WAF)    | Families with at least one expense or payment logged in the past 7 days  | 500    | Month 6   |
| Monthly Active Families (MAF)   | Families with at least one expense or payment logged in the past 30 days | 1,000  | Month 6   |
| Paid Conversion Rate            | % of families with at least one Pro subscription                         | 5%     | Month 6   |
| Monthly Recurring Revenue (MRR) | Total monthly subscription revenue                                       | $250   | Month 6   |

### Secondary KPIs

| Metric                      | Definition                                                                   | Target   | Timeframe |
| --------------------------- | ---------------------------------------------------------------------------- | -------- | --------- |
| Onboarding Completion Rate  | % of signups that create a family and invite a partner                       | 40%      | Month 3   |
| Partner Join Rate           | % of invites that result in the other parent joining                         | 30%      | Month 3   |
| Questioning Resolution Rate | % of questioned expenses that reach a resolved state (not closed_unresolved) | 80%      | Month 3   |
| Time to Resolution          | Median days from questioned to resolved                                      | < 5 days | Month 3   |
| Churn Rate (Pro)            | % of Pro subscribers who cancel in a given month                             | < 10%    | Month 6   |

### Leading Indicators (Weekly Tracking)

- New family signups
- Expenses created
- Payments recorded
- Questions initiated
- Resolutions completed
- Pro trial starts (if applicable)

### Kill Criteria

The product will be discontinued if any of the following conditions are met:

| Condition                 | Threshold             | Evaluation Point |
| ------------------------- | --------------------- | ---------------- |
| Total families registered | < 100                 | Month 4          |
| Monthly Active Families   | < 50                  | Month 6          |
| Partner join rate         | < 15%                 | Month 4          |
| Paid conversion rate      | < 2%                  | Month 8          |
| Monthly burn rate         | > $500/month net loss | Month 6          |

**Kill process:** If a kill criterion is triggered, the team has 30 days to present a pivot proposal. If no viable pivot is identified, the product enters sunset mode with 60-day user notice and data export availability.

---

## 6. Risks & Mitigations

### Product Risks

| Risk                                | Likelihood | Impact   | Mitigation                                                                                                                                 |
| ----------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Only one parent uses the app        | High       | Critical | Solo mode must be valuable on its own (personal expense tracking). Remind solo users to invite partner. Consider value-add for solo users. |
| Questioning workflow is too complex | Medium     | High     | Extensive user testing during beta. Provide in-app guidance. Consider simplified "accept/reject" mode for v1.1.                            |
| Users abandon after setup           | Medium     | High     | Onboarding wizard with immediate value demonstration. Email/push reminders for first expense.                                              |
| Emotional context makes UX hostile  | Medium     | Medium   | Language review with divorce counselor. Neutral terminology (Design Charter). Avoid any language that implies fault.                       |

### Market Risks

| Risk                                | Likelihood | Impact | Mitigation                                                                                                                     |
| ----------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Competitors launch similar product  | Medium     | Medium | Speed to market. Focus on workflow quality over feature quantity. Build switching costs through audit trail value.             |
| Venmo/Zelle adds expense tracking   | Low        | High   | Differentiate on questioning workflow (they won't build dispute resolution). Emphasize neutrality (they favor the payer).      |
| Target market smaller than expected | Medium     | Medium | Validate with divorce statistics. Track family creation rates. Consider adjacent markets (unmarried co-parents, grandparents). |
| Negative association with divorce   | Low        | Medium | Position as "for parents who share expenses" not "for divorced parents." Emphasize conflict reduction, not divorce tooling.    |

### Technical Risks

| Risk                           | Likelihood | Impact   | Mitigation                                                                                                |
| ------------------------------ | ---------- | -------- | --------------------------------------------------------------------------------------------------------- |
| Cloudflare D1 limitations      | Low        | Medium   | D1 is production-ready. Monitor query patterns. Have PostgreSQL migration plan if needed.                 |
| Clerk auth issues              | Low        | High     | Clerk is well-established. Maintain minimal auth coupling. Document SSO migration path.                   |
| Balance calculation bugs       | Medium     | Critical | Extensive unit tests for calculation module. All money as integers (cents). Automated regression testing. |
| 7-day timeout cron reliability | Medium     | Medium   | Multiple fallback mechanisms. Check timeout on read, not just cron. Alert on missed transitions.          |

### Operational Risks

| Risk                                   | Likelihood | Impact | Mitigation                                                                                                    |
| -------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| Support burden from emotional users    | High       | Medium | Self-service first. FAQ covering common disputes. Clear "we don't mediate" policy. Escalation path for abuse. |
| Legal liability from disputed expenses | Low        | High   | Terms of Service explicitly disclaim KE as legal record. No legal advice. Encourage professional mediators.   |
| GDPR/privacy compliance                | Medium     | Medium | Minimal data collection. Clear privacy policy. Data export and deletion flows.                                |

---

## 7. Open Decisions / ADRs Needed

The following questions require architectural decision records (ADRs) before proceeding:

### ADR-001: Multi-Family Support Architecture

**Question:** How should we model users who have children with multiple ex-partners?

**Options:**

1. One user can belong to multiple families, switching context manually
2. Separate accounts per family relationship
3. "Family groups" within a single family record

**Implications:** Database schema, permission model, UI complexity, billing (per-family vs per-user)

**Decision needed by:** Phase 2 planning

---

### ADR-002: Notification Strategy

**Question:** How and when should we notify users about activity?

**Options:**

1. Email-only notifications
2. Push notifications (requires PWA or native wrapper)
3. In-app only (check the app)
4. Configurable per-event-type

**Implications:** User engagement, development complexity, cost (email sending), mobile experience

**Decision needed by:** v1.1 scoping

---

### ADR-003: Receipt Image Storage

**Question:** Where should receipt images be stored?

**Options:**

1. Cloudflare R2 (native to our stack)
2. Third-party image hosting (Cloudinary, Uploadcare)
3. Client-side compression + base64 in D1 (not recommended)

**Implications:** Cost, image processing capabilities, privacy, backup complexity

**Decision needed by:** v1.1 development

---

### ADR-004: Closed (Unresolved) Semantics

**Question:** What happens to closed_unresolved expenses long-term?

**Current behavior:** Excluded from balance permanently.

**Open questions:**

- Can they be reopened?
- Should they count toward any reporting?
- How do they appear in annual summaries?

**Decision needed by:** v1.1 reporting features

---

### ADR-005: Therapist/Mediator View

**Question:** How should professional third-party access work?

**Options:**

1. Read-only invite link (time-limited)
2. Separate professional account type with different permissions
3. PDF/export-based sharing (no live access)

**Implications:** Privacy, liability, billing, permission model

**Decision needed by:** v2.0 planning

---

### ADR-006: Offline Support

**Question:** Should KE work offline?

**Options:**

1. No offline support (require connectivity)
2. Read-only offline (cache recent data)
3. Full offline with sync (complex)

**Implications:** PWA scope, conflict resolution, user expectations

**Decision needed by:** v1.2 planning

---

## 8. Phased Development Plan

### Phase 1: MVP (Current — Target: March 2026)

**Goal:** Launch a functional two-parent expense tracking app with questioning workflow and payment recording.

**Status:** 60-70% complete

#### Features Included

| Feature                                  | Status      | Notes |
| ---------------------------------------- | ----------- | ----- |
| Clerk authentication (email + Google)    | Complete    |       |
| Family creation + invite flow            | Complete    |       |
| Add expense (manual entry)               | Complete    |       |
| Expense list view                        | Complete    |       |
| Expense detail page                      | Complete    |       |
| Balance calculation + display            | Complete    |       |
| Question expense (initiate)              | Complete    |       |
| Resolve question (creator response)      | Complete    |       |
| Satisfy resolution (questioner confirms) | In Progress |       |
| 7-day timeout auto-resolution            | In Progress |       |
| Payment recording                        | In Progress |       |
| Activity feed                            | Partial     |       |
| Children management                      | Complete    |       |
| Recurring expense templates              | In Progress |       |
| Stripe integration (Pro tier)            | Not Started |       |
| Settings (split ratio, family)           | Partial     |       |

#### Exit Criteria for Phase 1

- [ ] All 8 expense statuses functional and tested
- [ ] Payment recording complete with balance impact
- [ ] Stripe checkout flow for Pro tier
- [ ] Free tier limits enforced (3-month history, 2 recurring)
- [ ] Mobile-responsive on all core screens
- [ ] Production deployment on Vercel + Cloudflare
- [ ] < 3 critical bugs in issue tracker
- [ ] 10+ beta families have completed onboarding

---

### Phase 2: Engagement & Retention (Target: June 2026)

**Goal:** Increase partner join rate, reduce abandonment, add notification infrastructure.

#### Features Planned

| Feature                                | Priority | Notes                         |
| -------------------------------------- | -------- | ----------------------------- |
| Email notifications for questions      | P1       | Resend integration            |
| Stale question alerts (14-day warning) | P1       | Reduce closed_unresolved rate |
| Receipt image upload                   | P1       | Pro feature, R2 storage       |
| Child tagging on expenses              | P2       | Optional metadata             |
| Improved onboarding wizard             | P1       | Increase completion rate      |
| Partner reminder emails                | P2       | Nudge pending invites         |
| CSV export (Pro)                       | P1       | Required for Pro value        |
| Annual summary view                    | P2       | Pro feature, tax season       |

#### Exit Criteria for Phase 2

- [ ] Partner join rate > 30%
- [ ] Notification system operational (email)
- [ ] Receipt upload functional (Pro)
- [ ] CSV export functional (Pro)
- [ ] MAF > 500
- [ ] Pro conversion > 3%

---

### Phase 3: Expansion & Scale (Target: October 2026)

**Goal:** Add advanced features for power users, explore adjacent markets.

#### Features Planned

| Feature                      | Priority | Notes                      |
| ---------------------------- | -------- | -------------------------- |
| Per-category split ratios    | P1       | Long-requested Pro feature |
| Multiple families per user   | P1       | ADR-001 must be resolved   |
| Annual summary reports (PDF) | P2       | Tax documentation          |
| Therapist/mediator view      | P3       | ADR-005 must be resolved   |
| Court-ready export format    | P3       | Legal use case             |
| Push notifications (PWA)     | P2       | Mobile engagement          |
| Expense search and filtering | P2       | Quality of life            |

#### Exit Criteria for Phase 3

- [ ] Multi-family support live
- [ ] Per-category splits functional
- [ ] MAF > 1,000
- [ ] MRR > $500
- [ ] Pro conversion > 5%
- [ ] Churn < 10%

---

### Beyond Phase 3 (2027+)

Potential directions pending Phase 3 learnings:

- **Native mobile apps** if PWA engagement is insufficient
- **Custody calendar integration** if there's clear demand
- **B2B channel** (family law firms, mediators) if professional use emerges
- **International expansion** if US market proves viable
- **Family budgeting features** if users request proactive planning

---

_This document represents the Product Manager's contributions to the KE PRD. It should be reviewed alongside Engineering, Design, and QA contributions before final PRD consolidation._
