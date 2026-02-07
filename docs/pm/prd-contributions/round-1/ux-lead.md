# UX Lead PRD Contribution: Kid Expenses (KE)

## 1. Target Users & Personas

### Persona 1: Sarah — The Organized Primary Custodian

**Demographics**
- Age: 38
- Occupation: Marketing Manager at a mid-size company
- Location: Suburban Denver, CO
- Custody: Primary (70/30 split)
- Children: Two kids, ages 8 and 12
- Tech Comfort: High — uses apps for budgeting, calendar management, and family coordination

**Emotional State**
Sarah carries the mental load of tracking most expenses because she's with the kids more often. She's tired of screenshot-based expense sharing via text. She doesn't want conflict with her ex, but she also doesn't want to absorb costs that should be split. The divorce was amicable enough, but money conversations still feel loaded.

**Goals**
- Quickly log expenses when they happen (soccer registration, school supplies, prescriptions)
- Have a clear, indisputable record when her co-parent questions something
- Reduce the time she spends on expense coordination from 2+ hours/month to minutes
- Avoid emotionally charged back-and-forth about money

**Frustrations**
- Her ex sometimes "forgets" to pay their share for months
- Receipts get lost in text threads
- She feels like she's nagging when she follows up on payments
- Spreadsheets require too much maintenance
- Venmo requests feel passive-aggressive

**Quote**
> "I just want a neutral third party that says 'here's what's owed' so I'm not the bad guy asking for money."

**Jobs to Be Done**
1. *When I pay for something for the kids,* I want to log it in under 30 seconds *so that* it's recorded before I forget.
2. *When there's a disagreement about an expense,* I want documented proof of what I paid *so that* conversations stay factual, not emotional.
3. *When we settle up,* I want a clear net balance *so that* one payment covers everything instead of nickel-and-diming.

---

### Persona 2: Marcus — The Every-Other-Weekend Dad

**Demographics**
- Age: 42
- Occupation: Software Engineer (remote)
- Location: Austin, TX
- Custody: Non-primary (30/70 split, every other weekend + Wednesdays)
- Children: One daughter, age 10
- Tech Comfort: Very high — but skeptical of apps that add complexity

**Emotional State**
Marcus wants to be an engaged dad but often feels out of the loop on expenses. He gets Venmo requests with minimal context and has questioned whether some charges should really be "shared." He's not trying to be difficult, but he doesn't like rubber-stamping expenses without understanding them. The dynamic with his ex is functional but cool.

**Goals**
- Understand what he's paying for before he pays
- Have a voice in expense decisions, even if he's not the primary custodian
- Avoid being perceived as the "difficult" parent who questions everything
- Pay fairly and feel good about it

**Frustrations**
- Expenses arrive as Venmo requests with one-word descriptions
- He can't tell if some expenses are truly shared or personal choices
- Asking for receipts feels adversarial
- He has no visibility into spending patterns or totals

**Quote**
> "I'm not trying to nickel-and-dime. I just want to know what I'm paying for. Is that so unreasonable?"

**Jobs to Be Done**
1. *When I receive an expense notification,* I want to see full details (what, when, why, receipt) *so that* I can approve it confidently.
2. *When something doesn't look right,* I want to ask a clarifying question *so that* I'm not just a rubber stamp.
3. *When I review monthly expenses,* I want to see patterns and totals *so that* I can plan my own budget.

---

### Persona 3: Jamie — The Recently Separated Parent

**Demographics**
- Age: 34
- Occupation: Elementary School Teacher
- Location: Portland, OR
- Custody: Still being finalized (targeting 50/50)
- Children: Twin boys, age 6
- Tech Comfort: Moderate — uses phone for basics, not a power user

**Emotional State**
Jamie's separation is fresh (6 months). Emotions are still raw. Every interaction with their ex has subtext. Money is particularly fraught because they're both adjusting to single-income households. Jamie wants things to be fair but doesn't want to fight. They're looking for any tool that can reduce friction.

**Goals**
- Establish a neutral, low-conflict system before patterns set in
- Build a shared expense record from day one
- Avoid relying on memory or informal agreements
- Feel empowered to question unfair expenses without starting a war

**Frustrations**
- No established system yet — everything is ad hoc
- Trust is fragile; transparency feels risky but also necessary
- They're not sure what expenses should be shared vs. personal
- They worry about "keeping score" but also about being taken advantage of

