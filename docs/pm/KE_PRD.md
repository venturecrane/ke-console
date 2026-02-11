# Kid Expenses - Product Requirements Document

**Version:** 2.0
**Date:** February 6, 2026
**Status:** APPROVED
**Venture:** kidexpenses (SMDurgan LLC)

---

## 1. Executive Summary

Kid Expenses (KE) is a co-parent expense tracking application designed to reduce financial conflict between divorced or separated parents who share child-related costs. The product provides a neutral, auditable shared ledger where both parents can log expenses, see a running balance, and resolve disagreements through a structured workflow. Unlike spreadsheets or payment apps like Venmo, KE offers a purpose-built solution with an 8-status questioning workflow, configurable split ratios, and a complete audit trail of every financial decision.

The core product thesis is that financial friction between co-parents stems from lack of transparency and unclear processes for disagreement resolution. By providing a neutral platform with clear rules - where questioned items are automatically excluded from the balance until resolved, and where every action is logged - KE removes ambiguity and reduces the emotional labor of coordinating shared expenses. The product is mobile-web-first (responsive, not native) to maximize accessibility without app store friction.

KE is approximately 60-70% through Phase 1 MVP development. The technical stack (Next.js 16, Cloudflare Workers with Hono, D1, Clerk, Stripe) is proven and the core expense/payment flows are functional. Remaining MVP work includes completing the questioning workflow UI, payment recording polish, and Stripe integration for the Pro tier. The product targets launch with a Free tier ($0, limited features) and Pro tier ($5/month, unlimited features) to establish product-market fit before expanding functionality.

---

## 2. Product Vision & Identity

### Mission Statement

To eliminate money as a source of weekly conflict between co-parents by providing transparent, auditable expense tracking that both parties trust.

### Positioning Statement

> "A neutral ledger for kid costs - so money doesn't become a weekly argument."

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

## 3. Target Users & Personas

### Persona 1: Sarah - The Organized Primary Custodian

**Demographics**

- Age: 38
- Occupation: Marketing Manager at a mid-size company
- Location: Suburban Denver, CO
- Custody: Primary (70/30 split)
- Children: Two kids, ages 8 and 12
- Tech Comfort: High - uses apps for budgeting, calendar management, and family coordination

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

1. _When I pay for something for the kids,_ I want to log it in under 30 seconds _so that_ it's recorded before I forget.
2. _When there's a disagreement about an expense,_ I want documented proof of what I paid _so that_ conversations stay factual, not emotional.
3. _When we settle up,_ I want a clear net balance _so that_ one payment covers everything instead of nickel-and-diming.

---

### Persona 2: Marcus - The Every-Other-Weekend Dad

**Demographics**

- Age: 42
- Occupation: Software Engineer (remote)
- Location: Austin, TX
- Custody: Non-primary (30/70 split, every other weekend + Wednesdays)
- Children: One daughter, age 10
- Tech Comfort: Very high - but skeptical of apps that add complexity

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

1. _When I receive an expense notification,_ I want to see full details (what, when, why, receipt) _so that_ I can approve it confidently.
2. _When something doesn't look right,_ I want to ask a clarifying question _so that_ I'm not just a rubber stamp.
3. _When I review monthly expenses,_ I want to see patterns and totals _so that_ I can plan my own budget.

---

### Persona 3: Jamie - The Recently Separated Parent

**Demographics**

- Age: 34
- Occupation: Elementary School Teacher
- Location: Portland, OR
- Custody: Still being finalized (targeting 50/50)
- Children: Twin boys, age 6
- Tech Comfort: Moderate - uses phone for basics, not a power user

**Emotional State**

Jamie's separation is fresh (6 months). Emotions are still raw. Every interaction with their ex has subtext. Money is particularly fraught because they're both adjusting to single-income households. Jamie wants things to be fair but doesn't want to fight. They're looking for any tool that can reduce friction.

**Goals**

- Establish a neutral, low-conflict system before patterns set in
- Build a shared expense record from day one
- Avoid relying on memory or informal agreements
- Feel empowered to question unfair expenses without starting a war

**Frustrations**

- No established system yet - everything is ad hoc
- Trust is fragile; transparency feels risky but also necessary
- They're not sure what expenses should be shared vs. personal
- They worry about "keeping score" but also about being taken advantage of

**Quote**

> "I don't want this to become another thing we fight about. I need something that just... works, without drama."

**Jobs to Be Done**

1. _When we start co-parenting,_ I want to set up a shared expense system _so that_ we have neutral ground rules.
2. _When I'm unsure if an expense should be shared,_ I want clear categories and precedents _so that_ I can make fair decisions.
3. _When the system sends notifications to my ex,_ I want the tone to be neutral _so that_ the app doesn't add fuel to fire.

---

## 4. Core Problem

### The Emotional Dimension

Co-parents don't just need expense tracking - they need _emotional cover_. When you ask your ex to pay their share, it feels like asking for a favor. When you question an expense, it feels like an accusation. When you follow up on late payments, it feels like nagging.

**The core emotional problem:** Financial coordination between co-parents carries psychological weight far beyond the dollar amounts involved. A $15 expense dispute can trigger responses rooted in years of relationship history, feelings of being controlled or not trusted, or anxiety about being seen as petty.

Existing tools fail because they weren't designed for this emotional context:

| Tool                     | Why It Fails                                                                     |
| ------------------------ | -------------------------------------------------------------------------------- |
| **Spreadsheets**         | Too much maintenance; disputes happen in separate channels; no notifications     |
| **Venmo/PayPal**         | Transactional, not relational; no questioning mechanism; requests feel demanding |
| **Text/Email**           | Records are messy; context is lost; threads become combative                     |
| **Generic expense apps** | Not designed for split ownership; no question/resolution workflow                |

### The Practical Dimension

Beyond emotion, there are concrete friction points:

- **Proof burden:** Who paid for what? Where's the receipt?
- **Net calculation:** When both parents pay for things, what's the actual balance?
- **Timing:** Expenses from 3 months ago are harder to discuss than yesterday's
- **Visibility:** The non-logging parent often has no insight into spending patterns
- **Settlements:** Multiple Venmo requests create cognitive overhead; net balances are cleaner

### What Success Looks Like

Success is not just "expenses get tracked." Success is:

1. **Reduced anxiety** - Neither parent dreads opening the app or sending a notification
2. **Faster resolution** - Questioned expenses get closed in days, not left to fester
3. **Fair perception** - Both parents feel the system is neutral, not favoring the other
4. **Less mental load** - The "bookkeeper" parent spends less time coordinating
5. **Fewer outside conflicts** - Money stops spilling over into pickup conversations

The emotional test for every feature: _Does this make the next in-person interaction easier or harder?_

---

## 5. Product Principles

The following principles guide all product decisions for Kid Expenses. When principles conflict, earlier principles take precedence.

### Principle 1: Neutrality Above All

KE must never appear to favor one parent over the other. The UI, copy, notifications, and workflows must treat both parents as equals. We use "other parent" not "ex" or "opponent." We show the same information to both parties. The balance display is factual, not accusatory ("Net balance: Parent A owes $50" not "You haven't paid your share").

### Principle 2: Transparency Reduces Conflict

Every action in KE is visible to both parents. There are no private notes, hidden edits, or silent deletions. The audit trail exists not for legal purposes (though it may serve that need) but because visibility creates accountability and accountability reduces disagreements.

### Principle 3: Process Over Persuasion

When parents disagree about an expense, KE does not try to resolve the disagreement - it provides a structured process for the disagreement to reach resolution. The questioning workflow (questioned, pending_satisfaction, resolved, etc.) ensures both parties have defined actions and timeouts, reducing endless back-and-forth.

### Principle 4: Exclude the Uncertain

Expenses under active questioning are excluded from the balance until resolution. This prevents the common frustration of "you're counting money I never agreed to." Only posted, resolved, and resolved_creator_decided expenses affect the net balance.

### Principle 5: Simple Defaults, Configurable Details

The default experience is a 50/50 split with no complexity. Parents who need different split ratios can configure them, but the product does not assume complexity. Every configuration option adds cognitive load; we add them only when the benefit clearly exceeds the cost.

### Principle 6: Mobile-First, Web-Only

Parents check expenses on their phones while picking up kids, not at desks. Every screen must work on a 375px viewport. We do not build native apps - the web provides sufficient capability without app store friction, update delays, or platform-specific maintenance.

### Principle 7: Monetize Through Value, Not Lock-In

The Free tier must be genuinely useful, not a crippled demo. Pro features add convenience and depth (unlimited history, unlimited recurring expenses, CSV export) but do not create artificial pain points. Users upgrade because Pro is better, not because Free is broken.

---

## 6. Competitive Positioning

### Market Overview

The co-parenting app market is experiencing significant growth, valued at **$440 million in 2024** and projected to reach **$1.12 billion by 2032**, representing a **12.4% CAGR**. The fastest-growing segment is dual-household co-parenting users, with an estimated growth rate of 15% per annum, driven by rising demand for shared-custody coordination and expense management.

**Market Context:**

- **13 million custodial parents** in the United States (approximately 4% of total population)
- **22 million children** under 21 have a parent living outside their household
- **$110+ billion** in unpaid child support in the US, indicating significant pain around financial coordination
- Average custodial parent receives **$3,431/year** in child support, but only two-thirds receive full amounts owed

### Key Competitors

| Competitor          | Focus         | Pricing (per parent) | Key Strength                       | Key Weakness                            |
| ------------------- | ------------- | -------------------- | ---------------------------------- | --------------------------------------- |
| **OurFamilyWizard** | Full-suite    | $12.50-25/mo         | Court recognition in all 50 states | Expensive, rigid split options, UX debt |
| **TalkingParents**  | Communication | $6-25/mo             | Strong documentation, lower price  | Expense tracking less robust            |
| **DComply**         | Payments      | $2.99-5.99/mo        | Focused, lowest price              | No calendar or messaging                |
| **AppClose**        | Full-suite    | $8.99/mo             | Simple pricing, court-certified    | Newer, less recognition                 |
| **2Houses**         | Balanced      | $7/mo                | Single subscription covers both    | Less US market presence                 |
| **Cent**            | Free          | $0                   | Free, professional endorsements    | Sustainability questions                |

### Feature Comparison Matrix

| Feature                             | KE                | OurFamily Wizard        | DComply        | 2Houses      |
| ----------------------------------- | ----------------- | ----------------------- | -------------- | ------------ |
| **Shared Expense Ledger**           | Yes               | Yes                     | Yes            | Yes          |
| **Expense Questioning Workflow**    | 8 statuses        | Binary (approve/refuse) | Basic          | Basic        |
| **Configurable Split Ratio**        | 0-100%            | 50/50, 80/20, 100%      | Yes            | Yes          |
| **Rolling Balance**                 | Yes, real-time    | Yes                     | Yes            | Yes          |
| **Balance-Excluded Questioning**    | Yes               | No                      | Unknown        | Unknown      |
| **Full Audit Trail (before/after)** | Yes               | Partial                 | Unknown        | Unknown      |
| **Shared Calendar**                 | No                | Yes                     | No             | Yes          |
| **Messaging**                       | No                | Yes                     | No             | Yes          |
| **In-App Payments**                 | No (external)     | Yes (OFWpay)            | Yes            | No           |
| **Mobile Web**                      | Yes               | Native apps             | Native apps    | Native + web |
| **Free Tier**                       | Yes (3mo history) | No                      | 7 transactions | 14-day trial |
| **Per-Parent Pricing**              | $5/mo             | $12.50-25/mo            | $3-6/mo        | $7/mo        |

### Pricing Benchmarks

**KE at $5/mo is competitively positioned:**

1. **Below OFW** ($12.50-25) - The market leader charges 2.5-5x more
2. **At DComply Premium** ($5.99) - Closest expense-focused competitor
3. **Below AppClose** ($8.99) - The rising "all-in-one" threat
4. **Below 2Houses** ($7) - International competitor with similar features
5. **Competes with Cent** - Must win on features since Cent is free

### KE's Genuine Differentiators

| Differentiator                         | Why It Matters                                                                                                                               | Competitor Gap                                        |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **8-Status Questioning Workflow**      | Real disputes have nuance beyond "approved/refused." Questioning, escalation, timeout, and resolution states model real-world back-and-forth | OFW only has binary approve/refuse; others even less  |
| **Balance-Excluded Questioning**       | Questioned items don't count toward who owes whom until resolved. Prevents one parent gaming the balance                                     | No competitor explicitly offers this                  |
| **Rolling Balance with Carry Forward** | Monthly resets lose context; rolling balance shows true picture                                                                              | Some have balance, but carry-forward behavior unclear |
| **Full Audit Trail (Before/After)**    | Every change logged with what was changed, by whom. True accountability                                                                      | Expense audit trails less comprehensive               |
| **Mobile-Web-First**                   | No app store friction. Works on any device immediately                                                                                       | Most competitors require native app downloads         |
| **Simple, Focused UX**                 | Expenses only, not a full co-parenting suite                                                                                                 | Competitors bundle everything, creating complexity    |

### Positioning Statement

**For:** Divorced and separated parents who share child expenses
**Who:** Need clear, accountable records without the complexity and cost of full co-parenting suites
**KE is:** A focused expense tracking app with sophisticated questioning resolution
**That:** Eliminates financial arguments through transparent ledger, smart questioning workflow, and true accountability
**Unlike:** OurFamilyWizard and other full-suite apps that bundle expensive features you don't need, or simple trackers that don't handle real-world disputes
**KE:** Does expenses right - with the nuanced 8-status workflow, balance-protected questioning, and complete audit trail that high-conflict situations actually require

---

## 7. User Journeys

### Journey A: First-Time Setup (Sarah's perspective)