**Quote**
> "I don't want this to become another thing we fight about. I need something that just... works, without drama."

**Jobs to Be Done**
1. *When we start co-parenting,* I want to set up a shared expense system *so that* we have neutral ground rules.
2. *When I'm unsure if an expense should be shared,* I want clear categories and precedents *so that* I can make fair decisions.
3. *When the system sends notifications to my ex,* I want the tone to be neutral *so that* the app doesn't add fuel to fire.

---

## 2. Core Problem

### The Emotional Dimension

Co-parents don't just need expense tracking — they need *emotional cover*. When you ask your ex to pay their share, it feels like asking for a favor. When you question an expense, it feels like an accusation. When you follow up on late payments, it feels like nagging.

**The core emotional problem:** Financial coordination between co-parents carries psychological weight far beyond the dollar amounts involved. A $15 expense dispute can trigger responses rooted in years of relationship history, feelings of being controlled or not trusted, or anxiety about being seen as petty.

Existing tools fail because they weren't designed for this emotional context:

| Tool | Why It Fails |
|------|--------------|
| **Spreadsheets** | Too much maintenance; disputes happen in separate channels; no notifications |
| **Venmo/PayPal** | Transactional, not relational; no dispute mechanism; requests feel demanding |
| **Text/Email** | Records are messy; context is lost; threads become combative |
| **Generic expense apps** | Not designed for split ownership; no question/resolution workflow |

### The Practical Dimension

Beyond emotion, there are concrete friction points:
- **Proof burden:** Who paid for what? Where's the receipt?
- **Net calculation:** When both parents pay for things, what's the actual balance?
- **Timing:** Expenses from 3 months ago are harder to discuss than yesterday's
- **Visibility:** The non-logging parent often has no insight into spending patterns
- **Settlements:** Multiple Venmo requests create cognitive overhead; net balances are cleaner

### What Success Looks Like

Success is not just "expenses get tracked." Success is:

1. **Reduced anxiety** — Neither parent dreads opening the app or sending a notification
2. **Faster resolution** — Questioned expenses get closed in days, not left to fester
3. **Fair perception** — Both parents feel the system is neutral, not favoring the other
4. **Less mental load** — The "bookkeeper" parent spends less time coordinating
5. **Fewer outside conflicts** — Money stops spilling over into pickup conversations

The emotional test for every feature: *Does this make the next in-person interaction easier or harder?*

---

## 3. User Journeys

### Journey A: First-Time Setup (Sarah's perspective)