| Step | Action                                                 | Touchpoint               | Emotional State             | Pain Points                                       |
| ---- | ------------------------------------------------------ | ------------------------ | --------------------------- | ------------------------------------------------- |
| 1    | Discovers KE via Google search "co-parent expense app" | Landing page             | Hopeful but skeptical       | "Is this another app I'll abandon?"               |
| 2    | Signs up with email                                    | Sign-up form             | Neutral                     | "Hope this is quick"                              |
| 3    | Prompted to create a Family                            | Create Family screen     | Engaged                     | "What do I call this?"                            |
| 4    | Adds children's names                                  | Add Children form        | Invested                    | None - straightforward                            |
| 5    | Sets default split ratio (50/50)                       | Split settings           | Thoughtful                  | "Can I change this later?"                        |
| 6    | Enters ex's email to invite                            | Invite Partner screen    | **Anxiety spike**           | "Will they actually accept? How will they react?" |
| 7    | Invitation sent                                        | Confirmation             | Relief + anticipation       | "Now I wait..."                                   |
| 8    | Ex accepts (or doesn't)                                | Notification / dashboard | Varies: relief or deflation | If declined: "Now what?"                          |
| 9    | Logs first expense                                     | Add Expense form         | Accomplishment              | "Did I do this right?"                            |

**Key Design Implications:**

- Invitation moment is high-anxiety - copy must be warm, not demanding
- Preview of what co-parent will see when invited
- Fallback path if co-parent declines or ignores

---

### Journey B: Weekly Expense Logging (Sarah's perspective)

| Step | Action                                                  | Touchpoint       | Emotional State | Pain Points                     |
| ---- | ------------------------------------------------------- | ---------------- | --------------- | ------------------------------- |
| 1    | Gets email receipt from pharmacy for kid's prescription | Email/real world | Neutral         | None                            |
| 2    | Opens KE app (bookmarked on home screen)                | App launch       | Habitual        | "Hope this is fast"             |
| 3    | Taps "Add Expense"                                      | FAB or nav       | Focused         | None                            |
| 4    | Enters amount, selects category (Medical)               | Form             | Efficient       | "Do I need to itemize?"         |
| 5    | Tags child (Ella)                                       | Child selector   | Quick           | None                            |
| 6    | Adds quick description                                  | Text input       | Thoughtful      | "How much detail is enough?"    |
| 7    | Optionally uploads receipt photo                        | Photo upload     | Slight friction | "My gallery is a mess"          |
| 8    | Taps Submit                                             | Submit button    | Satisfied       | None                            |
| 9    | Sees expense in list, status = "Posted"                 | Expense list     | Accomplishment  | None                            |
| 10   | Co-parent gets notification                             | (Their device)   | N/A             | "Hope they don't question this" |

**Key Design Implications:**

- Entry flow must be completable in <30 seconds
- Receipt upload is optional but encouraged for high-value items
- Confirmation reinforces the value of logging

---

### Journey C: Questioning an Expense (Marcus's perspective)

| Step | Action                                                                       | Touchpoint            | Emotional State       | Pain Points                          |
| ---- | ---------------------------------------------------------------------------- | --------------------- | --------------------- | ------------------------------------ |
| 1    | Receives push notification: "New expense: $150 - Activities"                 | Notification          | Curious               | "What's this for?"                   |
| 2    | Opens app, views expense detail                                              | Expense detail screen | Evaluating            | "I need more context"                |
| 3    | Sees description: "Soccer camp deposit"                                      | Detail view           | Uncertain             | "I wasn't consulted about this"      |
| 4    | Taps "Question" button                                                       | Expense detail        | **Hesitation**        | "I don't want to start a fight"      |
| 5    | Writes question: "Was this discussed? I thought we agreed on the YMCA camp?" | Question composer     | Careful               | "How do I word this diplomatically?" |
| 6    | Submits question                                                             | Submit                | Relief + apprehension | "How will she react?"                |
| 7    | Status changes to "Questioned"                                               | Status badge          | Neutral               | None                                 |
| 8    | Waits for response                                                           | Notification          | Anticipation          | "Silence is uncomfortable"           |

**Key Design Implications:**

- "Question" framing is deliberately non-adversarial
- Placeholder text in composer should model constructive questioning
- Status change is visible and immediate

---

### Journey D: Resolving a Question (Sarah's perspective, responding to Marcus)

| Step | Action                                                                                                 | Touchpoint         | Emotional State        | Pain Points                                 |
| ---- | ------------------------------------------------------------------------------------------------------ | ------------------ | ---------------------- | ------------------------------------------- |
| 1    | Receives notification: "Marcus questioned an expense"                                                  | Notification       | **Defensive instinct** | "What now?"                                 |
| 2    | Opens expense detail, reads question                                                                   | Question thread    | Processing             | "He has a point, but he's wrong about YMCA" |
| 3    | Taps "Reply"                                                                                           | Thread             | Deliberate             | "Stay calm, stick to facts"                 |
| 4    | Writes: "YMCA was full. I texted you about it 3 weeks ago. Attaching receipt and the text screenshot." | Composer           | Firm but factual       | "I have to prove myself again"              |
| 5    | Uploads evidence                                                                                       | Attachment picker  | Slightly annoyed       | "Finding that text..."                      |
| 6    | Submits reply                                                                                          | Submit             | Relief                 | "Ball's in his court"                       |
| 7    | Decides to resolve: Taps "Resolve"                                                                     | Resolve action     | Confident              | None                                        |
| 8    | Chooses resolution: "Keep as shared, adjust amount to $125"                                            | Resolution options | Fair-minded            | "I'll meet him halfway on the camp tier"    |
| 9    | Status changes to "Pending Satisfaction"                                                               | Status badge       | Waiting                | "Will he accept?"                           |
| 10   | Marcus accepts (satisfies)                                                                             | Notification       | **Relief**             | None                                        |
| 11   | Status changes to "Resolved"                                                                           | Status badge       | Closure                | None                                        |

**Key Design Implications:**

- Reply/resolve flow must feel like conversation, not litigation
- Evidence uploads should be easy and support multiple file types
- Resolution options should include adjustment, not just approve/reject
- Satisfaction step gives the other parent agency

---

## 8. Feature Specifications

### 8.1 Onboarding & Family Setup

#### US-001: Initial Account Creation

**As a** new user
**I want to** create an account with email or Google OAuth
**So that** I can start tracking shared expenses with my co-parent

**Acceptance Criteria:**

- **Given** I am on the signup page
  **When** I provide a valid email and password or choose Google OAuth
  **Then** my account is created and I am redirected to family setup
- **Given** I provide an invalid email format
  **When** I attempt to sign up
  **Then** I see a validation error message
- **Given** I provide a password less than 8 characters
  **When** I attempt to sign up
  **Then** I see a password strength error

**Priority:** P0

---

#### US-002: Family Creation

**As a** new user without a family
**I want to** create a family by entering my co-parent's email
**So that** we can share a ledger

**Acceptance Criteria:**

- **Given** I have completed account creation
  **When** I enter my co-parent's email address
  **Then** a family is created with me as parent_a and a pending invite is sent
- **Given** I enter my own email address
  **When** I attempt to create a family
  **Then** I see an error "Cannot add yourself as co-parent"
- **Given** I enter an invalid email format
  **When** I attempt to create a family
  **Then** I see a validation error
- **Given** a family is successfully created
  **When** I view the family page
  **Then** I see my co-parent's email with status "Pending Invite"

**Priority:** P0

---

#### US-003: Family Invitation Acceptance

**As a** co-parent who received an invitation
**I want to** accept the invitation to join a shared family
**So that** I can see and manage shared expenses

**Acceptance Criteria:**

- **Given** I receive a family invitation email
  **When** I click the invitation link
  **Then** I am directed to sign up or log in
- **Given** I complete authentication via the invitation link
  **When** I accept the invitation
  **Then** I join the family as parent_b and can immediately view the ledger
- **Given** I am already in another family
  **When** I attempt to accept an invitation
  **Then** I see an error "You are already part of a family"
- **Given** the invitation has expired (>7 days old)
  **When** I attempt to accept
  **Then** I see an error "This invitation has expired"

**Priority:** P0

---

#### US-004: Configure Split Ratio

**As a** co-parent
**I want to** set the expense split ratio for our family
**So that** expenses are automatically divided according to our agreement

**Acceptance Criteria:**

- **Given** I am on the family settings page
  **When** I adjust the parent_a_ratio slider
  **Then** I see real-time updates showing both parents' percentages (sum = 100%)
- **Given** I set parent_a_ratio to 60%
  **When** I save the setting
  **Then** all future expenses are split 60/40 and I see a confirmation message
- **Given** I attempt to set a ratio outside 0-100%
  **When** I try to save
  **Then** the system prevents the invalid value
- **Given** I change the split ratio
  **When** existing expenses exist
  **Then** existing expenses retain their original split (no retroactive changes)

**Priority:** P0

---

### 8.2 Expense Management

#### US-005: Create One-Time Expense

**As a** co-parent (Sarah, Marcus, Jamie)
**I want to** record a child-related expense
**So that** it appears in our shared ledger and affects the balance

**Acceptance Criteria:**

- **Given** I am on the expense creation form
  **When** I enter description (1-200 chars), amount (positive dollars), category, and paid_by
  **Then** the expense is created in "posted" status and affects the balance immediately
- **Given** I enter an amount in dollars (e.g., "45.67")
  **When** I save the expense
  **Then** it is stored as 4567 cents (integer)
- **Given** I leave expense_date blank
  **When** I save
  **Then** it defaults to today's date
- **Given** I leave paid_by blank
  **When** I save
  **Then** it defaults to me (current user)
- **Given** I enter a description over 200 characters
  **When** I attempt to save
  **Then** I see a validation error
- **Given** I enter a zero or negative amount
  **When** I attempt to save
  **Then** I see an error "Amount must be positive"
- **Given** I do not select a category
  **When** I attempt to save
  **Then** I see an error "Category is required"

**Priority:** P0

---

#### US-006: Add Optional Expense Details

**As a** co-parent creating an expense
**I want to** add optional details like memo, children, and receipt link
**So that** the expense has complete context

**Acceptance Criteria:**

- **Given** I am creating an expense
  **When** I add a memo (max 500 characters)
  **Then** it is saved and displayed with the expense
- **Given** I enter a memo over 500 characters
  **When** I attempt to save
  **Then** I see a validation error
- **Given** I select one or more children
  **When** I save the expense
  **Then** the child associations are stored and displayed
- **Given** I provide a receipt link URL
  **When** I save the expense
  **Then** the URL is stored and displayed as a clickable link
- **Given** I provide an invalid URL format
  **When** I attempt to save
  **Then** I see a validation error

**Priority:** P1

---

#### US-007: Edit Own Posted Expense

**As a** co-parent who created an expense (Sarah)
**I want to** edit the expense details
**So that** I can correct mistakes before my co-parent questions it

**Acceptance Criteria:**

- **Given** I created an expense in "posted" status
  **When** I click edit
  **Then** I can modify description, amount, category, date, paid_by, memo, children, and link
- **Given** I save changes to an expense
  **When** the save completes
  **Then** an activity event is logged with before/after snapshots
- **Given** my co-parent has already questioned the expense
  **When** I attempt to edit
  **Then** I cannot edit (button disabled or redirected)
- **Given** the expense status is not "posted"
  **When** I attempt to edit
  **Then** I see an error "Cannot edit expenses that are questioned or resolved"

**Priority:** P0

---

#### US-008: Delete Own Posted Expense

**As a** co-parent who created an expense
**I want to** delete an expense I mistakenly created
**So that** it no longer affects the ledger or balance

**Acceptance Criteria:**

- **Given** I created an expense in "posted" status
  **When** I click delete and confirm
  **Then** the expense is permanently deleted and removed from balance calculation
- **Given** the expense has been questioned
  **When** I attempt to delete
  **Then** I cannot delete (must use resolution flow instead)
- **Given** I delete an expense
  **When** the deletion completes
  **Then** an activity event is logged showing the deleted expense details

**Priority:** P1

---

#### US-009: View Other Parent's Expense (Cannot Edit)

**As a** co-parent viewing an expense I did not create (Marcus)
**I want to** see all expense details but not edit them
**So that** I understand what was spent without ability to modify

**Acceptance Criteria:**

- **Given** I view an expense created by my co-parent
  **When** I open the expense detail
  **Then** I see all fields in read-only mode
- **Given** I am viewing my co-parent's posted expense
  **When** I look for action buttons
  **Then** I see "Question" but not "Edit" or "Delete"
- **Given** I try to access the edit URL directly for another parent's expense
  **When** I submit the request
  **Then** I receive a 403 Forbidden error

**Priority:** P0

---

#### US-010: Bulk View Expenses in Ledger

**As a** co-parent (Sarah, Marcus, Jamie)
**I want to** see all expenses in a chronological list
**So that** I can review our spending history

**Acceptance Criteria:**

- **Given** I am on the ledger page
  **When** the page loads
  **Then** I see expenses sorted by expense_date descending (newest first)
- **Given** expenses exist in multiple statuses
  **When** I view the ledger
  **Then** each expense shows a status badge (posted, questioned, pending_satisfaction, resolved, etc.)
- **Given** I am on Free tier with expenses older than 3 months
  **When** I view the ledger
  **Then** I only see expenses from the last 3 months
- **Given** I am on Pro tier
  **When** I view the ledger
  **Then** I see all historical expenses regardless of age

**Priority:** P0

---

#### US-011: Filter and Search Expenses

**As a** co-parent
**I want to** filter expenses by category, status, or date range
**So that** I can quickly find specific expenses

**Acceptance Criteria:**

- **Given** I am on the ledger page
  **When** I select a category filter (school, medical, activities, childcare, other)
  **Then** I see only expenses in that category
- **Given** I select a status filter
  **When** I apply the filter
  **Then** I see only expenses in that status
- **Given** I select a date range
  **When** I apply the filter
  **Then** I see only expenses within that range
- **Given** I apply multiple filters
  **When** I view results
  **Then** I see expenses matching ALL filters (AND logic)

**Priority:** P2

---

### 8.3 Questioning Workflow

#### US-012: Question Posted Expense

**As a** co-parent who did not create an expense (Marcus)
**I want to** question a posted expense
**So that** I can raise concerns about legitimacy or amount

**Acceptance Criteria:**

- **Given** I view a posted expense created by my co-parent
  **When** I click "Question" and provide a reason + optional note
  **Then** the expense status changes to "questioned" and is immediately excluded from balance
- **Given** I select a question reason
  **When** I submit the question
  **Then** the reason must be one of: wrong_amount, not_child_related, duplicate, split_dispute, other
- **Given** I select "other" as reason
  **When** I submit without a note
  **Then** I see an error "Please provide details when selecting 'other'"
- **Given** I am the expense creator
  **When** I attempt to question my own expense
  **Then** I see an error "You cannot question your own expense"
- **Given** the expense status is not "posted"
  **When** I attempt to question
  **Then** I see an error "Only posted expenses can be questioned"
- **Given** I successfully question an expense
  **When** the status changes
  **Then** an activity event is logged and my co-parent is notified

**Priority:** P0

---

#### US-013: View Questioned Expense Details

**As a** co-parent
**I want to** see why an expense was questioned
**So that** I understand the concern and can respond appropriately

**Acceptance Criteria:**

- **Given** an expense is in "questioned" status
  **When** I view the expense detail
  **Then** I see the question reason, question note, questioned_by, and questioned_at timestamp
- **Given** I am the creator of a questioned expense (Sarah)
  **When** I view it
  **Then** I see available resolution actions: keep, edit amount, mark personal, delete
- **Given** I am the questioner of an expense (Marcus)
  **When** I view it
  **Then** I see "Waiting for [creator name] to resolve" but no action buttons

**Priority:** P0

---

#### US-014: Resolve - Keep Original

**As a** expense creator responding to a question (Sarah)
**I want to** keep the expense as-is
**So that** I can assert the expense is correct and the questioner must confirm

**Acceptance Criteria:**

- **Given** my expense is questioned
  **When** I choose "Keep Original" resolution
  **Then** the status changes to "pending_satisfaction" and the expense remains excluded from balance
- **Given** I select "Keep Original"
  **When** the resolution completes
  **Then** resolution_action = "keep" and resolved_at timestamp is set
- **Given** resolution moves to pending_satisfaction
  **When** I check the balance
  **Then** the expense is still excluded (not counted)
- **Given** I resolve with "Keep Original"
  **When** the action completes
  **Then** an activity event is logged and the questioner is notified

**Priority:** P0

---

#### US-015: Resolve - Edit Amount

**As a** expense creator responding to a question (Sarah)
**I want to** edit the expense amount
**So that** I can correct the amount and the questioner must confirm

**Acceptance Criteria:**

- **Given** my expense is questioned
  **When** I choose "Edit Amount" and enter a new positive amount
  **Then** the status changes to "pending_satisfaction" with the updated amount
- **Given** I enter a new amount
  **When** I save
  **Then** resolution_action = "edit" and the amount_cents field is updated
- **Given** I enter an invalid amount (zero, negative, or non-numeric)
  **When** I attempt to save
  **Then** I see a validation error
- **Given** I resolve with "Edit Amount"
  **When** the action completes
  **Then** an activity event logs before/after amounts

**Priority:** P0

---

#### US-016: Resolve - Mark as Personal

**As a** expense creator responding to a question (Sarah)
**I want to** mark the expense as personal
**So that** it is excluded from shared expenses permanently

**Acceptance Criteria:**

- **Given** my expense is questioned
  **When** I choose "Mark as Personal"
  **Then** the status changes to "resolved_personal" immediately (no satisfaction needed)
- **Given** I mark as personal
  **When** the action completes
  **Then** resolution_action = "personal", resolved_at is set, and the expense is permanently excluded from balance
- **Given** an expense is marked personal
  **When** I view the ledger
  **Then** it shows with a "Personal" badge and is grayed out or visually distinct
- **Given** I mark as personal
  **When** the action completes
  **Then** an activity event is logged

**Priority:** P0

---

#### US-017: Resolve - Delete Expense

**As a** expense creator responding to a question (Sarah)
**I want to** delete the questioned expense
**So that** I can remove an invalid expense

**Acceptance Criteria:**

- **Given** my expense is questioned
  **When** I choose "Delete" and confirm
  **Then** the status changes to "resolved_deleted" immediately (no satisfaction needed)
- **Given** I delete via resolution
  **When** the action completes
  **Then** resolution_action = "delete", resolved_at is set, and the expense is permanently excluded from balance
- **Given** an expense is deleted via resolution
  **When** I view the ledger
  **Then** it shows with a "Deleted" badge (soft delete, still visible in history)
- **Given** I delete via resolution
  **When** the action completes
  **Then** an activity event is logged with full expense snapshot

**Priority:** P0

---

#### US-018: Satisfy Resolution (Keep or Edit)

**As a** questioner responding to a pending_satisfaction resolution (Marcus)
**I want to** confirm that the resolution is acceptable
**So that** the expense is included in the balance again

**Acceptance Criteria:**

- **Given** an expense I questioned is in "pending_satisfaction" status
  **When** I click "Accept Resolution"
  **Then** the status changes to "resolved" and the expense is included in balance calculation
- **Given** I satisfy a resolution
  **When** the action completes
  **Then** satisfied_at timestamp is set
- **Given** I am the expense creator (not questioner)
  **When** I attempt to satisfy
  **Then** I see an error "Only the questioner can confirm resolution"
- **Given** I satisfy a resolution
  **When** the action completes
  **Then** an activity event is logged and the creator is notified

**Priority:** P0

---

#### US-019: Seven-Day Auto-Resolution Timeout

**As a** expense creator waiting for satisfaction (Sarah)
**I want to** have the expense automatically resolve after 7 days if the questioner doesn't respond
**So that** the expense eventually counts toward the balance

**Acceptance Criteria:**

- **Given** an expense has been in "pending_satisfaction" for 7+ days
  **When** anyone views the expense or the system performs a check
  **Then** the status automatically changes to "resolved_creator_decided"
- **Given** status changes to resolved_creator_decided
  **When** the transition occurs
  **Then** the expense is included in balance calculation
- **Given** timeout occurs
  **When** the status changes
  **Then** an activity event is logged as "system_timeout"
- **Given** an expense has been pending for 6 days 23 hours
  **When** I view it
  **Then** it remains in "pending_satisfaction" (not yet 7 full days)

**Priority:** P0

---

#### US-020: Thirty-Day Closure for Unresolved Questions

**As a** co-parent
**I want to** have questioned expenses automatically close after 30 days if unresolved
**So that** old disputes don't remain in limbo indefinitely

**Acceptance Criteria:**

- **Given** an expense has been in "questioned" status for 30+ days
  **When** the system performs a check
  **Then** the status changes to "closed_unresolved"
- **Given** status changes to closed_unresolved
  **When** the transition occurs
  **Then** the expense remains excluded from balance permanently
- **Given** timeout occurs
  **When** the status changes
  **Then** an activity event is logged as "system_closure"
- **Given** an expense has been questioned for 29 days
  **When** I view it
  **Then** it remains in "questioned" status

**Priority:** P1

---

#### US-021: Questioning Dashboard View

**As a** co-parent (Sarah, Marcus)
**I want to** see all expenses requiring my action
**So that** I can quickly respond to questions and pending resolutions

**Acceptance Criteria:**

- **Given** I am on the questioning dashboard
  **When** the page loads
  **Then** I see three sections: "Awaiting Your Resolution", "Awaiting Satisfaction", "Recently Resolved"
- **Given** I have questioned expenses awaiting resolution
  **When** I view "Awaiting Your Resolution"
  **Then** I see expenses in "questioned" status where I am the creator
- **Given** I have expenses in pending_satisfaction
  **When** I view "Awaiting Satisfaction"
  **Then** I see expenses where I am the questioner
- **Given** an expense is nearing timeout
  **When** I view it
  **Then** I see a countdown indicator (e.g., "5 days remaining")

**Priority:** P1

---

### 8.4 Fixed Monthly Expenses (Recurring)

#### US-022: Create Fixed Monthly Expense Template

**As a** co-parent (Sarah)
**I want to** create a template for a recurring monthly expense
**So that** it automatically appears in the ledger each month

**Acceptance Criteria:**

- **Given** I am on the recurring expenses page
  **When** I create a template with description, amount, category, paid_by, and frequency
  **Then** the template is saved and will generate expenses on schedule
- **Given** I select "monthly" frequency
  **When** I save the template
  **Then** it will generate on the 1st of each month
- **Given** I select other frequencies (weekly, biweekly, quarterly, annually)
  **When** I save the template
  **Then** the system stores the frequency for future generation
- **Given** I am on Free tier and already have 2 fixed expenses
  **When** I attempt to create a third
  **Then** I see an error "Upgrade to Pro for unlimited fixed expenses"
- **Given** I am on Pro tier
  **When** I create templates
  **Then** there is no limit on quantity

**Priority:** P0

---

#### US-023: Edit Fixed Monthly Expense Template

**As a** co-parent
**I want to** edit a recurring expense template
**So that** future generated expenses reflect the updated details

**Acceptance Criteria:**

- **Given** I am viewing a fixed expense template
  **When** I edit amount, description, or category
  **Then** the changes apply to future generated expenses only (past expenses unchanged)
- **Given** I edit a template
  **When** I save changes
  **Then** an activity event is logged
- **Given** I am not the creator of the template
  **When** I attempt to edit
  **Then** I can view but cannot modify the template

**Priority:** P1

---

#### US-024: Delete Fixed Monthly Expense Template

**As a** co-parent
**I want to** delete a recurring expense template
**So that** it stops generating future expenses

**Acceptance Criteria:**

- **Given** I view a fixed expense template
  **When** I delete it and confirm
  **Then** no future expenses are generated from this template
- **Given** I delete a template
  **When** the deletion completes
  **Then** previously generated expenses remain in the ledger (not retroactively deleted)
- **Given** I delete a template
  **When** the action completes
  **Then** an activity event is logged

**Priority:** P1

---

#### US-025: Automatic Monthly Expense Generation

**As a** co-parent (Sarah, Marcus)
**I want to** have fixed expenses automatically added to the ledger on the 1st of each month
**So that** I don't have to manually enter recurring expenses

**Acceptance Criteria:**

- **Given** a fixed monthly expense template exists
  **When** the 1st of the month occurs
  **Then** a new expense is created in "posted" status with expense_date = 1st of current month
- **Given** an expense for this template already exists for the current month
  **When** the system checks for generation
  **Then** it skips creating a duplicate (idempotent by month-year)
- **Given** multiple templates exist
  **When** the 1st occurs
  **Then** all templates generate their respective expenses
- **Given** generation fails for a template
  **When** an error occurs
  **Then** other templates still generate successfully (isolated failures)

**Priority:** P0

---

#### US-026: Edit Generated Fixed Expense

**As a** co-parent
**I want to** edit an automatically generated fixed expense
**So that** I can adjust it for one-time variations (e.g., price increase)

**Acceptance Criteria:**

- **Given** a fixed expense has been auto-generated
  **When** I edit it
  **Then** only this instance is modified (template remains unchanged)
- **Given** I edit a generated expense
  **When** I save changes
  **Then** an activity event logs the modification
- **Given** a generated expense is questioned
  **When** I view the dispute
  **Then** it follows the same questioning workflow as one-time expenses

**Priority:** P1

---

### 8.5 Balance & Payments

#### US-027: View Current Net Balance

**As a** co-parent (Sarah, Marcus, Jamie)
**I want to** see the current net balance prominently displayed
**So that** I know who owes whom and how much

**Acceptance Criteria:**

- **Given** I am on any page with balance visibility
  **When** the balance loads
  **Then** I see a clear display: "Parent A owes Parent B $X.XX" or "Parent B owes Parent A $X.XX"
- **Given** the balance is positive
  **When** I view it
  **Then** it shows "Parent A owes Parent B"
- **Given** the balance is negative
  **When** I view it
  **Then** it shows "Parent B owes Parent A" with absolute value
- **Given** the balance is zero
  **When** I view it
  **Then** it shows "All settled up!"
- **Given** expenses change status (questioned, resolved, etc.)
  **When** the balance recalculates
  **Then** it updates in real-time

**Priority:** P0

---

#### US-028: Balance Calculation Logic

**As a** system
**I want to** calculate balance using integer math and specific status rules
**So that** the balance is accurate and avoids floating-point errors

**Acceptance Criteria:**

- **Given** an expense amount in dollars
  **When** stored in database
  **Then** it is converted to cents (integer)
- **Given** parent_a_ratio = 0.60 and expense = 10000 cents
  **When** shares are calculated
  **Then** a_share = floor(10000 \* 0.60) = 6000, b_share = 10000 - 6000 = 4000
- **Given** expenses in statuses: posted, resolved, resolved_creator_decided
  **When** balance is calculated
  **Then** these expenses are included
- **Given** expenses in statuses: questioned, pending_satisfaction, resolved_personal, resolved_deleted, closed_unresolved
  **When** balance is calculated
  **Then** these expenses are excluded
- **Given** Parent A paid an included expense
  **When** balance is calculated
  **Then** Parent B's share is added to the balance (B owes A)
- **Given** Parent B paid an included expense
  **When** balance is calculated
  **Then** Parent A's share is added to the balance (A owes B)

**Priority:** P0

---

#### US-029: Record External Payment

**As a** co-parent who paid my co-parent outside the app (Sarah, Marcus)
**I want to** record the payment (Venmo, Zelle, cash, check)
**So that** the balance is reduced and the payment is documented

**Acceptance Criteria:**

- **Given** I am on the payment recording form
  **When** I enter paid_by (me), amount (positive), payment_date, method, and optional notes
  **Then** the payment is recorded and reduces the net balance
- **Given** I record a payment of $50 from Parent A to Parent B
  **When** the payment is saved
  **Then** the balance decreases by $50 (if A owes B) or increases by $50 (if B owes A)
- **Given** I enter a zero or negative amount
  **When** I attempt to save
  **Then** I see an error "Payment amount must be positive"
- **Given** I leave payment_date blank
  **When** I save
  **Then** it defaults to today's date
- **Given** I record a payment
  **When** the save completes
  **Then** an activity event is logged with payment details

**Priority:** P0

---

#### US-030: View Payment History

**As a** co-parent
**I want to** see all recorded payments
**So that** I can review payment history and verify transactions

**Acceptance Criteria:**

- **Given** I am on the payments page
  **When** the page loads
  **Then** I see all payments sorted by payment_date descending
- **Given** payments exist
  **When** I view the list
  **Then** each payment shows: date, paid_by, amount, method, notes
- **Given** I am on Free tier
  **When** I view payments
  **Then** I only see payments from the last 3 months
- **Given** I am on Pro tier
  **When** I view payments
  **Then** I see all historical payments

**Priority:** P1

---

#### US-031: Balance Audit Trail

**As a** co-parent
**I want to** see a detailed breakdown of how the balance was calculated
**So that** I can verify accuracy and trace individual contributions

**Acceptance Criteria:**

- **Given** I am on the balance details page
  **When** I view the breakdown
  **Then** I see: starting balance, each included expense with its share split, each payment, and ending balance
- **Given** I click on an expense in the breakdown
  **When** I navigate to it
  **Then** I am taken to the full expense detail page
- **Given** expenses are excluded from balance
  **When** I view the breakdown
  **Then** I see a separate section listing excluded expenses with reasons

**Priority:** P2

---

### 8.6 Activity Feed & Audit Trail

#### US-032: View Activity Feed

**As a** co-parent
**I want to** see a chronological feed of all family activity
**So that** I can track changes and stay informed

**Acceptance Criteria:**

- **Given** I am on the activity feed page
  **When** the page loads
  **Then** I see all activity events sorted by created_at descending
- **Given** activities exist
  **When** I view the feed
  **Then** each event shows: timestamp, actor (who), action type, target (what), and human-readable description
- **Given** I am on Free tier
  **When** I view activities
  **Then** I only see activities from the last 3 months
- **Given** I am on Pro tier
  **When** I view activities
  **Then** I see all historical activities

**Priority:** P1

---

#### US-033: Activity Event Types

**As a** system
**I want to** log specific event types for all mutations
**So that** the audit trail is comprehensive and queryable

**Acceptance Criteria:**

- **Given** an expense is created
  **When** the action completes
  **Then** event_type = "expense_created" is logged
- **Given** an expense is updated
  **When** the action completes
  **Then** event_type = "expense_updated" with before/after snapshots is logged
- **Given** an expense is deleted
  **When** the action completes
  **Then** event_type = "expense_deleted" with full snapshot is logged
- **Given** an expense is questioned
  **When** the action completes
  **Then** event_type = "expense_questioned" is logged
- **Given** a question is resolved
  **When** the action completes
  **Then** event_type = "question_resolved" with resolution_action is logged
- **Given** a resolution is satisfied
  **When** the action completes
  **Then** event_type = "resolution_satisfied" is logged
- **Given** a payment is recorded
  **When** the action completes
  **Then** event_type = "payment_recorded" is logged
- **Given** a fixed expense is created/updated/deleted
  **When** the action completes
  **Then** event_type = "recurring_created" / "recurring_updated" / "recurring_deleted" is logged
- **Given** a fixed expense is auto-generated
  **When** generation occurs
  **Then** event_type = "recurring_generated" is logged
- **Given** split ratio is changed
  **When** the action completes
  **Then** event_type = "split_ratio_updated" is logged
- **Given** a timeout occurs (7-day or 30-day)
  **When** status changes
  **Then** event_type = "system_timeout" or "system_closure" is logged

**Priority:** P0

---

#### US-034: View Activity Event Details

**As a** co-parent
**I want to** click on an activity event to see full details
**So that** I can understand exactly what changed

**Acceptance Criteria:**

- **Given** I click on an activity event
  **When** the detail view opens
  **Then** I see: full event metadata, before/after snapshots (if applicable), and a link to the target entity
- **Given** an event has before/after snapshots
  **When** I view the detail
  **Then** I see a side-by-side comparison of changed fields
- **Given** an event references a deleted entity
  **When** I view the detail
  **Then** I see the snapshot but cannot navigate to the entity (no longer exists)

**Priority:** P2

---

### 8.7 Children Management

#### US-035: Add Child to Family

**As a** co-parent (Sarah, Marcus, Jamie)
**I want to** add a child to our family profile
**So that** I can associate expenses with specific children

**Acceptance Criteria:**

- **Given** I am on the children management page
  **When** I enter a child's name (1-100 characters)
  **Then** the child is added to the family
- **Given** I enter a name over 100 characters
  **When** I attempt to save
  **Then** I see a validation error
- **Given** I enter a blank name
  **When** I attempt to save
  **Then** I see an error "Child name is required"
- **Given** I add a child
  **When** the save completes
  **Then** an activity event is logged

**Priority:** P1

---

#### US-036: Edit Child Details

**As a** co-parent
**I want to** edit a child's name
**So that** I can correct mistakes or update information

**Acceptance Criteria:**

- **Given** I view a child's profile
  **When** I edit the name and save
  **Then** the child's name is updated
- **Given** the child is associated with expenses
  **When** I update their name
  **Then** all associated expenses reflect the new name
- **Given** I edit a child
  **When** the save completes
  **Then** an activity event is logged

**Priority:** P2

---

#### US-037: Remove Child from Family

**As a** co-parent
**I want to** remove a child from the family
**So that** they no longer appear in expense associations

**Acceptance Criteria:**

- **Given** I view a child's profile
  **When** I delete and confirm
  **Then** the child is removed (soft delete)
- **Given** the child is associated with expenses
  **When** I remove them
  **Then** expense associations are cleared or marked as archived
- **Given** I remove a child
  **When** the action completes
  **Then** an activity event is logged

**Priority:** P2

---

#### US-038: Filter Expenses by Child

**As a** co-parent (Sarah)
**I want to** filter the ledger to show expenses for a specific child
**So that** I can see per-child spending

**Acceptance Criteria:**

- **Given** I am on the ledger page
  **When** I select a child filter
  **Then** I see only expenses associated with that child
- **Given** an expense is associated with multiple children
  **When** I filter by one of them
  **Then** the expense appears in the results

**Priority:** P2

---

### 8.8 Settings & Configuration

#### US-039: Update User Profile

**As a** co-parent
**I want to** update my name and email
**So that** my profile information is current

**Acceptance Criteria:**

- **Given** I am on the profile settings page
  **When** I update my name or email
  **Then** the changes are saved and reflected across the app
- **Given** I change my email
  **When** I save
  **Then** I receive a verification email at the new address
- **Given** I change my email but don't verify
  **When** I log in later
  **Then** my old email is still active until verification completes

**Priority:** P2

---

#### US-040: Update Notification Preferences

**As a** co-parent
**I want to** control which notifications I receive
**So that** I only get alerts for events I care about

**Acceptance Criteria:**

- **Given** I am on notification settings
  **When** I toggle options for expense_created, expense_questioned, question_resolved, payment_recorded
  **Then** my preferences are saved
- **Given** I disable a notification type
  **When** that event occurs
  **Then** I do not receive an email notification
- **Given** I enable a notification type
  **When** that event occurs
  **Then** I receive an email notification

**Priority:** P2

---

#### US-041: Leave Family

**As a** co-parent
**I want to** leave the family
**So that** I can disconnect from the shared ledger if needed

**Acceptance Criteria:**

- **Given** I am on family settings
  **When** I click "Leave Family" and confirm
  **Then** I am removed from the family and lose access to the ledger
- **Given** I leave the family
  **When** the action completes
  **Then** my co-parent is notified and the family is marked as inactive
- **Given** I leave the family
  **When** I attempt to access family pages
  **Then** I am redirected to family creation

**Priority:** P2

---

### 8.9 Tier Management & Billing

#### US-042: View Current Subscription Tier

**As a** co-parent
**I want to** see which tier I'm on and what features are available
**So that** I understand my current plan

**Acceptance Criteria:**

- **Given** I am on the billing page
  **When** the page loads
  **Then** I see my current tier (Free or Pro), price, and feature comparison
- **Given** I am on Free tier
  **When** I view features
  **Then** I see: 3-month history, max 2 fixed expenses, no export
- **Given** I am on Pro tier
  **When** I view features
  **Then** I see: unlimited history, unlimited fixed expenses, CSV export

**Priority:** P1

---

#### US-043: Upgrade to Pro Tier

**As a** co-parent on Free tier (Sarah, Jamie)
**I want to** upgrade to Pro
**So that** I can access unlimited history and fixed expenses

**Acceptance Criteria:**

- **Given** I am on Free tier
  **When** I click "Upgrade to Pro" and complete payment
  **Then** my tier is upgraded and features are immediately available
- **Given** I upgrade to Pro
  **When** the transaction completes
  **Then** I see a confirmation message and receipt email
- **Given** I upgrade to Pro
  **When** I view the ledger
  **Then** I can now see all historical expenses (not limited to 3 months)

**Priority:** P1

---

#### US-044: Cancel Pro Subscription

**As a** co-parent on Pro tier
**I want to** cancel my subscription
**So that** I can downgrade to Free tier at the end of the billing period

**Acceptance Criteria:**

- **Given** I am on Pro tier
  **When** I cancel my subscription
  **Then** Pro features remain active until the end of the current billing period
- **Given** my billing period ends after cancellation
  **When** the period expires
  **Then** I am downgraded to Free tier and see 3-month history limit
- **Given** I cancel Pro
  **When** the action completes
  **Then** I see a confirmation message with the downgrade date

**Priority:** P2

---

#### US-045: Tier Limit Enforcement - Fixed Expenses

**As a** system
**I want to** enforce the 2-fixed-expense limit on Free tier
**So that** users must upgrade for unlimited templates

**Acceptance Criteria:**

- **Given** I am on Free tier with 2 fixed expenses
  **When** I attempt to create a third
  **Then** I see a modal "Upgrade to Pro for unlimited fixed expenses" with CTA
- **Given** I am on Pro tier
  **When** I create fixed expenses
  **Then** there is no limit enforced

**Priority:** P0

---

#### US-046: Tier Limit Enforcement - History Access

**As a** system
**I want to** limit Free tier users to 3-month history
**So that** users must upgrade for unlimited access

**Acceptance Criteria:**

- **Given** I am on Free tier
  **When** I view the ledger
  **Then** I only see expenses from the last 3 months
- **Given** I am on Free tier and have expenses older than 3 months
  **When** I view activity feed
  **Then** I only see activities from the last 3 months
- **Given** I upgrade to Pro
  **When** I view the ledger
  **Then** all historical expenses immediately become visible

**Priority:** P0

---

### 8.10 Data Export

#### US-047: Export Ledger to CSV (Pro Only)

**As a** Pro tier co-parent
**I want to** export the expense ledger to CSV
**So that** I can analyze data in Excel or for tax purposes

**Acceptance Criteria:**

- **Given** I am on Pro tier
  **When** I click "Export to CSV"
  **Then** a CSV file downloads with all expenses (id, date, description, amount, category, paid_by, status, creator)
- **Given** I am on Free tier
  **When** I attempt to export
  **Then** I see a modal "Upgrade to Pro for CSV export"
- **Given** I export data
  **When** the file downloads
  **Then** money values are in dollars (not cents) with 2 decimal places

**Priority:** P2

---

#### US-048: Export Payments to CSV (Pro Only)

**As a** Pro tier co-parent
**I want to** export the payment history to CSV
**So that** I can keep external records

**Acceptance Criteria:**

- **Given** I am on Pro tier
  **When** I click "Export Payments to CSV"
  **Then** a CSV file downloads with all payments (id, date, paid_by, amount, method, notes)
- **Given** I am on Free tier
  **When** I attempt to export payments
  **Then** I see a modal "Upgrade to Pro for CSV export"

**Priority:** P2

---

### 8.11 Notifications

#### US-049: Receive Email Notification - Expense Created

**As a** co-parent (Marcus receiving notification from Sarah)
**I want to** receive an email when my co-parent creates an expense
**So that** I stay informed of new spending

**Acceptance Criteria:**

- **Given** my co-parent creates an expense
  **When** the expense is saved
  **Then** I receive an email with expense details and a link to view
- **Given** I have disabled "expense_created" notifications
  **When** an expense is created
  **Then** I do not receive an email

**Priority:** P1

---

#### US-050: Receive Email Notification - Expense Questioned

**As a** expense creator (Sarah)
**I want to** receive an email when my expense is questioned
**So that** I can respond promptly

**Acceptance Criteria:**

- **Given** my co-parent questions my expense
  **When** the question is submitted
  **Then** I receive an email with the question reason, note, and a link to resolve
- **Given** I have disabled "expense_questioned" notifications
  **When** my expense is questioned
  **Then** I do not receive an email

**Priority:** P1

---

#### US-051: Receive Email Notification - Question Resolved

**As a** questioner (Marcus)
**I want to** receive an email when the creator resolves my question
**So that** I can satisfy or review the resolution

**Acceptance Criteria:**

- **Given** the creator resolves my question
  **When** the resolution is submitted
  **Then** I receive an email with the resolution action and a link to satisfy (if needed)
- **Given** I have disabled "question_resolved" notifications
  **When** a question is resolved
  **Then** I do not receive an email

**Priority:** P1

---

#### US-052: Receive Email Notification - Payment Recorded

**As a** co-parent
**I want to** receive an email when my co-parent records a payment
**So that** I am aware of balance changes

**Acceptance Criteria:**

- **Given** my co-parent records a payment
  **When** the payment is saved
  **Then** I receive an email with payment details and updated balance
- **Given** I have disabled "payment_recorded" notifications
  **When** a payment is recorded
  **Then** I do not receive an email

**Priority:** P1

---

#### US-053: Receive Email Notification - Fixed Expense Generated

**As a** co-parent
**I want to** receive an email when fixed expenses are auto-generated
**So that** I know new recurring expenses have been added

**Acceptance Criteria:**

- **Given** the 1st of the month occurs and fixed expenses generate
  **When** generation completes
  **Then** both parents receive an email listing all generated expenses
- **Given** no fixed expenses are configured
  **When** the 1st occurs
  **Then** no email is sent

**Priority:** P2

---

## 9. Information Architecture

### Navigation Structure

```
[Bottom Tab Navigation - 5 items]
├── Expenses (default/home)
│   ├── Expense List (filterable by status, child, date range)
│   └── → Expense Detail (tap any row)
│       ├── Info section (amount, category, child, date, receipt)
│       ├── Question Thread (if questioned)
│       ├── Timeline (status history)
│       └── Actions (Question, Resolve, Satisfy - contextual)
│
├── Add (+) - opens as modal/overlay
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

| Level | Screen             | Access Point              |
| ----- | ------------------ | ------------------------- |
| L1    | Expenses List      | Bottom nav (default)      |
| L1    | Payments           | Bottom nav                |
| L1    | Activity           | Bottom nav                |
| L1    | Settings           | Bottom nav                |
| L2    | Expense Detail     | Tap expense row           |
| L2    | Add Expense        | FAB or "+" in nav         |
| L2    | Record Payment     | Button on Payments screen |
| L3    | Question Thread    | Within expense detail     |
| L3    | Resolution Flow    | Within expense detail     |
| L3    | Child Management   | Within Settings           |
| L3    | Recurring Expenses | Within Settings           |

### Information Density by Screen

| Screen         | Primary Info                        | Secondary Info                | Actions                                  |
| -------------- | ----------------------------------- | ----------------------------- | ---------------------------------------- |
| Expenses List  | Amount, description, status, date   | Category icon, child tag      | Filter, sort, tap to detail              |
| Expense Detail | Full expense info, thread, timeline | Metadata (created by, edited) | Question, Resolve, Satisfy, Edit, Delete |
| Payments       | Net balance, recent payments        | Period breakdown              | Record payment                           |
| Activity       | Event description, timestamp        | Actor name                    | Tap to related expense                   |
| Settings       | Preference labels                   | Current values                | Edit each section                        |

---

## 10. Architecture & Technical Design

### System Architecture Overview

```
                                    ARCHITECTURE DIAGRAM
+-----------------------------------------------------------------------------------+
|                                   CLIENT LAYER                                     |
|  +-----------------------------------------------------------------------------+  |
|  |                         Next.js 16 Application                               |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  |   React 19 UI    |  |  Clerk Provider  |  |  API Client      |            |  |
|  |  |  (Tailwind CSS)  |  |  (Auth Context)  |  |  (lib/api.ts)    |            |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  +-----------------------------------------------------------------------------+  |
|                                      |                                            |
|                              Vercel Edge Network                                  |
+-----------------------------------------------------------------------------------+
                                       |
                                       | HTTPS (JWT Bearer / X-User-Id)
                                       v
+-----------------------------------------------------------------------------------+
|                                   API LAYER                                        |
|  +-----------------------------------------------------------------------------+  |
|  |                     Cloudflare Workers (ke-api)                              |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  |  Hono Framework  |  |  Auth Middleware |  |  CORS Middleware |            |  |
|  |  |  (Router)        |  |  (JWT + Fallback)|  |  (Origin Check)  |            |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |                                                                              |  |
|  |  +------------------------------------------------------------------------+  |  |
|  |  |                          Route Handlers                                 |  |  |
|  |  |  /me | /families | /expenses | /payments | /children | /activity       |  |  |
|  |  |  /fixed-expenses | /expense-actions                                     |  |  |
|  |  +------------------------------------------------------------------------+  |  |
|  |                                                                              |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  | Activity Service |  | Calculations     |  | Utility Functions|            |  |
|  |  | (Audit Trail)    |  | (Money Math)     |  | (ID Gen, Dates)  |            |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  +-----------------------------------------------------------------------------+  |
|                                      |                                            |
|                          Cloudflare Global Network                                |
+-----------------------------------------------------------------------------------+
                                       |
                                       | D1 Binding
                                       v
+-----------------------------------------------------------------------------------+
|                                  DATA LAYER                                        |
|  +-----------------------------------------------------------------------------+  |
|  |                       Cloudflare D1 (ke-main)                                |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  |     users        |  |    families      |  |    children      |            |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  |    expenses      |  | fixed_expenses   |  |    payments      |            |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  | activity_events  |  |  subscriptions   |  | pending_invites  |            |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                       |
+-----------------------------------------------------------------------------------+
|                              EXTERNAL SERVICES                                     |
|  +------------------+  +------------------+  +------------------+                  |
|  |      Clerk       |  |     Resend       |  |     Stripe       |                  |
|  |  (Auth + Users)  |  |  (Email Invites) |  |  (Subscriptions) |                  |
|  +------------------+  +------------------+  +------------------+                  |
+-----------------------------------------------------------------------------------+
```

### Request Flow

```
REQUEST FLOW: Create Expense

1. User Action
   Browser -> Next.js Page Component

2. API Call (Client)
   React Component
     -> lib/api.ts:createExpense()
     -> fetch() with JWT Bearer token

3. Edge Routing
   Vercel -> Cloudflare Workers (via workers.dev subdomain)

4. Authentication
   Hono Middleware
     -> Parse Authorization header
     -> Verify JWT against Clerk JWKS
     -> Extract user_id from 'sub' claim
     -> Set userId in context

5. Authorization
   Route Handler
     -> Query families table
     -> Verify user is parent_a or parent_b
     -> Return 403 if unauthorized

6. Validation
   Route Handler
     -> Validate description length (1-200 chars)
     -> Validate amount is positive number
     -> Validate category enum
     -> Convert dollars to cents (Math.round(amount * 100))

7. Mutation
   D1 Database
     -> INSERT INTO expenses
     -> INSERT INTO activity_events (audit trail)
     -> Return created record

8. Response
   Hono -> JSON response
     -> { success: true, expense: {...} }
     -> HTTP 201 Created

9. Client Update
   React Component
     -> Update local state
     -> Revalidate queries
     -> Update UI
```

### Deployment Topology

| Component             | Platform     | Region             | CDN                  |
| --------------------- | ------------ | ------------------ | -------------------- |
| Frontend (Next.js 16) | Vercel       | Edge (auto)        | Vercel Edge Network  |
| API (Workers)         | Cloudflare   | Global (100+ PoPs) | Cloudflare Edge      |
| Database (D1)         | Cloudflare   | Primary + Replicas | N/A (direct binding) |
| Auth (Clerk)          | Clerk Cloud  | US (primary)       | Global edge caching  |
| Email (Resend)        | Resend Cloud | US                 | N/A                  |

### Key Architectural Decisions

#### ADR-001: On-Read Timeout Resolution (7-Day Rule)

**Context:** When an expense is in `pending_satisfaction` status, the questioner has 7 days to accept or reject the creator's resolution. If they don't respond, the expense auto-resolves.

**Decision:** Implement timeout check on-read rather than via scheduled cron job.

**Rationale:**

- Avoids scheduled triggers (Workers crons have cold-start latency)
- No need for batch processing infrastructure
- Timeout applies exactly when relevant (user viewing expense)
- Simpler operational model (no separate cron monitoring)

**Tradeoffs:**

- Expense won't appear as `resolved_creator_decided` until next read
- Activity feed may show slightly stale status until accessed

---

#### ADR-002: Cents-Based Money Storage

**Context:** Financial applications require precise decimal arithmetic. JavaScript's floating-point numbers introduce rounding errors.

**Decision:** Store all monetary values as INTEGER cents in D1. Convert at API boundary.

**Implementation:**

```typescript
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

export function calculateShares(
  amountCents: number,
  parentARatio: number
): { aShare: number; bShare: number } {
  const aShare = Math.floor(amountCents * parentARatio)
  const bShare = amountCents - aShare // Remainder to B
  return { aShare, bShare }
}
```

**Rationale:**

- Exact integer arithmetic (no floating-point errors)
- D1 INTEGER type has no precision limits for typical expense amounts
- Floor for A's share ensures exact split (B gets remainder)
- Industry-standard pattern for financial applications

---

#### ADR-003: Universal Soft Delete

**Context:** Users may need to "delete" records while preserving audit trail and historical data.

**Decision:** All deletable entities use `deleted_at TEXT` column. Query filters exclude deleted records by default.

**Affected Tables:** children, expenses, fixed_expenses, payments

**Rationale:**

- Preserves audit trail for compliance
- Enables "undo" functionality
- Historical balance calculations remain accurate
- Simpler than implementing archive tables

---

#### ADR-004: Activity Events as Audit Trail

**Context:** Co-parents need transparency into all changes. Disputes require historical record of actions.

**Decision:** Log every mutation with before/after snapshots in `activity_events` table.

**Event Types:**

- `expense.created`, `expense.questioned`, `expense.resolved`, `expense.satisfied`, `expense.generated`
- `payment.created`
- `child.created`, `child.deleted`
- `fixed_expense.created`, `fixed_expense.updated`, `fixed_expense.ended`
- `family.ratio_updated`

**Rationale:**

- Complete audit trail for question resolution
- Powers activity feed feature
- Enables future "undo" or "diff view" features
- JSON snapshots capture full state (no joins needed for historical view)

---

#### ADR-005: JWT Verification with JWKS Caching

**Context:** Clerk issues JWTs for authenticated users. API must verify tokens on every request.

**Decision:** Implement custom JWT verification with in-memory JWKS cache (1-hour TTL).

**Rationale:**

- Avoids network round-trip to Clerk on every request
- Handles key rotation gracefully (force refresh on signature failure)
- Workers have no persistent memory, but cache survives within isolate lifecycle
- 1-hour TTL balances performance vs security

---

### Expense Status State Machine

```
                        EXPENSE STATUS STATE MACHINE

                              +----------+
                              |  posted  |
                              +----+-----+
                                   |
                      other parent questions
                                   |
                                   v
                            +-----------+
                            | questioned |
                            +-----+-----+
                                  |
                       creator resolves (4 actions)
                                  |
        +------------+------------+------------+------------+
        |            |            |            |            |
        v            v            v            v            |
  +-----------+  +--------+  +---------+  +----------+      |
  |pending_   |  |resolved|  |resolved_|  |resolved_ |      |
  |satisfaction|  |_personal|  |_deleted |  |(auto)   |      |
  +-----+-----+  +--------+  +---------+  +----------+      |
        |             |            |                        |
        |       (excluded from balance)                     |
        |                                                   |
        +-------- questioner satisfies --------+            |
        |                                      |            |
        v                                      |            |
  +---------+                                  |            |
  | resolved |<--------------------------------+            |
  +---------+                                               |
        |                                                   |
        +------------ 7-day timeout --------------+         |
                                                  |         |
                                                  v         |
                                        +------------------+|
                                        |resolved_creator_ ||
                                        |decided           ||
                                        +------------------+|
                                                            |
                                                            |
        [Alternative path: close without resolution]        |
        +---------------------------------------------------+
        |
        v
  +------------------+
  | closed_unresolved |
  +------------------+
       (excluded from balance)
```

#### Status Definitions

| Status                     | Description                                       | Included in Balance? |
| -------------------------- | ------------------------------------------------- | -------------------- |
| `posted`                   | Initial state, expense visible to both parents    | Yes                  |
| `questioned`               | Other parent has raised a question                | No                   |
| `pending_satisfaction`     | Creator responded, awaiting questioner acceptance | No                   |
| `resolved`                 | Questioner accepted creator's response            | Yes                  |
| `resolved_creator_decided` | 7-day timeout expired, auto-resolved              | Yes                  |
| `resolved_personal`        | Creator marked as personal (not shared)           | No                   |
| `resolved_deleted`         | Creator deleted the expense                       | No                   |
| `closed_unresolved`        | Escalated or abandoned questioning                | No                   |

---

## 11. Data Model

### 11.1 Entity-Relationship Diagram

```
                              ENTITY-RELATIONSHIP DIAGRAM

    +------------------+          +------------------+          +------------------+
    |      users       |          |     families     |          |    children      |
    +------------------+          +------------------+          +------------------+
    | PK id TEXT       |<---+     | PK id TEXT       |<----+    | PK id TEXT       |
    | email TEXT       |    |     | name TEXT        |     |    | FK family_id     |----+
    | name TEXT        |    |     | FK parent_a_id   |-----+    | name TEXT        |    |
    | created_at TEXT  |    |     | FK parent_b_id   |-----+    | created_at TEXT  |    |
    | updated_at TEXT  |    +-----| parent_a_ratio   |     |    | deleted_at TEXT  |    |
    +------------------+          | invite_code TEXT |     |    +------------------+    |
                                  | invite_expires_at|     |                            |
                                  | created_at TEXT  |     |                            |
                                  | updated_at TEXT  |     |                            |
                                  +------------------+     |                            |
                                           |               |                            |
                                           |               |                            |
    +------------------+                   |               |                            |
    | pending_invites  |                   |               |                            |
    +------------------+                   |               |                            |
    | PK id TEXT       |                   |               |                            |
    | FK family_id     |-------------------+               |                            |
    | FK invited_by    |--+                                |                            |
    | invited_email    |  |                                |                            |
    | invite_code TEXT |  |                                |                            |
    | status TEXT      |  |                                |                            |
    | expires_at TEXT  |  |                                |                            |
    +------------------+  |                                |                            |
                          |                                |                            |
    +------------------+  |    +------------------+        |                            |
    |  fixed_expenses  |  |    |     expenses     |        |                            |
    +------------------+  |    +------------------+        |                            |
    | PK id TEXT       |<-+----| PK id TEXT       |        |                            |
    | FK family_id     |--+----| FK family_id     |--------+                            |
    | FK created_by    |--+    | FK created_by    |---+                                 |
    | description TEXT |       | FK paid_by       |---+                                 |
    | amount_cents INT |       | FK fixed_exp_id  |---+                                 |
    | category TEXT    |       | description TEXT |                                     |
    | frequency TEXT   |       | amount_cents INT |                                     |
    | child_ids TEXT   |       | category TEXT    |                                     |
    | link_url TEXT    |       | expense_date TEXT|                                     |
    | memo TEXT        |       | child_ids TEXT   |-----> JSON array of child IDs ------+
    | effective_from   |       | link_url TEXT    |
    | effective_until  |       | memo TEXT        |
    | created_at TEXT  |       | status TEXT      |  <--- 8-state machine
    | updated_at TEXT  |       | questioned_by    |---+
    | deleted_at TEXT  |       | questioned_at    |   |
    +------------------+       | question_reason  |   |
                               | question_note    |   |
                               | resolved_at TEXT |   |
    +------------------+       | resolution_action|   |
    |     payments     |       | satisfied_at TEXT|   |
    +------------------+       | closed_unres_at  |   |
    | PK id TEXT       |       | closed_unres_by  |---+
    | FK family_id     |-------| created_at TEXT  |
    | FK paid_by       |---+   | updated_at TEXT  |
    | amount_cents INT |   |   | deleted_at TEXT  |
    | payment_date TEXT|   |   +------------------+
    | notes TEXT       |   |
    | created_at TEXT  |   |
    | deleted_at TEXT  |   |
    +------------------+   |
                           |
    +------------------+   |   +------------------+
    | activity_events  |   |   |  subscriptions   |
    +------------------+   |   +------------------+
    | PK id TEXT       |   |   | PK id TEXT       |
    | FK family_id     |---+---| FK family_id     |
    | FK user_id       |---+   | status TEXT      |
    | event_type TEXT  |       | started_at TEXT  |
    | target_type TEXT |       | expires_at TEXT  |
    | target_id TEXT   |       | stripe_sub_id    |
    | before_snapshot  |       | created_at TEXT  |
    | after_snapshot   |       | updated_at TEXT  |
    | metadata TEXT    |       +------------------+
    | created_at TEXT  |
    +------------------+

    +---------------------------+
    | fixed_expense_suggestions |
    +---------------------------+
    | PK id TEXT                |
    | FK fixed_expense_id       |
    | FK expense_id             |
    | FK suggested_by           |
    | suggestion_note TEXT      |
    | status TEXT               |
    | resolved_at TEXT          |
    | created_at TEXT           |
    +---------------------------+
```

### 11.2 Table Specifications

#### users

Cache of Clerk user data for local joins.

| Column     | Type | Constraints           | Description                          |
| ---------- | ---- | --------------------- | ------------------------------------ |
| id         | TEXT | PRIMARY KEY           | Clerk user ID (e.g., `user_2abc...`) |
| email      | TEXT | NOT NULL, UNIQUE      | User's email address                 |
| name       | TEXT |                       | Display name                         |
| created_at | TEXT | NOT NULL, DEFAULT now | ISO 8601 timestamp                   |
| updated_at | TEXT | NOT NULL, DEFAULT now | ISO 8601 timestamp                   |

**Indexes:**

- `idx_users_email` UNIQUE on (email)

---

#### families

Parent pair with expense split configuration.

| Column            | Type | Constraints                        | Description                        |
| ----------------- | ---- | ---------------------------------- | ---------------------------------- |
| id                | TEXT | PRIMARY KEY                        | CUID-style ID                      |
| name              | TEXT |                                    | Optional family name               |
| parent_a_id       | TEXT | NOT NULL, FK users(id)             | First parent (creator)             |
| parent_b_id       | TEXT | FK users(id)                       | Second parent (joiner)             |
| parent_a_ratio    | REAL | NOT NULL, DEFAULT 0.5, CHECK (0-1) | Parent A's share (e.g., 0.6 = 60%) |
| invite_code       | TEXT |                                    | 6-char uppercase code              |
| invite_expires_at | TEXT |                                    | ISO 8601 expiry                    |
| created_at        | TEXT | NOT NULL, DEFAULT now              |                                    |
| updated_at        | TEXT | NOT NULL, DEFAULT now              |                                    |

**Indexes:**

- `idx_families_invite` UNIQUE on (invite_code) WHERE invite_code IS NOT NULL
- `idx_families_parent_a` on (parent_a_id)
- `idx_families_parent_b` on (parent_b_id)

---

#### children

Children associated with a family for expense attribution.

| Column     | Type | Constraints               | Description                |
| ---------- | ---- | ------------------------- | -------------------------- |
| id         | TEXT | PRIMARY KEY               | CUID-style ID              |
| family_id  | TEXT | NOT NULL, FK families(id) | Parent family              |
| name       | TEXT | NOT NULL                  | Child's name (1-100 chars) |
| created_at | TEXT | NOT NULL, DEFAULT now     |                            |
| deleted_at | TEXT |                           | Soft delete timestamp      |

**Indexes:**

- `idx_children_family` on (family_id)

---

#### expenses

Individual expense records with 8-status state machine.

| Column               | Type    | Constraints                            | Description                                                  |
| -------------------- | ------- | -------------------------------------- | ------------------------------------------------------------ |
| id                   | TEXT    | PRIMARY KEY                            | CUID-style ID                                                |
| family_id            | TEXT    | NOT NULL, FK families(id)              | Parent family                                                |
| created_by           | TEXT    | NOT NULL, FK users(id)                 | User who created                                             |
| paid_by              | TEXT    | NOT NULL, FK users(id)                 | User who paid                                                |
| fixed_expense_id     | TEXT    | FK fixed_expenses(id)                  | Source template (if generated)                               |
| description          | TEXT    | NOT NULL, CHECK (1-200 chars)          | Expense description                                          |
| amount_cents         | INTEGER | NOT NULL                               | Amount in cents                                              |
| category             | TEXT    | NOT NULL, CHECK enum                   | school/medical/activities/childcare/other                    |
| expense_date         | TEXT    | NOT NULL                               | YYYY-MM-DD                                                   |
| child_ids            | TEXT    |                                        | JSON array of child IDs                                      |
| link_url             | TEXT    |                                        | Optional receipt/reference URL                               |
| memo                 | TEXT    | CHECK (<=500 chars)                    | Additional notes                                             |
| status               | TEXT    | NOT NULL, DEFAULT 'posted', CHECK enum | See state machine                                            |
| questioned_by        | TEXT    | FK users(id)                           | Who questioned                                               |
| questioned_at        | TEXT    |                                        | When questioned                                              |
| question_reason      | TEXT    | CHECK enum                             | wrong_amount/not_child_related/duplicate/split_dispute/other |
| question_note        | TEXT    |                                        | Question details                                             |
| resolved_at          | TEXT    |                                        | When resolved                                                |
| resolution_action    | TEXT    |                                        | keep/edit/personal/delete                                    |
| satisfied_at         | TEXT    |                                        | When questioner accepted                                     |
| closed_unresolved_at | TEXT    |                                        | When closed without resolution                               |
| closed_unresolved_by | TEXT    | FK users(id)                           | Who closed                                                   |
| created_at           | TEXT    | NOT NULL, DEFAULT now                  |                                                              |
| updated_at           | TEXT    | NOT NULL, DEFAULT now                  |                                                              |
| deleted_at           | TEXT    |                                        | Soft delete timestamp                                        |

**Indexes:**

- `idx_expenses_family` on (family_id)
- `idx_expenses_date` on (family_id, expense_date)
- `idx_expenses_status` on (family_id, status)
- `idx_expenses_fixed` on (fixed_expense_id)

---

#### fixed_expenses

Recurring expense templates.

| Column          | Type    | Constraints                             | Description                                |
| --------------- | ------- | --------------------------------------- | ------------------------------------------ |
| id              | TEXT    | PRIMARY KEY                             | CUID-style ID                              |
| family_id       | TEXT    | NOT NULL, FK families(id)               | Parent family                              |
| created_by      | TEXT    | NOT NULL, FK users(id)                  | Template creator                           |
| description     | TEXT    | NOT NULL, CHECK (1-200 chars)           | Expense description                        |
| amount_cents    | INTEGER | NOT NULL, CHECK (>0)                    | Amount in cents                            |
| category        | TEXT    | NOT NULL, CHECK enum                    | Category                                   |
| frequency       | TEXT    | NOT NULL, DEFAULT 'monthly', CHECK enum | weekly/biweekly/monthly/quarterly/annually |
| child_ids       | TEXT    |                                         | JSON array of child IDs                    |
| link_url        | TEXT    |                                         | Reference URL                              |
| memo            | TEXT    | CHECK (<=500 chars)                     | Notes                                      |
| effective_from  | TEXT    | NOT NULL                                | Start date (YYYY-MM-DD)                    |
| effective_until | TEXT    |                                         | End date (null = ongoing)                  |
| created_at      | TEXT    | NOT NULL, DEFAULT now                   |                                            |
| updated_at      | TEXT    | NOT NULL, DEFAULT now                   |                                            |
| deleted_at      | TEXT    |                                         | Soft delete timestamp                      |

**Indexes:**

- `idx_fixed_family` on (family_id)
- `idx_fixed_effective` on (effective_from, effective_until)

---

#### payments

Direct payments between parents to settle balance.

| Column       | Type    | Constraints               | Description           |
| ------------ | ------- | ------------------------- | --------------------- |
| id           | TEXT    | PRIMARY KEY               | CUID-style ID         |
| family_id    | TEXT    | NOT NULL, FK families(id) | Parent family         |
| paid_by      | TEXT    | NOT NULL, FK users(id)    | Payer                 |
| amount_cents | INTEGER | NOT NULL, CHECK (>0)      | Amount in cents       |
| payment_date | TEXT    | NOT NULL                  | YYYY-MM-DD            |
| notes        | TEXT    |                           | Optional notes        |
| created_at   | TEXT    | NOT NULL, DEFAULT now     |                       |
| deleted_at   | TEXT    |                           | Soft delete timestamp |

**Indexes:**

- `idx_payments_family` on (family_id)
- `idx_payments_date` on (family_id, payment_date)

---

#### activity_events

Audit trail and activity feed.

| Column          | Type | Constraints               | Description                                |
| --------------- | ---- | ------------------------- | ------------------------------------------ |
| id              | TEXT | PRIMARY KEY               | CUID-style ID                              |
| family_id       | TEXT | NOT NULL, FK families(id) | Parent family                              |
| user_id         | TEXT | NOT NULL, FK users(id)    | Acting user                                |
| event_type      | TEXT | NOT NULL                  | e.g., expense.created                      |
| target_type     | TEXT | NOT NULL                  | expense/payment/child/fixed_expense/family |
| target_id       | TEXT | NOT NULL                  | ID of affected entity                      |
| before_snapshot | TEXT |                           | JSON of state before change                |
| after_snapshot  | TEXT |                           | JSON of state after change                 |
| metadata        | TEXT |                           | Additional JSON context                    |
| created_at      | TEXT | NOT NULL, DEFAULT now     |                                            |

**Indexes:**

- `idx_activity_family` on (family_id, created_at DESC)
- `idx_activity_target` on (target_type, target_id)

---

#### subscriptions

Pro tier subscription tracking.

| Column                 | Type | Constraints                            | Description              |
| ---------------------- | ---- | -------------------------------------- | ------------------------ |
| id                     | TEXT | PRIMARY KEY                            | CUID-style ID            |
| family_id              | TEXT | NOT NULL, FK families(id)              | Parent family            |
| status                 | TEXT | NOT NULL, DEFAULT 'active', CHECK enum | active/cancelled/expired |
| started_at             | TEXT | NOT NULL                               | Subscription start       |
| expires_at             | TEXT |                                        | Subscription end         |
| stripe_subscription_id | TEXT |                                        | Stripe sub ID            |
| created_at             | TEXT | NOT NULL, DEFAULT now                  |                          |
| updated_at             | TEXT | NOT NULL, DEFAULT now                  |                          |

**Indexes:**

- `idx_subscriptions_family` UNIQUE on (family_id)

---

#### pending_invites

Email-based invite tracking.

| Column        | Type | Constraints                             | Description                        |
| ------------- | ---- | --------------------------------------- | ---------------------------------- |
| id            | TEXT | PRIMARY KEY                             | CUID-style ID                      |
| family_id     | TEXT | NOT NULL, FK families(id)               | Target family                      |
| invited_by    | TEXT | NOT NULL, FK users(id)                  | Inviter                            |
| invited_email | TEXT | NOT NULL                                | Invitee email                      |
| invite_code   | TEXT | NOT NULL                                | 6-char code                        |
| status        | TEXT | NOT NULL, DEFAULT 'pending', CHECK enum | pending/accepted/expired/cancelled |
| sent_at       | TEXT | NOT NULL, DEFAULT now                   |                                    |
| expires_at    | TEXT | NOT NULL                                | Expiry timestamp                   |
| accepted_at   | TEXT |                                         | Acceptance timestamp               |
| created_at    | TEXT | NOT NULL, DEFAULT now                   |                                    |

**Indexes:**

- `idx_pending_invites_family` on (family_id)
- `idx_pending_invites_email` on (invited_email)
- `idx_pending_invites_code` on (invite_code)

---

#### fixed_expense_suggestions

Linking ad-hoc expenses to recurring templates (future feature).

| Column           | Type | Constraints                             | Description                       |
| ---------------- | ---- | --------------------------------------- | --------------------------------- |
| id               | TEXT | PRIMARY KEY                             | CUID-style ID                     |
| fixed_expense_id | TEXT | NOT NULL, FK fixed_expenses(id)         | Target template                   |
| expense_id       | TEXT | NOT NULL, FK expenses(id)               | Source expense                    |
| suggested_by     | TEXT | NOT NULL, FK users(id)                  | User who suggested                |
| suggestion_note  | TEXT |                                         | Explanation                       |
| status           | TEXT | NOT NULL, DEFAULT 'pending', CHECK enum | pending/accepted/rejected/ignored |
| resolved_at      | TEXT |                                         | Resolution timestamp              |
| created_at       | TEXT | NOT NULL, DEFAULT now                   |                                   |

**Indexes:**

- `idx_suggestions_fixed` on (fixed_expense_id)

---

### 11.3 Expense Status State Machine

```
                        EXPENSE STATUS STATE MACHINE

                              +----------+
                              |  posted  |
                              +----+-----+
                                   |
                      other parent questions
                                   |
                                   v
                            +-----------+
                            | questioned |
                            +-----+-----+
                                  |
                       creator resolves (4 actions)
                                  |
        +------------+------------+------------+------------+
        |            |            |            |            |
        v            v            v            v            |
  +-----------+  +--------+  +---------+  +----------+      |
  |pending_   |  |resolved|  |resolved_|  |resolved_ |      |
  |satisfaction|  |_personal|  |_deleted |  |(auto)   |      |
  +-----+-----+  +--------+  +---------+  +----------+      |
        |             |            |                        |
        |       (excluded from balance)                     |
        |                                                   |
        +-------- questioner satisfies --------+            |
        |                                      |            |
        v                                      |            |
  +---------+                                  |            |
  | resolved |<--------------------------------+            |
  +---------+                                               |
        |                                                   |
        +------------ 7-day timeout --------------+         |
                                                  |         |
                                                  v         |
                                        +------------------+|
                                        |resolved_creator_ ||
                                        |decided           ||
                                        +------------------+|
                                                            |
                                                            |
        [Alternative path: close without resolution]        |
        +---------------------------------------------------+
        |
        v
  +------------------+
  | closed_unresolved |
  +------------------+
       (excluded from balance)
```

#### Status Definitions

| Status                     | Description                                       | Included in Balance? |
| -------------------------- | ------------------------------------------------- | -------------------- |
| `posted`                   | Initial state, expense visible to both parents    | Yes                  |
| `questioned`               | Other parent has raised a question                | No                   |
| `pending_satisfaction`     | Creator responded, awaiting questioner acceptance | No                   |
| `resolved`                 | Questioner accepted creator's response            | Yes                  |
| `resolved_creator_decided` | 7-day timeout expired, auto-resolved              | Yes                  |
| `resolved_personal`        | Creator marked as personal (not shared)           | No                   |
| `resolved_deleted`         | Creator deleted the expense                       | No                   |
| `closed_unresolved`        | Escalated or abandoned dispute                    | No                   |

#### State Transitions

| From                 | To                       | Trigger                                | Actor         |
| -------------------- | ------------------------ | -------------------------------------- | ------------- |
| posted               | questioned               | POST /expenses/:id/question            | Other parent  |
| questioned           | pending_satisfaction     | POST /expenses/:id/resolve (keep/edit) | Creator       |
| questioned           | resolved_personal        | POST /expenses/:id/resolve (personal)  | Creator       |
| questioned           | resolved_deleted         | POST /expenses/:id/resolve (delete)    | Creator       |
| questioned           | closed_unresolved        | 30-day timeout                         | System        |
| pending_satisfaction | resolved                 | POST /expenses/:id/satisfy             | Questioner    |
| pending_satisfaction | resolved_creator_decided | 7-day timeout (on-read)                | System        |
| \*                   | closed_unresolved        | POST /expenses/:id/close-unresolved    | Either parent |

---

## 12. API Surface

### 12.1 Base Configuration

- **Base URL:** `https://ke-api.<account>.workers.dev` (production)
- **Local Dev:** `http://localhost:8787`
- **Content-Type:** `application/json`
- **Authentication:** JWT Bearer token (primary) or X-User-Id header (fallback, deprecated)

### 12.2 Authentication

```
Authorization: Bearer <clerk_jwt_token>

# Fallback (deprecated, for migration period)
X-User-Id: user_2abc123...
```

JWT verification:

1. Parse Authorization header
2. Decode JWT, extract `kid` from header
3. Fetch JWKS from Clerk (cached 1 hour)
4. Verify RS256 signature
5. Validate `exp`, `nbf` claims
6. Extract `sub` claim as user ID

### 12.3 Common Response Codes

| Code | Meaning                 |
| ---- | ----------------------- |
| 200  | Success                 |
| 201  | Created                 |
| 400  | Validation error        |
| 401  | Authentication required |
| 403  | Authorization denied    |
| 404  | Resource not found      |
| 500  | Server error            |

### 12.4 Endpoint Reference

---

#### GET /health

Health check endpoint.

**Auth:** None

**Response:**

```typescript
{
  status: 'ok' | 'error'
  db: 'connected' | 'disconnected' | 'error'
}
```

---

#### GET /me

Get current user info with family context.

**Auth:** Required

**Response:**

```typescript
{
  user: {
    id: string
    email: string
    name: string | null
    created_at: string
  }
  family: Family | null
  role: 'parent_a' | 'parent_b' | null
}
```

---

#### POST /users/sync

Sync user from Clerk (called by webhook or frontend).

**Auth:** None (trusted source only)

**Request:**

```typescript
{
  id: string;      // Clerk user ID
  email: string;
  name?: string;
}
```

**Response:**

```typescript
{
  success: true
  user: User
}
```

---

#### POST /families

Create a new family.

**Auth:** Required

**Request:**

```typescript
{
  name?: string;  // Optional family name
}
```

**Response (201):**

```typescript
{
  success: true
  family: Family
}
```

**Errors:**

- 400: User already belongs to a family
- 404: User not found

---

#### GET /families/:id

Get family details with parent info.

**Auth:** Required (must be family member)

**Response:**

```typescript
{
  family: Family
  parentA: User
  parentB: User | null
}
```

---

#### PATCH /families/:id

Update family settings.

**Auth:** Required (must be family member)

**Request:**

```typescript
{
  parentARatio?: number;  // 0.0 - 1.0
  name?: string;
}
```

**Response:**

```typescript
{
  success: true
  family: Family
}
```

**Errors:**

- 400: parentARatio out of range

---

#### POST /families/:id/invite

Generate invite code.

**Auth:** Required (must be parent_a)

**Response:**

```typescript
{
  success: true
  inviteCode: string // 6-char uppercase
  expiresAt: string // ISO 8601
}
```

**Errors:**

- 400: Family already has two parents
- 403: Only family creator can generate codes

---

#### POST /families/:id/invite/email

Send email invite.

**Auth:** Required (must be parent_a)

**Request:**

```typescript
{
  email: string
}
```

**Response:**

```typescript
{
  success: true
  inviteCode: string
  inviteLink: string
  expiresAt: string
  emailSent: boolean
}
```

---

#### GET /families/:id/invites

List pending invites.

**Auth:** Required (must be family member)

**Response:**

```typescript
{
  invites: Array<PendingInvite & { is_expired: boolean }>
}
```

---

#### DELETE /families/:id/invites/:inviteId

Cancel a pending invite.

**Auth:** Required (must be parent_a)

**Response:**

```typescript
{
  success: true
}
```

---

#### POST /families/join

Join a family with invite code.

**Auth:** Required

**Request:**

```typescript
{
  inviteCode: string
}
```

**Response:**

```typescript
{
  success: true
  family: Family
}
```

**Errors:**

- 400: Invalid/expired code, already in family, or family full

---

#### POST /families/:id/expenses

Create an expense.

**Auth:** Required (must be family member)

**Request:**

```typescript
{
  description: string;        // 1-200 chars
  amount: number;             // dollars (converted to cents)
  category: "school" | "medical" | "activities" | "childcare" | "other";
  expenseDate?: string;       // YYYY-MM-DD, defaults to today
  paidBy?: string;            // user ID, defaults to current user
  linkUrl?: string;
  memo?: string;              // max 500 chars
  childIds?: string[];
}
```

**Response (201):**

```typescript
{
  success: true
  expense: Expense
}
```

---

#### GET /families/:id/expenses

List expenses with filtering.

**Auth:** Required (must be family member)

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter by status |
| category | string | Filter by category |
| startDate | string | YYYY-MM-DD |
| endDate | string | YYYY-MM-DD |
| limit | number | Default 50 |
| offset | number | Default 0 |

**Response:**

```typescript
{
  expenses: Expense[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}
```

---

#### GET /families/:id/balance

Get current balance with breakdown.

**Auth:** Required (must be family member)

**Response:**

```typescript
{
  balance_cents: number // Absolute value
  payer_id: string | null // Who owes
  payee_id: string | null // Who is owed
  parent_a_id: string
  parent_b_id: string | null
  breakdown: {
    total_expenses_cents: number
    included_expenses_count: number
    a_share_cents: number
    b_share_cents: number
    a_paid_cents: number
    b_paid_cents: number
    payments_a_to_b_cents: number
    payments_b_to_a_cents: number
    questioned_total_cents: number
    questioned_count: number
  }
  period: {
    start: string
    end: string
    label: string
  }
  current_period: {
    a_expenses_cents: number
    a_payments_cents: number
    b_expenses_cents: number
    b_payments_cents: number
  }
  prior_balance: {
    balance_cents: number
    payer_id: string | null
    payee_id: string | null
  }
}
```

---

#### GET /expenses/:id

Get single expense (with timeout check).

**Auth:** Required (must be family member)

**Response:**

```typescript
{
  expense: Expense
}
```

---

#### POST /expenses/:id/question

Question an expense.

**Auth:** Required (must be other parent, not creator)

**Request:**

```typescript
{
  reason: "wrong_amount" | "not_child_related" | "duplicate" | "split_dispute" | "other";
  note?: string;
}
```

**Response:**

```typescript
{
  success: true
  expense: Expense
}
```

**Errors:**

- 400: Cannot question own expense, or not in `posted` status

---

#### POST /expenses/:id/resolve

Resolve a questioned expense.

**Auth:** Required (must be expense creator)

**Request:**

```typescript
{
  action: "keep" | "edit" | "personal" | "delete";
  newAmount?: number;  // Required if action is "edit"
}
```

**Response:**

```typescript
{
  success: true
  expense: Expense
}
```

**Errors:**

- 400: Not in `questioned` status

---

#### POST /expenses/:id/satisfy

Accept expense resolution.

**Auth:** Required (must be original questioner)

**Response:**

```typescript
{
  success: true
  expense: Expense
}
```

**Errors:**

- 400: Not in `pending_satisfaction` status

---

#### POST /families/:id/payments

Record a payment.

**Auth:** Required (must be family member)

**Request:**

```typescript
{
  amount: number;           // dollars
  paymentDate?: string;     // YYYY-MM-DD, defaults to today
  notes?: string;
}
```

**Response (201):**

```typescript
{
  success: true
  payment: Payment
}
```

---

#### GET /families/:id/payments

List payments.

**Auth:** Required (must be family member)

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| limit | number | Default 50 |
| offset | number | Default 0 |

**Response:**

```typescript
{
  payments: Payment[];
  pagination: { total: number; limit: number; offset: number };
}
```

---

#### POST /families/:id/children

Add a child.

**Auth:** Required (must be family member)

**Request:**

```typescript
{
  name: string // 1-100 chars
}
```

**Response (201):**

```typescript
Child
```

---

#### GET /families/:id/children

List children.

**Auth:** Required (must be family member)

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| include_deleted | boolean | Include soft-deleted |

**Response:**

```typescript
{
  children: Child[];
  count: number;
}
```

---

#### DELETE /families/:id/children/:childId

Soft-delete a child.

**Auth:** Required (must be family member)

**Response:**

```typescript
{
  id: string
  deleted_at: string
}
```

---

#### POST /families/:id/fixed-expenses

Create fixed expense template.

**Auth:** Required (must be family member)

**Request:**

```typescript
{
  description: string;
  amount: number;
  category: ExpenseCategory;
  frequency?: "weekly" | "biweekly" | "monthly" | "quarterly" | "annually";
  effectiveFrom: string;    // YYYY-MM-DD
  effectiveUntil?: string;
  linkUrl?: string;
  memo?: string;
}
```

**Response (201):**

```typescript
{
  success: true
  fixedExpense: FixedExpense
}
```

**Errors:**

- 403: Tier limit reached (Free tier: 2 max)

---

#### GET /families/:id/fixed-expenses

List fixed expenses.

**Auth:** Required (must be family member)

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| includeEnded | boolean | Include past-effective templates |

**Response:**

```typescript
{
  fixedExpenses: FixedExpense[];
  count: number;
  tier: {
    current: number;
    limit: number;  // -1 for unlimited
    canAdd: boolean;
  };
}
```

---

#### PATCH /families/:id/fixed-expenses/:fixedExpenseId

Update fixed expense.

**Auth:** Required (must be family member)

**Request:**

```typescript
{
  description?: string;
  amount?: number;
  category?: ExpenseCategory;
  frequency?: RecurringFrequency;
  effectiveUntil?: string | null;
  linkUrl?: string | null;
  memo?: string | null;
}
```

**Response:**

```typescript
{
  success: true
  fixedExpense: FixedExpense
}
```

---

#### DELETE /families/:id/fixed-expenses/:fixedExpenseId

End a fixed expense (sets effective_until to today).

**Auth:** Required (must be family member)

**Response:**

```typescript
{
  success: true
  fixedExpense: FixedExpense
}
```

---

#### GET /families/:id/activity

Get activity feed.

**Auth:** Required (must be family member)

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| type | string | Filter: expenses/payments/fixed_expenses/disputes/children |
| search | string | Search in snapshots |
| startDate | string | YYYY-MM-DD |
| endDate | string | YYYY-MM-DD |
| limit | number | 1-100, default 20 |
| offset | number | Default 0 |
| expense_id | string | Scope to single expense |

**Response:**

```typescript
{
  events: ActivityEvent[];
  pagination: { total: number; limit: number; offset: number };
}
```

---

### 12.5 Rate Limiting Strategy

Currently no rate limiting implemented. Future strategy:

| Tier | Requests/min | Burst |
| ---- | ------------ | ----- |
| Free | 60           | 10    |
| Pro  | 300          | 50    |

Implementation approach:

- Use Cloudflare Rate Limiting rules (at edge)
- Or implement token bucket in KV/D1
- Key by user ID (from JWT sub claim)

---

## 13. Non-Functional Requirements

### 13.1 Performance Targets

| Metric          | Target | Current Baseline     |
| --------------- | ------ | -------------------- |
| API p50 latency | <50ms  | ~30ms (Workers cold) |
| API p95 latency | <200ms | ~100ms               |
| API p99 latency | <500ms | ~250ms               |
| D1 query time   | <20ms  | ~10-15ms             |
| TTFB (frontend) | <100ms | ~60ms (Vercel Edge)  |
| LCP             | <2.5s  | Varies by page       |
| FID             | <100ms | <50ms                |
| CLS             | <0.1   | <0.05                |

### 13.2 Availability

| Requirement                    | Target                       |
| ------------------------------ | ---------------------------- |
| Uptime SLA                     | 99.9% (Cloudflare Workers)   |
| RTO (Recovery Time Objective)  | <15 minutes                  |
| RPO (Recovery Point Objective) | <1 hour                      |
| Maintenance windows            | None (zero-downtime deploys) |

### 13.3 Scalability

| Dimension               | Capacity                     |
| ----------------------- | ---------------------------- |
| Concurrent users        | 10,000+ (Workers auto-scale) |
| Requests/second         | 100,000+ (Workers limit)     |
| D1 database size        | 10GB (current limit)         |
| D1 rows                 | Unlimited within size        |
| Families per deployment | 100,000+                     |

### 13.4 Data Retention

| Data Type            | Retention           | Rationale            |
| -------------------- | ------------------- | -------------------- |
| Active expenses      | Indefinite          | Historical reference |
| Soft-deleted records | 90 days             | Recovery period      |
| Activity events      | 2 years             | Audit compliance     |
| Session tokens       | Until expiry        | Security             |
| Invite codes         | 7 days after expiry | Cleanup              |

### 13.5 Backup Strategy

| Component        | Strategy             | Frequency     | Retention |
| ---------------- | -------------------- | ------------- | --------- |
| D1 Database      | Cloudflare automatic | Point-in-time | 30 days   |
| D1 Manual backup | Export via API       | Weekly        | 90 days   |
| Configuration    | Git (wrangler.toml)  | Every deploy  | Forever   |
| Secrets          | Cloudflare dashboard | Manual        | N/A       |

**D1 Backup Commands:**

```bash
# Export database
wrangler d1 export ke-main --remote --output backup.sql

# Time-travel query (30-day window)
wrangler d1 time-travel ke-main --timestamp "2024-01-15T10:00:00Z"
```

### 13.6 Security Requirements

#### Authentication & Authorization

- [x] Clerk JWT verification with RS256
- [x] JWKS caching with 1-hour TTL
- [x] Family membership verification on all routes
- [x] Creator/questioner role checks for expense actions
- [ ] Rate limiting (planned)

#### Data Protection

- [x] All traffic over HTTPS (Cloudflare enforced)
- [x] Parameterized queries (SQL injection prevention)
- [x] Input validation on all endpoints
- [x] No PII in logs (user IDs only)
- [ ] Encryption at rest (D1 roadmap)

#### Secrets Management

- [x] Environment variables via `wrangler secret`
- [x] No secrets in codebase
- [x] Separate secrets per environment

#### Headers

```typescript
// CORS configuration
cors({
  origin: (origin) => {
    const allowed = ['https://ke-console.vercel.app', 'http://localhost:3000']
    if (origin?.endsWith('.vercel.app')) return origin // Preview deploys
    return allowed.includes(origin ?? '') ? origin! : null
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
})
```

### 13.7 Compliance Considerations

| Requirement        | Status        | Notes                                |
| ------------------ | ------------- | ------------------------------------ |
| GDPR (if EU users) | Partial       | Need data export/delete flows        |
| CCPA (if CA users) | Partial       | Need privacy policy updates          |
| SOC 2              | N/A           | Inherited from Cloudflare/Vercel     |
| PCI DSS            | N/A           | No card data stored (Stripe handles) |
| COPPA              | Review needed | App involves child data              |

---

## 14. Platform & Accessibility

### 14.1 Responsive Breakpoints

| Breakpoint       | Width          | Layout Behavior                                 |
| ---------------- | -------------- | ----------------------------------------------- |
| Mobile (default) | < 640px        | Single column, bottom nav, stacked cards        |
| Tablet           | 640px - 1024px | Wider content area, same nav pattern            |
| Desktop          | > 1024px       | Centered content (max 640px), optional side nav |

**Mobile-First Principle:** Design for mobile, then adapt up. The core experience is on a phone at pickup/dropoff or while logging receipts.

### 14.2 Touch Targets

All interactive elements must meet minimum touch target sizes:

| Element            | Minimum Size        | Notes                                  |
| ------------------ | ------------------- | -------------------------------------- |
| Buttons            | 44px x 44px         | Per Apple HIG                          |
| List rows          | 48px height minimum | Per Material guidelines                |
| Icons (standalone) | 44px touch area     | Visual can be smaller, tap area padded |
| Form inputs        | 48px height         | Includes padding                       |
| Bottom nav items   | 48px x 48px minimum | Full-width bar                         |

### 14.3 Color Contrast Requirements

All text must meet WCAG 2.1 AA contrast requirements:

| Element                          | Contrast Requirement | Minimum Ratio |
| -------------------------------- | -------------------- | ------------- |
| Body text                        | Normal text          | 4.5:1         |
| Large text (18px+ or 14px+ bold) | Large text           | 3:1           |
| Status badge text                | On badge background  | 4.5:1         |
| Icons (informational)            | Against background   | 3:1           |
| Focus indicators                 | Against background   | 3:1           |

**Status Badge Contrast Verification:**

| Status           | Background | Text        | Ratio | Pass? |
| ---------------- | ---------- | ----------- | ----- | ----- |
| Posted           | Emerald-50 | Emerald-700 | 5.2:1 | Yes   |
| Questioned       | Amber-50   | Amber-700   | 4.8:1 | Yes   |
| Pending          | Indigo-50  | Indigo-700  | 5.1:1 | Yes   |
| Closed           | Red-50     | Red-700     | 5.5:1 | Yes   |
| Personal/Deleted | Slate-100  | Slate-600   | 4.6:1 | Yes   |

### 14.4 Screen Reader Considerations

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

### 14.5 Reduced Motion Support

Respect user's motion preferences via `prefers-reduced-motion` media query.

**When reduced motion is enabled:**

- Disable transitions and animations
- Instant state changes instead of animated transitions
- Loading spinners become static progress indicators
- No auto-scrolling; user controls all scrolling

**CSS Implementation:**

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 15. Pricing Strategy

### 15.1 Tier Comparison

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

### 15.2 Pricing Rationale

**$5/month was chosen because:**

1. **Accessibility:** Co-parents facing divorce/separation often have financial strain. $5 is low enough that both parents can reasonably afford it, and one parent upgrading benefits both.
2. **Psychological threshold:** $5 feels like a "cup of coffee" - an easy impulse decision rather than a budget line item.
3. **Per-family, not per-user:** One Pro subscription covers the entire family ledger. Both parents benefit when either one subscribes.
4. **Monthly, not annual:** Co-parenting situations can change. Monthly billing respects that reality.

**No annual discount initially:** We do not offer annual plans at launch because (a) we need monthly churn data to understand retention, and (b) annual plans create refund complexity for a small team.

### 15.3 Competitive Context

| App                 | Free Tier     | Entry Paid | Mid Tier | Premium   |
| ------------------- | ------------- | ---------- | -------- | --------- |
| **KE**              | Yes (limited) | $5/mo      | -        | -         |
| **OurFamilyWizard** | No            | $12.50/mo  | $18/mo   | $24.99/mo |
| **TalkingParents**  | Yes (web)     | $6/mo      | $10/mo   | $25/mo    |
| **DComply**         | Trial only    | $2.99/mo   | $5.99/mo | -         |
| **AppClose**        | 60-day trial  | $8.99/mo   | -        | -         |
| **2Houses**         | 14-day trial  | $7/mo      | -        | -         |
| **Cent**            | Yes (full)    | -          | -        | -         |

**KE at $5/mo is competitively positioned:**

- Below OFW ($12.50-25) - The market leader charges 2.5-5x more
- At DComply Premium ($5.99) - Closest expense-focused competitor
- Below AppClose ($8.99) - The rising "all-in-one" threat
- Competes with Cent - Must win on features since Cent is free

### 15.4 Conversion Triggers

Free users are most likely to convert when they:

1. **Hit the 3-month history wall:** Trying to reference an old expense for tax purposes or a disagreement
2. **Need a third recurring expense:** School tuition, after-school care, and activity fees exceed the 2-template limit
3. **Need to export for legal/tax purposes:** Divorce proceedings, tax documentation, mediation sessions
4. **Add receipt images:** Visual documentation of expenses (v1.1 feature)

### 15.5 Upgrade UX

- Upgrade prompts appear contextually (e.g., when trying to add a 3rd recurring expense)
- No interstitials, pop-ups, or aggressive upselling
- Upgrade/downgrade is self-service, immediate, and reversible
- Downgrade does not delete data; it restricts access to older history

### 15.6 Future Pricing Considerations

- **Family Pro ($8/month):** Include co-parent subscription to reduce adoption friction (2Houses model)
- **Mediator tier:** If therapist/mediator view launches in v2, separate pricing for professional access

---

## 16. Success Metrics & Kill Criteria

### 16.1 Primary KPIs

| Metric                          | Definition                                                               | Target | Timeframe |
| ------------------------------- | ------------------------------------------------------------------------ | ------ | --------- |
| Weekly Active Families (WAF)    | Families with at least one expense or payment logged in the past 7 days  | 500    | Month 6   |
| Monthly Active Families (MAF)   | Families with at least one expense or payment logged in the past 30 days | 1,000  | Month 6   |
| Paid Conversion Rate            | % of families with at least one Pro subscription                         | 5%     | Month 6   |
| Monthly Recurring Revenue (MRR) | Total monthly subscription revenue                                       | $250   | Month 6   |

### 16.2 Secondary KPIs

| Metric                      | Definition                                                                   | Target   | Timeframe |
| --------------------------- | ---------------------------------------------------------------------------- | -------- | --------- |
| Onboarding Completion Rate  | % of signups that create a family and invite a partner                       | 40%      | Month 3   |
| Partner Join Rate           | % of invites that result in the other parent joining                         | 30%      | Month 3   |
| Questioning Resolution Rate | % of questioned expenses that reach a resolved state (not closed_unresolved) | 80%      | Month 3   |
| Time to Resolution          | Median days from questioned to resolved                                      | < 5 days | Month 3   |
| Churn Rate (Pro)            | % of Pro subscribers who cancel in a given month                             | < 10%    | Month 6   |

### 16.3 Leading Indicators (Weekly Tracking)

- New family signups
- Expenses created
- Payments recorded
- Questions initiated
- Resolutions completed
- Pro trial starts (if applicable)

### 16.4 Kill Criteria

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

## 17. Risks & Mitigations

### 17.1 Product Risks

| Risk                                | Likelihood | Impact   | Mitigation                                                                                                                                 |
| ----------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Only one parent uses the app        | High       | Critical | Solo mode must be valuable on its own (personal expense tracking). Remind solo users to invite partner. Consider value-add for solo users. |
| Questioning workflow is too complex | Medium     | High     | Extensive user testing during beta. Provide in-app guidance. Consider simplified "accept/reject" mode for v1.1.                            |
| Users abandon after setup           | Medium     | High     | Onboarding wizard with immediate value demonstration. Email/push reminders for first expense.                                              |
| Emotional context makes UX hostile  | Medium     | Medium   | Language review with divorce counselor. Neutral terminology (Design Charter). Avoid any language that implies fault.                       |

### 17.2 Market Risks

| Risk                                | Likelihood | Impact | Mitigation                                                                                                                     |
| ----------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Competitors launch similar product  | Medium     | Medium | Speed to market. Focus on workflow quality over feature quantity. Build switching costs through audit trail value.             |
| Venmo/Zelle adds expense tracking   | Low        | High   | Differentiate on questioning workflow (they won't build dispute resolution). Emphasize neutrality (they favor the payer).      |
| Target market smaller than expected | Medium     | Medium | Validate with divorce statistics. Track family creation rates. Consider adjacent markets (unmarried co-parents, grandparents). |
| Negative association with divorce   | Low        | Medium | Position as "for parents who share expenses" not "for divorced parents." Emphasize conflict reduction, not divorce tooling.    |

### 17.3 Technical Risks

| Risk                           | Likelihood | Impact   | Mitigation                                                                                                |
| ------------------------------ | ---------- | -------- | --------------------------------------------------------------------------------------------------------- |
| D1 database size limit (10GB)  | Low        | High     | Monitor size; implement archival strategy for old activity_events                                         |
| D1 no transactions             | Medium     | Medium   | Use D1 `batch()` for atomic multi-statement ops                                                           |
| Balance calculation bugs       | Medium     | Critical | Extensive unit tests for calculation module. All money as integers (cents). Automated regression testing. |
| 7-day timeout cron reliability | Medium     | Medium   | Multiple fallback mechanisms. Check timeout on read, not just cron. Alert on missed transitions.          |
| JWT key compromise             | Low        | Critical | JWKS rotation by Clerk; short token expiry                                                                |
| SQL injection                  | Low        | Critical | All queries use `.bind()`; no string concatenation                                                        |

### 17.4 Operational Risks

| Risk                                   | Likelihood | Impact | Mitigation                                                                                                    |
| -------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| Support burden from emotional users    | High       | Medium | Self-service first. FAQ covering common disputes. Clear "we don't mediate" policy. Escalation path for abuse. |
| Legal liability from disputed expenses | Low        | High   | Terms of Service explicitly disclaim KE as legal record. No legal advice. Encourage professional mediators.   |
| GDPR/privacy compliance                | Medium     | Medium | Minimal data collection. Clear privacy policy. Data export and deletion flows.                                |

---

## 18. Open Decisions / ADRs

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

## 19. Phased Development Plan

### 19.1 Phase 1: MVP (Current - Target: March 2026)

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

### 19.2 Phase 2: Engagement & Retention (Target: June 2026)

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

### 19.3 Phase 3: Expansion & Scale (Target: October 2026)

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

### 19.4 Beyond Phase 3 (2027+)

Potential directions pending Phase 3 learnings:

- **Native mobile apps** if PWA engagement is insufficient
- **Custody calendar integration** if there's clear demand
- **B2B channel** (family law firms, mediators) if professional use emerges
- **International expansion** if US market proves viable
- **Family budgeting features** if users request proactive planning

---

## 20. Glossary

**Activity Event**
An immutable log entry recording a specific action (mutation) in the system. Contains actor, timestamp, event_type, target entity, and optional before/after snapshots.

**Balance (Net Balance)**
The cumulative amount owed between two co-parents, calculated from all included expenses minus payments. Positive = Parent A owes Parent B; Negative = Parent B owes Parent A; Zero = settled.

**Category**
A classification for an expense. Required field. Options: school, medical, activities, childcare, other.

**Cents**
Integer representation of money. All monetary values are stored as cents (not dollars) to avoid floating-point precision errors. Example: $45.67 = 4567 cents.

**Child Association**
Optional linkage between an expense and one or more children in the family. Used for filtering and per-child expense tracking.

**Closed Unresolved**
A terminal expense status indicating a questioned expense that was never resolved by the creator within 30 days. Permanently excluded from balance.

**Co-Parent**
One of two parents in a family who share custody and financial responsibility for child-related expenses. Also referred to as "Other Parent" in UI.

**Creator**
The parent who created a specific expense. Has exclusive authority to edit, delete, and resolve that expense.

**Excluded Expense**
An expense that does not count toward the net balance. Statuses: questioned, pending_satisfaction, resolved_personal, resolved_deleted, closed_unresolved.

**Expense**
A record of a child-related expenditure. Contains: description, amount, category, paid_by, expense_date, status, and optional memo, children, and receipt link.

**Family**
A two-parent unit sharing a ledger. Consists of parent_a, parent_b, and a configurable split ratio.

**Fixed Monthly Expense (Recurring Expense)**
A template that automatically generates a new expense at a specified frequency (e.g., monthly on the 1st). Used for predictable recurring costs like tuition or daycare.

**Free Tier**
The no-cost subscription level. Limits: 3-month history, max 2 fixed expenses, no CSV export.

**Included Expense**
An expense that counts toward the net balance. Statuses: posted, resolved, resolved_creator_decided.

**Ledger**
The chronological list of all expenses in a family, viewable by both parents.

**Memo**
An optional text field on an expense for additional context (max 500 characters).

**Other Parent**
The parent who did not create a given expense. Has view-only access to the expense but can question it.

**Paid By**
The parent who actually paid for an expense at the time of purchase. Defaults to the creator but can be specified otherwise.

**Parent A / Parent B**
The two roles in a family. Parent A is the family creator (parent_a_id); Parent B is the invited co-parent (parent_b_id). Used for balance direction and share calculation.

**parent_a_ratio**
A decimal (0.0 to 1.0) representing Parent A's share of expenses. Example: 0.60 = 60% Parent A, 40% Parent B. Stored on the family record.

**Payment**
A record of an external money transfer (Venmo, Zelle, cash, check) between co-parents. Reduces the net balance.

**Pending Satisfaction**
An expense status indicating the creator has resolved a question with "keep" or "edit", and the resolution is awaiting questioner confirmation. Excluded from balance.

**Posted**
The initial expense status after creation. Included in balance. Can be edited or deleted by creator, or questioned by other parent.

**Pro Tier**
The paid subscription level ($5/month). Unlimited history, unlimited fixed expenses, CSV export.

**Question**
An action by the other parent to challenge a posted expense. Moves status to "questioned" and excludes expense from balance.

**Question Reason**
The rationale for questioning an expense. Options: wrong_amount, not_child_related, duplicate, split_dispute, other.

**Questioner**
The parent who questioned an expense. Has authority to satisfy a resolution.

**Resolution**
The creator's response to a questioned expense. Actions: keep (original), edit (amount), mark personal, delete.

**Resolution Action**
The specific action chosen during resolution: "keep", "edit", "personal", or "delete".

**Resolved**
A terminal expense status indicating the questioner has confirmed the creator's resolution (satisfaction). Included in balance.

**Resolved Creator Decided**
A terminal expense status reached via 7-day timeout from pending_satisfaction. Creator's resolution stands without questioner confirmation. Included in balance.

**Resolved Deleted**
A terminal expense status indicating the creator acknowledged the expense as invalid during resolution. Soft delete (visible in history). Permanently excluded from balance.

**Resolved Personal**
A terminal expense status indicating the creator acknowledged the expense as personal (not child-related) during resolution. Permanently excluded from balance.

**Rolling Balance**
The continuously updated net balance reflecting all included expenses and payments in real-time.

**Satisfaction**
The questioner's confirmation that a resolution is acceptable. Transitions expense from pending_satisfaction to resolved.

**Share**
The portion of an expense amount allocated to one parent based on the split ratio. Calculated as integers (cents) using floor() for Parent A and remainder for Parent B.

**Split Ratio**
The percentage breakdown of expense responsibility between Parent A and Parent B. Configured at the family level (default 50/50).

**Status**
The current state of an expense in the questioning workflow. Eight possible values: posted, questioned, pending_satisfaction, resolved, resolved_creator_decided, resolved_personal, resolved_deleted, closed_unresolved.

**Status Badge**
UI indicator showing an expense's current status (e.g., "Posted", "Questioned", "Resolved").

**Terminal Status**
An expense status from which no further transitions are possible. Terminal statuses: resolved, resolved_creator_decided, resolved_personal, resolved_deleted, closed_unresolved.

**Timeout**
System-triggered status transition after a time threshold. 7-day timeout: pending_satisfaction -> resolved_creator_decided. 30-day timeout: questioned -> closed_unresolved.

**Template**
A fixed monthly expense definition used to auto-generate recurring expenses. Contains same fields as a regular expense but generates new instances on schedule.

**Tier**
Subscription level: Free or Pro. Determines feature access and limits.

**Two-Parent Ledger**
The shared expense tracking system where either parent can add expenses but only the creator can edit/delete them. All changes are visible to both parents.

---

## Appendices

### Appendix A: Dispute Flow Diagram

```
               ┌─────────┐
               │ posted  │ ◄─── Initial state (newly created expense)
               └────┬────┘
                    │
                    │ [question by other parent]
                    ▼
              ┌──────────┐
              │questioned│
              └────┬─────┘
                   │
                   │ [30 days elapsed] ────────► closed_unresolved (TERMINAL)
                   │
                   │ [resolve by creator]
                   ▼
         ┌─────────┴──────────┐
         │                    │
   [action=keep/edit]   [action=personal/delete]
         │                    │
         ▼                    ▼
   ┌──────────────────┐  ┌─────────────────┐
   │pending_satisfaction│  │resolved_personal│ (TERMINAL)
   └──────┬────────────┘  │resolved_deleted │ (TERMINAL)
          │               └─────────────────┘
          │
          │ [satisfy by questioner]
          │ [OR 7 days elapsed]
          ▼
    ┌──────────┐
    │ resolved │ (TERMINAL)
    │resolved_ │
    │creator_  │
    │decided   │ (TERMINAL after 7-day timeout)
    └──────────┘
```

**State Definitions:**

| Status                       | In Balance? | Transition                                              |
| ---------------------------- | ----------- | ------------------------------------------------------- |
| **posted**                   | Yes         | Other parent questions -> questioned                    |
| **questioned**               | No          | Creator resolves with keep/edit -> pending_satisfaction |
|                              |             | Creator resolves with personal -> resolved_personal     |
|                              |             | Creator resolves with delete -> resolved_deleted        |
|                              |             | 30 days elapse -> closed_unresolved                     |
| **pending_satisfaction**     | No          | Questioner satisfies -> resolved                        |
|                              |             | 7 days elapse -> resolved_creator_decided               |
| **resolved**                 | Yes         | (terminal)                                              |
| **resolved_creator_decided** | Yes         | (terminal)                                              |
| **resolved_personal**        | No          | (terminal)                                              |
| **resolved_deleted**         | No          | (terminal)                                              |
| **closed_unresolved**        | No          | (terminal)                                              |

---

### Appendix B: Balance Calculation Example

**Scenario:** 60/40 split (Parent A = 60%, Parent B = 40%)

**Expenses:**
| Description | Amount | Paid By | Status | Included? |
|-------------|--------|---------|--------|-----------|
| Soccer cleats | $100.00 | Parent A | posted | Yes |
| School lunch (Jan) | $45.00 | Parent A | resolved | Yes |
| Birthday party | $150.00 | Parent B | questioned | No |
| Tutor (Feb) | $200.00 | Parent B | posted | Yes |

**Included expenses total:** $100 + $45 + $200 = $345.00 (34,500 cents)

**Share calculation for each included expense:**

| Expense       | Total (cents) | A Share (60%)                | B Share (40%)         |
| ------------- | ------------- | ---------------------------- | --------------------- |
| Soccer cleats | 10,000        | floor(10000 \* 0.6) = 6,000  | 10000 - 6000 = 4,000  |
| School lunch  | 4,500         | floor(4500 \* 0.6) = 2,700   | 4500 - 2700 = 1,800   |
| Tutor         | 20,000        | floor(20000 \* 0.6) = 12,000 | 20000 - 12000 = 8,000 |
| **Totals**    | 34,500        | 20,700                       | 13,800                |

**Payment tracking:**

| Expense       | Paid By | A Paid | B Paid |
| ------------- | ------- | ------ | ------ |
| Soccer cleats | A       | 10,000 | 0      |
| School lunch  | A       | 4,500  | 0      |
| Tutor         | B       | 0      | 20,000 |
| **Totals**    |         | 14,500 | 20,000 |

**Balance calculation:**

```
A's net = A_paid - A_share = 14,500 - 20,700 = -6,200 (A underpaid)
B's net = B_paid - B_share = 20,000 - 13,800 = +6,200 (B overpaid)

Net balance = A's net = -6,200 cents = -$62.00
```

**Result:** Parent A owes Parent B $62.00

**Payments applied:**
If Parent A sends Parent B $62.00:

- Net balance = -6,200 + 6,200 = 0 cents
- Display: "All settled up!"

---

### Appendix C: Customer Voice

**Profile:** Sarah, 38, divorced 2 years, two kids (8 and 11), 50/50 custody, currently using Google Sheets

#### Key Quotes on Adoption Barriers

> "I just want a neutral third party that says 'here's what's owed' so I'm not the bad guy asking for money."

> "I'm not trying to nickel-and-dime. I just want to know what I'm paying for. Is that so unreasonable?"

> "I don't want this to become another thing we fight about. I need something that just... works, without drama."

> "If it takes more than 10 minutes to set up and add my first few expenses, I'm out. I'm busy."

#### The Co-Parent Adoption Problem

Typical conversation pattern:

> Me: "Hey, I found this app that could help us track expenses better."
> Him: "The Google Sheet is fine."
> Me: "You haven't updated it in three weeks."
> Him: "I've been busy. I'll update it this weekend."
> (He doesn't update it.)

Alternative scenario:

> Him: "Why do you need an app? Are you saying you don't trust me?"
> Me: "It's not about trust, it's about having everything in one place."
> Him: "Sounds like you're trying to control how I spend money on the kids."

#### Emotional/Social Barriers

- Suggesting a new system implies the current system is broken, which implies blame
- It costs money, which means one of us has to pay (or we split it, which requires agreement)
- It requires both people to change their behavior, which is hard
- It creates a permanent record, which some people find threatening
- It might feel like "over-engineering" a simple problem to people who don't experience the conflict

#### Feature Reactions

**What excites:**

> "The rolling balance is HUGE. I'm so tired of doing mental math every time we settle up."

> "The payment recording feature is really appealing. Right now when my ex Venmos me, I have no idea what it's for."

**What concerns:**

> "The 8-status workflow sounds complicated. I read through it twice and I'm still not 100% clear."

> "The 7-day auto-resolution thing makes me nervous - what if I'm on vacation and miss it?"

**On terminology:**

> "'Questioned' feels softer. 'Disputed' sounds legal and adversarial. I appreciate the choice of words."

**On pricing:**

> "$5/mo feels fair IF my ex also pays, so it's $2.50/month each."

> "2 recurring expenses max is so limiting it feels like a trap. I'd need at least 5 to make this work for my actual life."

#### Deal-Breakers

1. If it's not mobile-first (logging expenses in the Target parking lot)
2. If my co-parent can edit or delete expenses retroactively without my knowledge
3. If it's buggy with money math - balance must be perfect, always
4. If notifications are broken and I miss a 7-day timeout
5. If the free tier is so limited that I can't actually evaluate whether this works

#### What Might Work for Adoption

- If a mediator or therapist suggested it (neutral third party)
- If it had a "try it solo" mode where I could import our Google Sheet and show him a working balance to prove value
- If there was a "read-only guest access" where he could see the balance without committing to logging expenses yet

---

### Appendix D: Business Rules Reference

#### Authorization & Permissions

**BR-001: Family Membership Requirement**
A user must be a member of exactly one family to access any family-related features. Users not in a family are redirected to family creation.

**BR-002: Expense Creator Permissions**
Only the creator of an expense can edit or delete it, and only when the expense status is "posted". Once questioned, the creator loses edit/delete privileges.

**BR-003: Other Parent Permissions**
The parent who did not create an expense can view it but cannot edit or delete it. They can only question it if status is "posted".

**BR-004: Question Authority**
Only the parent who did not create an expense can question it. The creator cannot question their own expense.

**BR-005: Resolution Authority**
Only the expense creator can resolve a questioned expense. The questioner cannot resolve.

**BR-006: Satisfaction Authority**
Only the questioner can satisfy a resolution (move from "pending_satisfaction" to "resolved"). The creator cannot satisfy their own resolution.

**BR-007: Template Modification Authority**
Both parents can view fixed expense templates, but only the creator can edit or delete a template.

**BR-008: Payment Recording Authority**
Either parent can record a payment made by themselves. A parent cannot record a payment on behalf of the other parent.

#### Data Validation

**BR-009: Expense Description Length**
Expense description must be 1-200 characters. Empty or overly long descriptions are rejected.

**BR-010: Expense Amount Positivity**
Expense amount must be greater than zero. Zero or negative amounts are rejected.

**BR-011: Category Requirement**
Every expense must have a category selected from: school, medical, activities, childcare, other.

**BR-012: Memo Length Limit**
Optional memo field has a maximum length of 500 characters.

**BR-013: Child Name Length**
Child name must be 1-100 characters.

**BR-014: Payment Amount Positivity**
Payment amount must be greater than zero. Zero or negative payments are rejected.

**BR-015: Split Ratio Range**
parent_a_ratio must be between 0.0 and 1.0 inclusive. Values outside this range are rejected.

**BR-016: URL Validation**
If a link_url is provided for an expense, it must be a valid URL format (http:// or https://).

**BR-017: Question Reason Requirement**
When questioning an expense, a reason must be selected from: wrong_amount, not_child_related, duplicate, split_dispute, other.

**BR-018: Question Note Requirement for "Other"**
If question reason is "other", a question_note is required. Cannot submit with empty note.

**BR-019: Email Format Validation**
All email addresses (user signup, family invite) must be valid email format.

**BR-020: Password Strength**
Passwords must be at least 8 characters long.

#### Money Calculations

**BR-021: Integer Cents Storage**
All money values are stored as integers representing cents. No floating-point arithmetic is used for money.

**BR-022: Dollar-to-Cents Conversion**
When converting dollars to cents: `cents = round(dollars * 100)`. When converting cents to dollars: `dollars = cents / 100.0`.

**BR-023: Share Calculation**
Given an expense of `amount_cents` and `parent_a_ratio`:

- `parent_a_share = floor(amount_cents * parent_a_ratio)`
- `parent_b_share = amount_cents - parent_a_share`
  This ensures shares always sum exactly to amount_cents.

**BR-024: Balance Calculation Inclusion**
Only expenses with status "posted", "resolved", or "resolved_creator_decided" are included in balance calculation.

**BR-025: Balance Calculation Exclusion**
Expenses with status "questioned", "pending_satisfaction", "resolved_personal", "resolved_deleted", or "closed_unresolved" are excluded from balance calculation.

**BR-026: Balance Direction**

- Positive balance means Parent A owes Parent B.
- Negative balance means Parent B owes Parent A.
- Zero balance means all settled.

**BR-027: Payment Impact on Balance**
A payment from Parent A to Parent B of amount X decreases the net balance by X. A payment from Parent B to Parent A of amount X increases the net balance by X.

**BR-028: Balance Immutability on Split Ratio Change**
Changing the split ratio does not retroactively recalculate shares for existing expenses. Only future expenses use the new ratio.

#### Status Transitions

**BR-029: Initial Status**
All newly created expenses start in "posted" status.

**BR-030: Question Transition Guard**
An expense can only be questioned if: (1) current status is "posted", (2) the user is not the creator.

**BR-031: Resolution Transition Guard**
An expense can only be resolved if: (1) current status is "questioned", (2) the user is the creator.

**BR-032: Satisfaction Transition Guard**
An expense can only move to "resolved" (satisfied) if: (1) current status is "pending_satisfaction", (2) the user is the questioner.

**BR-033: Personal/Delete Resolution Bypass**
If resolution_action is "personal" or "delete", the status transitions directly to "resolved_personal" or "resolved_deleted" without requiring satisfaction.

**BR-034: Seven-Day Timeout Trigger**
If an expense is in "pending_satisfaction" status and more than 7 days have elapsed since resolved_at, the status automatically changes to "resolved_creator_decided" on next read.

**BR-035: Thirty-Day Closure Trigger**
If an expense is in "questioned" status and more than 30 days have elapsed since questioned_at, the status automatically changes to "closed_unresolved" on next system check.

**BR-036: Status Transition Atomicity**
Status transitions are atomic. If a transition fails, no partial state is saved.

#### Recurring Expenses

**BR-037: Free Tier Fixed Expense Limit**
Free tier users can create a maximum of 2 fixed monthly expense templates. Attempts to create a third are blocked.

**BR-038: Pro Tier Unlimited Fixed Expenses**
Pro tier users have no limit on the number of fixed expense templates.

**BR-039: Fixed Expense Generation Frequency**
Fixed expenses with "monthly" frequency generate on the 1st of each month. Other frequencies (weekly, biweekly, quarterly, annually) generate according to their schedule.

**BR-040: Idempotent Generation**
Fixed expense generation is idempotent by (template_id, month, year). If an expense for a template already exists for a given month-year, no duplicate is created.

**BR-041: Generated Expense Independence**
Once generated, a fixed expense is independent of its template. Editing the template does not change past generated expenses.

**BR-042: Template Deletion Non-Retroactive**
Deleting a fixed expense template does not delete previously generated expenses. Only stops future generation.

#### Tier & History Limits

**BR-043: Free Tier History Limit**
Free tier users can only view expenses, payments, and activities from the last 3 months.

**BR-044: Pro Tier Unlimited History**
Pro tier users can view all historical expenses, payments, and activities regardless of age.

**BR-045: Free Tier Export Restriction**
Free tier users cannot export data to CSV. Export functionality requires Pro tier.

**BR-046: Pro Tier Export Access**
Pro tier users can export expenses and payments to CSV format.

**BR-047: Tier Upgrade Immediate Effect**
When a user upgrades to Pro tier, all Pro features (unlimited history, unlimited fixed expenses, export) are immediately available.

**BR-048: Tier Downgrade Delayed Effect**
When a user cancels Pro tier, Pro features remain active until the end of the current billing period. Downgrade takes effect on the next billing date.

#### Activity Events & Audit Trail

**BR-049: Comprehensive Logging**
Every mutation (create, update, delete, status change, payment) generates an activity event.

**BR-050: Event Immutability**
Activity events cannot be modified or deleted after creation. They form an immutable audit trail.

**BR-051: Event Snapshots**
For update events, both before_snapshot and after_snapshot are stored in JSON format to enable precise change tracking.

**BR-052: Event Actor**
Every activity event records the user_id of the actor (who performed the action). System-triggered events (timeouts) use a reserved system actor ID.

**BR-053: Event Target**
Every activity event records the target_type (e.g., "expense", "payment", "family") and target_id for traceability.

#### Notifications

**BR-054: Notification Preference Respect**
Email notifications are only sent if the user has enabled that specific notification type in their preferences.

**BR-055: Self-Action No Notification**
Users do not receive notifications for their own actions. Only the other parent is notified.

**BR-056: Notification Delivery Failure Handling**
If an email notification fails to send, the system logs the error but does not block the underlying action (e.g., expense creation still succeeds).

#### Children & Associations

**BR-057: Optional Child Association**
Expenses can be associated with zero, one, or multiple children. Child association is optional.

**BR-058: Child Soft Delete**
Removing a child from the family is a soft delete. The child record is retained for historical expense associations.

**BR-059: Child Filter Inclusivity**
When filtering expenses by child, expenses associated with multiple children appear if any of the associated children match the filter.

#### Security & Access Control

**BR-060: Authentication Required**
All API endpoints (except public signup/login) require valid authentication via Clerk session token.

**BR-061: Family Isolation**
Users can only view and modify data for their own family. Cross-family data access is strictly prohibited.

**BR-062: Parameterized Queries Only**
All database queries use parameterized statements (`.bind()`) to prevent SQL injection.

**BR-063: HTTPS Only**
All API requests must use HTTPS. HTTP requests are automatically upgraded or rejected.

**BR-064: Secrets Externalized**
All secrets (API keys, database credentials) are stored in environment variables, never committed to the repository.

---

### Appendix E: Edge Cases Catalog

#### Expense Creation & Editing

**EC-001: Simultaneous Expense Creation**
**Scenario:** Both parents create an expense at the exact same moment.
**Expected Behavior:** Both expenses are created independently. No collision or data loss.

**EC-002: Edit Expense While Being Questioned**
**Scenario:** Creator attempts to edit an expense in the milliseconds after other parent questions it.
**Expected Behavior:** The question transaction locks the expense. Edit fails with "Expense status has changed. Refresh and try again."

**EC-003: Delete Expense While Being Questioned**
**Scenario:** Creator attempts to delete an expense while other parent is questioning it.
**Expected Behavior:** Same as EC-002. Question locks the expense; delete fails.

**EC-004: Create Expense with Zero Split Ratio**
**Scenario:** parent_a_ratio = 0.0, expense amount = $100.
**Expected Behavior:** parent_a_share = 0 cents, parent_b_share = 10000 cents. Expense is entirely parent B's responsibility.

**EC-005: Create Expense with 100% Split Ratio**
**Scenario:** parent_a_ratio = 1.0, expense amount = $100.
**Expected Behavior:** parent_a_share = 10000 cents, parent_b_share = 0 cents. Expense is entirely parent A's responsibility.

**EC-006: Odd-Cent Split**
**Scenario:** parent_a_ratio = 0.5, expense amount = $10.01 (1001 cents).
**Expected Behavior:** parent_a_share = floor(1001 \* 0.5) = 500 cents, parent_b_share = 1001 - 500 = 501 cents. Extra cent goes to parent B.

**EC-007: Create Expense with Future Date**
**Scenario:** User sets expense_date to a future date.
**Expected Behavior:** Expense is created and immediately included in balance (no deferral logic). Future date is informational only.

**EC-008: Create Expense with Past Date Beyond History Limit (Free Tier)**
**Scenario:** Free tier user creates expense with date 4 months ago.
**Expected Behavior:** Expense is created but immediately hidden from ledger view (outside 3-month window). Balance is affected only if expense is within 3 months.

#### Dispute Workflow

**EC-009: Question Expense Twice**
**Scenario:** Questioner attempts to question the same expense again.
**Expected Behavior:** Button is disabled once expense is questioned. If forced via API, returns "Expense is already questioned."

**EC-010: Resolve Without Questioning**
**Scenario:** Creator attempts to resolve an expense that was never questioned.
**Expected Behavior:** API returns "Cannot resolve an expense that is not questioned."

**EC-011: Satisfy Without Resolution**
**Scenario:** Questioner attempts to satisfy an expense still in "questioned" status.
**Expected Behavior:** API returns "Cannot satisfy an expense that is not pending satisfaction."

**EC-012: Satisfy Own Resolution (Creator Attempts)**
**Scenario:** Creator attempts to satisfy their own resolution.
**Expected Behavior:** API returns 403 "Only the questioner can satisfy a resolution."

**EC-013: Resolve After 30-Day Closure**
**Scenario:** Expense auto-closed to "closed_unresolved" after 30 days. Creator then attempts to resolve.
**Expected Behavior:** API returns "Cannot resolve an expense in terminal status."

**EC-014: Satisfy After 7-Day Timeout**
**Scenario:** Expense auto-resolved to "resolved_creator_decided" after 7 days. Questioner then attempts to satisfy.
**Expected Behavior:** API returns "Cannot satisfy an expense in terminal status."

**EC-015: Edit Amount to Same Value During Resolution**
**Scenario:** Creator resolves with "Edit Amount" but enters the same amount.
**Expected Behavior:** Resolution proceeds (amount change is technically zero, but resolution_action = "edit" is recorded).

**EC-016: Edit Amount to Negative Value During Resolution**
**Scenario:** Creator attempts to resolve with "Edit Amount" and enters a negative amount.
**Expected Behavior:** Validation error: "Amount must be positive."

**EC-017: Resolution Note Without Selecting "Other"**
**Scenario:** Questioner provides a question*note but selects reason "wrong_amount".
**Expected Behavior:** Note is saved regardless of reason. "Other" only \_requires* a note, but notes are optional for other reasons.

**EC-018: Rapid Status Transitions**
**Scenario:** Expense is questioned, resolved, and satisfied within seconds.
**Expected Behavior:** All transitions succeed. Activity events log each step with precise timestamps.

#### Balance & Payments

**EC-019: Balance Calculation with No Expenses**
**Scenario:** Family has no expenses.
**Expected Behavior:** Balance = 0 cents. Display: "All settled up!"

**EC-020: Balance Calculation with All Questioned Expenses**
**Scenario:** All expenses are in "questioned" status.
**Expected Behavior:** Balance = 0 cents (all excluded). Display: "All settled up!"

**EC-021: Record Payment Larger Than Balance**
**Scenario:** Balance = $50 (A owes B). Parent A records a payment of $100.
**Expected Behavior:** Payment is recorded. New balance = -$50 (B owes A). No error.

**EC-022: Record Negative Payment**
**Scenario:** User attempts to record a payment of -$50.
**Expected Behavior:** Validation error: "Payment amount must be positive."

**EC-023: Record Zero Payment**
**Scenario:** User attempts to record a payment of $0.00.
**Expected Behavior:** Validation error: "Payment amount must be positive."

**EC-024: Payment by Wrong Parent**
**Scenario:** Parent A attempts to record a payment where paid_by = Parent B.
**Expected Behavior:** API returns 403 "You can only record payments made by yourself."

**EC-025: Balance Recalculation After Split Ratio Change**
**Scenario:** Family has 10 existing expenses. Split ratio changes from 50/50 to 60/40.
**Expected Behavior:** Existing expenses retain their original 50/50 split. Only new expenses use 60/40. Balance reflects old + new splits.

**EC-026: Simultaneous Balance Queries**
**Scenario:** Both parents query balance at the exact same moment.
**Expected Behavior:** Both receive the same balance value (calculated from same set of expenses at that instant).

#### Recurring Expenses

**EC-027: Generate Fixed Expense on Non-Existent Date**
**Scenario:** Monthly template generates on Feb 1st, then March 1st, then April 1st (all valid).
**Expected Behavior:** All generations succeed. No issues with month length variations.

**EC-028: Generate Fixed Expense in Month Already Generated**
**Scenario:** System attempts to generate a fixed expense for March 2026 twice.
**Expected Behavior:** Second generation is skipped (idempotent check by template_id + month + year).

**EC-029: Create Fixed Expense Then Immediately Delete Template**
**Scenario:** User creates a fixed expense template and deletes it before the 1st of the month.
**Expected Behavior:** No expense is ever generated. Template deletion prevents future generation.

**EC-030: Edit Fixed Expense Template After Generation**
**Scenario:** Template exists for $100/month. March expense is generated. Template is edited to $150. April 1st arrives.
**Expected Behavior:** March expense remains $100. April expense is generated as $150.

**EC-031: Delete Generated Fixed Expense Manually**
**Scenario:** User deletes a generated fixed expense (not the template).
**Expected Behavior:** Expense is deleted (same as any manual expense). Template remains and will generate again next cycle.

**EC-032: Free Tier User Creates 2 Templates, Upgrades, Creates 3rd**
**Scenario:** User on Free tier maxes out at 2 templates. Upgrades to Pro. Creates a 3rd template.
**Expected Behavior:** 3rd template creation succeeds. All 3 generate on next cycle.

**EC-033: Pro User Creates 10 Templates, Downgrades to Free**
**Scenario:** User on Pro tier has 10 templates. Cancels and downgrades to Free at end of billing period.
**Expected Behavior:** All 10 templates remain active until downgrade date. After downgrade, user cannot create new templates, but existing 10 continue to generate.

**EC-034: Fixed Expense Generated, Then Questioned**
**Scenario:** Auto-generated fixed expense is questioned by other parent.
**Expected Behavior:** Same dispute workflow as manual expenses. Status -> questioned, excluded from balance.

#### Tier & History Limits

**EC-035: Free Tier User Views Ledger with 4-Month-Old Expense**
**Scenario:** Free tier user has expenses from 4 months ago.
**Expected Behavior:** Only expenses from last 3 months are visible. 4-month-old expense is hidden (but still in database).

**EC-036: Free Tier User Upgrades to Pro Mid-Month**
**Scenario:** User upgrades to Pro on March 15th. Ledger previously showed Jan 15 - Mar 15.
**Expected Behavior:** After upgrade, ledger immediately shows all historical expenses (no 3-month limit).

**EC-037: Pro Tier User Downgrades to Free**
**Scenario:** User downgrades at end of billing period. Previously viewed all history.
**Expected Behavior:** After downgrade, ledger is filtered to last 3 months. Older expenses become hidden.

**EC-038: Free Tier User Attempts CSV Export**
**Scenario:** Free tier user clicks "Export to CSV".
**Expected Behavior:** Modal appears: "Upgrade to Pro for CSV export" with upgrade CTA. No file downloads.

**EC-039: Pro Tier User Exports Empty Ledger**
**Scenario:** Pro user with no expenses clicks "Export to CSV".
**Expected Behavior:** CSV file downloads with headers only (no data rows).

#### Activity Feed & Audit Trail

**EC-040: Activity Event for Deleted Expense**
**Scenario:** User views activity feed and clicks on an event for a deleted expense.
**Expected Behavior:** Event details show full snapshot (description, amount, etc.) but link to expense returns 404 or "Expense no longer available."

**EC-041: System Timeout Event Attribution**
**Scenario:** An expense auto-resolves after 7 days. Activity feed shows the event.
**Expected Behavior:** Event shows actor = "System" (or system actor ID), not attributed to either parent.

**EC-042: Activity Event with Null Before Snapshot**
**Scenario:** Expense creation event (no "before" state).
**Expected Behavior:** before_snapshot = null, after_snapshot = full expense details.

**EC-043: Activity Event with Identical Before/After**
**Scenario:** User edits an expense but changes nothing.
**Expected Behavior:** Activity event is still logged (edit action occurred), but before_snapshot = after_snapshot.

#### Notifications

**EC-044: Email Notification Failure**
**Scenario:** Email service (Resend) is down when an expense is created.
**Expected Behavior:** Expense creation succeeds. Notification failure is logged but does not block the action. User can view expense in app.

**EC-045: User Disables All Notifications**
**Scenario:** User disables all notification types in preferences.
**Expected Behavior:** No emails are sent, but in-app activity feed still shows all events.

**EC-046: Notification Sent to Deleted Email**
**Scenario:** User's email is invalid or deleted.
**Expected Behavior:** Email bounces. Notification service logs the bounce. User is unaffected in-app.

#### Children & Associations

**EC-047: Associate Expense with Deleted Child**
**Scenario:** Child is deleted, but expense remains associated with that child_id.
**Expected Behavior:** Expense shows "(Removed Child)" or the archived child name in grayed-out text.

**EC-048: Filter by Child with No Associated Expenses**
**Scenario:** User filters ledger by a child who has no expenses.
**Expected Behavior:** Empty state: "No expenses found for [Child Name]."

**EC-049: Expense Associated with Multiple Children, Filter by One**
**Scenario:** Expense is associated with Child A and Child B. User filters by Child A.
**Expected Behavior:** Expense appears in filtered results.

#### Family & Onboarding

**EC-050: User Accepts Expired Invitation**
**Scenario:** Invitation was sent 8 days ago (>7 day expiry).
**Expected Behavior:** Error: "This invitation has expired. Please request a new invite from your co-parent."

**EC-051: User Already in Family Accepts New Invitation**
**Scenario:** User is already parent_a in Family X. Receives invitation to Family Y.
**Expected Behavior:** Error: "You are already part of a family. Leave your current family to join a new one."

**EC-052: User Enters Own Email as Co-Parent**
**Scenario:** During family creation, user enters their own email.
**Expected Behavior:** Validation error: "Cannot add yourself as co-parent."

**EC-053: Both Parents Leave Family**
**Scenario:** Parent A leaves family, then Parent B leaves family.
**Expected Behavior:** Family is marked as archived/inactive. Both parents can create new families independently.

---

### Appendix F: State Machine Transition Table

| From Status          | Event               | To Status                | Guard Conditions                                     | Effects                                                                                                |
| -------------------- | ------------------- | ------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| posted               | question            | questioned               | Actor = other parent (not creator)                   | Exclude from balance; set questioned_at, questioned_by, question_reason, question_note; notify creator |
| questioned           | resolve (keep/edit) | pending_satisfaction     | Actor = creator; action = "keep" or "edit"           | Set resolved_at, resolution_action; if edit, update amount_cents; notify questioner                    |
| questioned           | resolve (personal)  | resolved_personal        | Actor = creator; action = "personal"                 | Set resolved_at, resolution_action; permanent exclusion; no satisfaction required                      |
| questioned           | resolve (delete)    | resolved_deleted         | Actor = creator; action = "delete"                   | Set resolved_at, resolution_action; soft delete; permanent exclusion; no satisfaction required         |
| questioned           | 30-day timeout      | closed_unresolved        | questioned_at > 30 days ago; system-triggered        | Set closed_unresolved_at, closed_unresolved_by = "system"; permanent exclusion; log system event       |
| pending_satisfaction | satisfy             | resolved                 | Actor = questioner                                   | Set satisfied_at; include in balance; notify creator                                                   |
| pending_satisfaction | 7-day timeout       | resolved_creator_decided | resolved_at > 7 days ago; system-triggered (on-read) | Include in balance; log system timeout event                                                           |

**Terminal States (no further transitions):**

- resolved
- resolved_creator_decided
- resolved_personal
- resolved_deleted
- closed_unresolved

**Balance Inclusion by Status:**

| Status                   | Included in Balance? |
| ------------------------ | -------------------- |
| posted                   | Yes                  |
| questioned               | No                   |
| pending_satisfaction     | No                   |
| resolved                 | Yes                  |
| resolved_creator_decided | Yes                  |
| resolved_personal        | No                   |
| resolved_deleted         | No                   |
| closed_unresolved        | No                   |

---

_Document Version: 1.0_
_Last Updated: February 6, 2026_
_Generated by: PRD Synthesis Agent_