| Step | Action | Touchpoint | Emotional State | Pain Points |
|------|--------|------------|-----------------|-------------|
| 1 | Discovers KE via Google search "co-parent expense app" | Landing page | Hopeful but skeptical | "Is this another app I'll abandon?" |
| 2 | Signs up with email | Sign-up form | Neutral | "Hope this is quick" |
| 3 | Prompted to create a Family | Create Family screen | Engaged | "What do I call this?" |
| 4 | Adds children's names | Add Children form | Invested | None — straightforward |
| 5 | Sets default split ratio (50/50) | Split settings | Thoughtful | "Can I change this later?" |
| 6 | Enters ex's email to invite | Invite Partner screen | **Anxiety spike** | "Will they actually accept? How will they react?" |
| 7 | Invitation sent | Confirmation | Relief + anticipation | "Now I wait..." |
| 8 | Ex accepts (or doesn't) | Notification / dashboard | Varies: relief or deflation | If declined: "Now what?" |
| 9 | Logs first expense | Add Expense form | Accomplishment | "Did I do this right?" |

**Key Design Implications:**
- Invitation moment is high-anxiety — copy must be warm, not demanding
- Preview of what co-parent will see when invited
- Fallback path if co-parent declines or ignores

---

### Journey B: Weekly Expense Logging (Sarah's perspective)

| Step | Action | Touchpoint | Emotional State | Pain Points |
|------|--------|------------|-----------------|-------------|
| 1 | Gets email receipt from pharmacy for kid's prescription | Email/real world | Neutral | None |
| 2 | Opens KE app (bookmarked on home screen) | App launch | Habitual | "Hope this is fast" |
| 3 | Taps "Add Expense" | FAB or nav | Focused | None |
| 4 | Enters amount, selects category (Medical) | Form | Efficient | "Do I need to itemize?" |
| 5 | Tags child (Ella) | Child selector | Quick | None |
| 6 | Adds quick description | Text input | Thoughtful | "How much detail is enough?" |
| 7 | Optionally uploads receipt photo | Photo upload | Slight friction | "My gallery is a mess" |
| 8 | Taps Submit | Submit button | Satisfied | None |
| 9 | Sees expense in list, status = "Posted" | Expense list | Accomplishment | None |
| 10 | Co-parent gets notification | (Their device) | N/A | "Hope they don't question this" |

**Key Design Implications:**
- Entry flow must be completable in <30 seconds
- Receipt upload is optional but encouraged for high-value items
- Confirmation reinforces the value of logging

---

### Journey C: Questioning an Expense (Marcus's perspective)

| Step | Action | Touchpoint | Emotional State | Pain Points |
|------|--------|------------|-----------------|-------------|
| 1 | Receives push notification: "New expense: $150 - Activities" | Notification | Curious | "What's this for?" |
| 2 | Opens app, views expense detail | Expense detail screen | Evaluating | "I need more context" |
| 3 | Sees description: "Soccer camp deposit" | Detail view | Uncertain | "I wasn't consulted about this" |
| 4 | Taps "Question" button | Expense detail | **Hesitation** | "I don't want to start a fight" |
| 5 | Writes question: "Was this discussed? I thought we agreed on the YMCA camp?" | Question composer | Careful | "How do I word this diplomatically?" |
| 6 | Submits question | Submit | Relief + apprehension | "How will she react?" |
| 7 | Status changes to "Questioned" | Status badge | Neutral | None |
| 8 | Waits for response | Notification | Anticipation | "Silence is uncomfortable" |

**Key Design Implications:**
- "Question" framing is deliberately non-adversarial
- Placeholder text in composer should model constructive questioning
- Status change is visible and immediate

---

### Journey D: Resolving a Question (Sarah's perspective, responding to Marcus)

| Step | Action | Touchpoint | Emotional State | Pain Points |
|------|--------|------------|-----------------|-------------|
| 1 | Receives notification: "Marcus questioned an expense" | Notification | **Defensive instinct** | "What now?" |
| 2 | Opens expense detail, reads question | Question thread | Processing | "He has a point, but he's wrong about YMCA" |
| 3 | Taps "Reply" | Thread | Deliberate | "Stay calm, stick to facts" |
| 4 | Writes: "YMCA was full. I texted you about it 3 weeks ago. Attaching receipt and the text screenshot." | Composer | Firm but factual | "I have to prove myself again" |
| 5 | Uploads evidence | Attachment picker | Slightly annoyed | "Finding that text..." |
| 6 | Submits reply | Submit | Relief | "Ball's in his court" |
| 7 | Decides to resolve: Taps "Resolve" | Resolve action | Confident | None |
| 8 | Chooses resolution: "Keep as shared, adjust amount to $125" | Resolution options | Fair-minded | "I'll meet him halfway on the camp tier" |
| 9 | Status changes to "Pending Satisfaction" | Status badge | Waiting | "Will he accept?" |
| 10 | Marcus accepts (satisfies) | Notification | **Relief** | None |
| 11 | Status changes to "Resolved" | Status badge | Closure | None |

**Key Design Implications:**
- Reply/resolve flow must feel like conversation, not litigation
- Evidence uploads should be easy and support multiple file types
- Resolution options should include adjustment, not just approve/reject
- Satisfaction step gives the other parent agency

---

## 4. Information Architecture

### Navigation Structure

```
[Bottom Tab Navigation - 5 items]
├── Expenses (default/home)
│   ├── Expense List (filterable by status, child, date range)
│   └── → Expense Detail (tap any row)
│       ├── Info section (amount, category, child, date, receipt)
│       ├── Question Thread (if questioned)
│       ├── Timeline (status history)
│       └── Actions (Question, Resolve, Satisfy — contextual)
│
├── Add (+) — opens as modal/overlay
│   └── Add Expense Form
│       ├── Amount (required)
│       ├── Category (required)
│       ├── Child(ren) (required)
│       ├── Date (defaults to today)
│       ├── Description (optional but encouraged)
│       └── Receipt (optional upload)
│
├── Payments
│   ├── Balance Summary (who owes whom)
│   ├── Payment History
│   └── Record Payment action
│
├── Activity
│   └── Chronological feed of all actions
│       ├── Expense created
│       ├── Expense questioned
│       ├── Reply posted
│       ├── Resolution proposed
│       ├── Expense satisfied
│       └── Payment recorded
│
└── Settings
    ├── Profile
    ├── Family
    │   ├── Children (add/edit/remove)
    │   ├── Split Ratio
    │   └── Partner (view, resend invite, remove)
    ├── Recurring Expenses
    │   ├── List of templates
    │   └── Add/Edit Recurring Expense
    ├── Notifications
    ├── Export (Pro)
    └── Subscription
```

### Screen Hierarchy

| Level | Screen | Access Point |
|-------|--------|--------------|
| L1 | Expenses List | Bottom nav (default) |
| L1 | Payments | Bottom nav |
| L1 | Activity | Bottom nav |
| L1 | Settings | Bottom nav |
| L2 | Expense Detail | Tap expense row |
| L2 | Add Expense | FAB or "+" in nav |
| L2 | Record Payment | Button on Payments screen |
| L3 | Question Thread | Within expense detail |
| L3 | Resolution Flow | Within expense detail |
| L3 | Child Management | Within Settings |
| L3 | Recurring Expenses | Within Settings |

### Information Density by Screen

| Screen | Primary Info | Secondary Info | Actions |
|--------|--------------|----------------|---------|
| Expenses List | Amount, description, status, date | Category icon, child tag | Filter, sort, tap to detail |
| Expense Detail | Full expense info, thread, timeline | Metadata (created by, edited) | Question, Resolve, Satisfy, Edit, Delete |
| Payments | Net balance, recent payments | Period breakdown | Record payment |
| Activity | Event description, timestamp | Actor name | Tap to related expense |
| Settings | Preference labels | Current values | Edit each section |

---

## 5. Interaction Patterns

### Pattern 1: Status Badges

Status badges are the primary visual indicator of expense state. They must be:
- Instantly recognizable (color + label)
- Consistent across all contexts (list, detail, notifications)
- Accessible (not relying solely on color)

| Status | Badge Color | Label | CSS Variable |
|--------|-------------|-------|--------------|
| Posted | Emerald-500 | Posted | `--status-posted` |
| Questioned | Amber-500 | Questioned | `--status-questioned` |
| Pending Satisfaction | Indigo-500 | Pending | `--status-pending` |
| Resolved | Indigo-500 | Resolved | `--status-resolved` |
| Resolved (Creator Decided) | Indigo-500 | Resolved | `--status-resolved-creator` |
| Resolved (Personal) | Slate-400 | Personal | `--status-personal` |
| Resolved (Deleted) | Slate-400 | Deleted | `--status-deleted` |
| Closed (Unresolved) | Red-500 | Unresolved | `--status-closed-unresolved` |

**Badge Anatomy:**
- Pill shape with rounded corners (`border-radius: 9999px`)
- Background: color at 10% opacity
- Text: color at 100%
- Padding: `4px 10px`
- Font: 12px medium weight

**Behavior:**
- Tappable in list view to filter by that status
- Static (non-interactive) in detail view header

---

### Pattern 2: Balance Display

The balance display is emotionally charged. It must feel neutral and factual.

**Design Principles:**
- Never use accusatory language ("You owe")
- Use passive voice ("Net balance")
- Show direction with subtle visual cues, not color
- Clearly separate questioned amounts

**Layout:**
```
┌─────────────────────────────────┐
│ Net Balance                     │
│ ┌─────────────────────────────┐ │
│ │ $247.50                     │ │
│ │ → Marcus owes Sarah         │ │
│ └─────────────────────────────┘ │
│                                 │
│ Questioned expenses: $150.00    │
│ (excluded from balance)         │
│                                 │
│ ───────────────────────────     │
│                                 │
│ Current period (Feb 2026)       │
│   Sarah paid: $420.00           │
│   Marcus paid: $172.50          │
│                                 │
│ Prior balance: +$50.00 (Sarah)  │
└─────────────────────────────────┘
```

**Interaction:**
- Tap balance card to expand/collapse period details
- Tap "Questioned" row to filter expense list by questioned status

---

### Pattern 3: Question Thread

The question thread is a conversation UI within the expense detail. It should feel like messaging, not litigation.

**Design Principles:**
- Chronological order (oldest first, newest at bottom)
- Clear attribution (who said what)
- Timestamps for context
- Attachments displayed inline
- Reply composer anchored at bottom

**Thread Entry Anatomy:**
```
┌─────────────────────────────────┐
│ [Avatar] Marcus · 2 days ago    │
│ Was this discussed? I thought   │
│ we agreed on the YMCA camp.     │
└─────────────────────────────────┘
│ [Avatar] Sarah · 1 day ago      │
│ YMCA was full. I texted you on  │
│ Jan 15. Here's the receipt.     │
│ [Receipt thumbnail]             │
└─────────────────────────────────┘
```

**Composer:**
- Multiline text input
- Attach button for images/files
- Send button (disabled until content entered)
- Placeholder: "Add context or ask a clarifying question..."

---

### Pattern 4: Empty States

Empty states are educational moments. They should guide, not just inform.

| Screen | Empty State Message | CTA |
|--------|---------------------|-----|
| Expenses List (new user) | "No expenses yet. When you or your co-parent log an expense, it'll appear here." | "Add your first expense" |
| Expenses List (filtered, no results) | "No expenses match your filters." | "Clear filters" |
| Question Thread | "No questions yet. Both parents can ask clarifying questions about any expense." | None (informational) |
| Payments | "No payments recorded. When either parent records a payment, it'll appear here." | "Record a payment" |
| Activity | "Nothing to show yet. This feed will show all expense and payment activity." | None |
| Recurring Expenses | "No recurring expenses set up. Add templates for expenses that happen regularly." | "Add recurring expense" |

**Empty State Design:**
- Centered in available space
- Illustration (optional, monochrome, non-character)
- Headline: 16px semibold
- Body: 14px regular, muted color
- CTA: Primary button or text link

---

### Pattern 5: Confirmation Dialogs

Destructive or significant actions require confirmation. Dialogs should be clear about consequences.

**Delete Expense:**
```
┌────────────────────────────────────┐
│ Delete this expense?               │
│                                    │
│ This will remove the expense from  │
│ both parents' records. This cannot │
│ be undone.                         │
│                                    │
│ The expense will be marked as      │
│ "Deleted" in the activity log.     │
│                                    │
│        [Cancel]  [Delete]          │
└────────────────────────────────────┘
```

**Resolve as Personal:**
```
┌────────────────────────────────────┐
│ Mark as personal expense?          │
│                                    │
│ This removes the expense from      │
│ shared balances. It will still     │
│ appear in your records.            │
│                                    │
│        [Cancel]  [Confirm]         │
└────────────────────────────────────┘
```

**Design:**
- Modal overlay with backdrop
- Clear, non-technical language
- Consequences stated explicitly
- Primary action on right
- Destructive actions use red button

---

### Pattern 6: Form Patterns

Forms should minimize friction while capturing necessary data.

**Add Expense Form:**

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| Amount | Currency input | Yes | > $0, max 2 decimals | Auto-formats with $ prefix |
| Category | Segmented control or select | Yes | One of 5 values | Icons + labels |
| Child(ren) | Multi-select chips | Yes | At least one | Show all children in family |
| Date | Date picker | Yes | Not future, not >3 months ago | Defaults to today |
| Description | Text area | Encouraged | Max 280 chars | Placeholder: "What's this for?" |
| Receipt | Image upload | No | Image file types only | Show thumbnail after upload |

**Form UX:**
- Submit button disabled until required fields valid
- Inline validation on blur (not on every keystroke)
- Keyboard-aware (numeric keyboard for amount, date picker for date)
- Sticky submit button on mobile (above keyboard)

---

## 6. Platform & Accessibility

### Responsive Breakpoints

| Breakpoint | Width | Layout Behavior |
|------------|-------|-----------------|
| Mobile (default) | < 640px | Single column, bottom nav, stacked cards |
| Tablet | 640px - 1024px | Wider content area, same nav pattern |
| Desktop | > 1024px | Centered content (max 640px), optional side nav |

**Mobile-First Principle:** Design for mobile, then adapt up. The core experience is on a phone at pickup/dropoff or while logging receipts.

---

### Touch Targets

All interactive elements must meet minimum touch target sizes:

| Element | Minimum Size | Notes |
|---------|--------------|-------|
| Buttons | 44px x 44px | Per Apple HIG |
| List rows | 48px height minimum | Per Material guidelines |
| Icons (standalone) | 44px touch area | Visual can be smaller, tap area padded |
| Form inputs | 48px height | Includes padding |
| Bottom nav items | 48px x 48px minimum | Full-width bar |

---

### Color Contrast Requirements

All text must meet WCAG 2.1 AA contrast requirements:

| Element | Contrast Requirement | Minimum Ratio |
|---------|---------------------|---------------|
| Body text | Normal text | 4.5:1 |
| Large text (18px+ or 14px+ bold) | Large text | 3:1 |
| Status badge text | On badge background | 4.5:1 |
| Icons (informational) | Against background | 3:1 |
| Focus indicators | Against background | 3:1 |

**Status Badge Contrast Verification:**

| Status | Background | Text | Ratio | Pass? |
|--------|------------|------|-------|-------|
| Posted | Emerald-50 | Emerald-700 | 5.2:1 | Yes |
| Questioned | Amber-50 | Amber-700 | 4.8:1 | Yes |
| Pending | Indigo-50 | Indigo-700 | 5.1:1 | Yes |
| Closed | Red-50 | Red-700 | 5.5:1 | Yes |
| Personal/Deleted | Slate-100 | Slate-600 | 4.6:1 | Yes |

---

### Screen Reader Considerations

**Semantic HTML:**
- Use proper heading hierarchy (h1 for page title, h2 for sections)
- Lists use `<ul>` / `<ol>` with `<li>`
- Buttons are `<button>`, not styled `<div>`
- Form inputs have associated `<label>` elements

**ARIA Patterns:**
- Status badges: `role="status"` with `aria-live="polite"` for dynamic updates
- Expense list: `role="list"` with `role="listitem"` for rows
- Question thread: `role="log"` with `aria-live="polite"` for new messages
- Modals: `role="dialog"` with `aria-modal="true"` and focus trap
- Loading states: `aria-busy="true"` on container

**Focus Management:**
- Logical tab order following visual order
- Focus moves to modal content when opened
- Focus returns to trigger when modal closed
- Skip link to main content on each page

**Announcements:**
- "Expense added successfully" after form submission
- "Question sent" after questioning
- Status changes announced when they occur

---

### Reduced Motion Support

Respect user's motion preferences via `prefers-reduced-motion` media query.

**When reduced motion is enabled:**
- Disable transitions and animations
- Instant state changes instead of animated transitions
- Loading spinners become static progress indicators
- No auto-scrolling; user controls all scrolling

**CSS Implementation:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

### Offline Considerations

While not a native app, basic offline resilience improves mobile experience:

- **Expense form:** Cache form state in localStorage; warn if offline on submit
- **Expense list:** Show cached list with "Last updated: X minutes ago" when offline
- **Actions:** Queue actions for retry when connection returns (future enhancement)

---

### Error State Patterns

| Error Type | Display Pattern | Recovery Action |
|------------|-----------------|-----------------|
| Network error | Inline banner below nav | "Retry" button |
| Validation error | Inline below field, red text | Fix and resubmit |
| 404 (expense not found) | Full-screen empty state | "Back to expenses" link |
| 403 (not authorized) | Full-screen message | "Return to your family" or login |
| 500 (server error) | Toast notification | Auto-retry or "Report issue" |

---

## Appendix: Microcopy Guidelines

**Tone Principles:**
- Neutral, not cold
- Informative, not instructive
- Empowering, not controlling
- Brief, not terse

**Terminology Enforcement:**

| Use | Don't Use |
|-----|-----------|
| Question | Dispute, Challenge, Reject |
| Other parent, Co-parent | Ex, Opponent, Other side |
| Net balance | Amount owed, Debt |
| Record payment | Settle, Pay back |
| Closed (unresolved) | Failed, Rejected, Denied |
| Satisfy | Accept, Approve, Agree |

**Button Labels:**
- "Add expense" (not "Create" or "New")
- "Question this expense" (not "Dispute" or "Challenge")
- "Record payment" (not "Log payment" or "Add payment")
- "Resolve" (not "Close" or "Finish")

**Notification Copy Examples:**
- "[Sarah] added a new expense: $45.00 - School"
- "[Marcus] questioned an expense you created"
- "[Sarah] resolved your question — please review"
- "An expense is waiting for your response (3 days remaining)"
