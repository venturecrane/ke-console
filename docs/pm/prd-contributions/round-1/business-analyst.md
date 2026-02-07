# Business Analyst Contribution - Kid Expenses PRD

## 1. Feature Specifications

### 1.1 Onboarding & Family Setup

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

### 1.2 Expense Management

#### US-005: Create One-Time Expense
**As a** co-parent
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

#### US-007: Edit Own Posted Expense
**As a** co-parent who created an expense
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

#### US-009: View Other Parent's Expense (Cannot Edit)
**As a** co-parent viewing an expense I did not create
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

#### US-010: Bulk View Expenses in Ledger
**As a** co-parent
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

### 1.3 Dispute Workflow

#### US-012: Question Posted Expense
**As a** co-parent who did not create an expense
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

#### US-013: View Questioned Expense Details
**As a** co-parent
**I want to** see why an expense was questioned
**So that** I understand the concern and can respond appropriately

**Acceptance Criteria:**
- **Given** an expense is in "questioned" status
  **When** I view the expense detail
  **Then** I see the question reason, question note, questioned_by, and questioned_at timestamp
- **Given** I am the creator of a questioned expense
  **When** I view it
  **Then** I see available resolution actions: keep, edit amount, mark personal, delete
- **Given** I am the questioner of an expense
  **When** I view it
  **Then** I see "Waiting for [creator name] to resolve" but no action buttons

**Priority:** P0

#### US-014: Resolve - Keep Original
**As a** expense creator responding to a question
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

#### US-015: Resolve - Edit Amount
**As a** expense creator responding to a question
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

#### US-016: Resolve - Mark as Personal
**As a** expense creator responding to a question
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

#### US-017: Resolve - Delete Expense
**As a** expense creator responding to a question
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

#### US-018: Satisfy Resolution (Keep or Edit)
**As a** questioner responding to a pending_satisfaction resolution
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

#### US-019: Seven-Day Auto-Resolution Timeout
**As a** expense creator waiting for satisfaction
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

#### US-021: Dispute Dashboard View
**As a** co-parent
**I want to** see all expenses requiring my action
**So that** I can quickly respond to questions and pending resolutions

**Acceptance Criteria:**
- **Given** I am on the dispute dashboard
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

### 1.4 Fixed Monthly Expenses (Recurring)

#### US-022: Create Fixed Monthly Expense Template
**As a** co-parent
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

#### US-025: Automatic Monthly Expense Generation
**As a** co-parent
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
  **Then** it follows the same dispute workflow as one-time expenses

**Priority:** P1

### 1.5 Balance & Payments

#### US-027: View Current Net Balance
**As a** co-parent
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
  **Then** a_share = floor(10000 * 0.60) = 6000, b_share = 10000 - 6000 = 4000
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

#### US-029: Record External Payment
**As a** co-parent who paid my co-parent outside the app
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

### 1.6 Activity Feed & Audit Trail

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

### 1.7 Children Management

#### US-035: Add Child to Family
**As a** co-parent
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

#### US-038: Filter Expenses by Child
**As a** co-parent
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

### 1.8 Settings & Configuration

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

### 1.9 Tier Management & Billing

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

#### US-043: Upgrade to Pro Tier
**As a** co-parent on Free tier
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

### 1.10 Data Export

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

### 1.11 Notifications

#### US-049: Receive Email Notification - Expense Created
**As a** co-parent
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

#### US-050: Receive Email Notification - Expense Questioned
**As a** expense creator
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

#### US-051: Receive Email Notification - Question Resolved
**As a** questioner
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

## 2. Business Rules

### 2.1 Authorization & Permissions

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

### 2.2 Data Validation

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

### 2.3 Money Calculations

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

### 2.4 Status Transitions

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

### 2.5 Recurring Expenses

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

### 2.6 Tier & History Limits

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

### 2.7 Activity Events & Audit Trail

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

### 2.8 Notifications

**BR-054: Notification Preference Respect**
Email notifications are only sent if the user has enabled that specific notification type in their preferences.

**BR-055: Self-Action No Notification**
Users do not receive notifications for their own actions. Only the other parent is notified.

**BR-056: Notification Delivery Failure Handling**
If an email notification fails to send, the system logs the error but does not block the underlying action (e.g., expense creation still succeeds).

### 2.9 Children & Associations

**BR-057: Optional Child Association**
Expenses can be associated with zero, one, or multiple children. Child association is optional.

**BR-058: Child Soft Delete**
Removing a child from the family is a soft delete. The child record is retained for historical expense associations.

**BR-059: Child Filter Inclusivity**
When filtering expenses by child, expenses associated with multiple children appear if any of the associated children match the filter.

### 2.10 Security & Access Control

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

## 3. State Machine

### 3.1 Expense Status State Machine

The expense lifecycle is governed by an 8-status state machine:

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

### 3.2 State Definitions

**posted**
- **Description:** Expense has been created and is visible to both parents. Included in balance.
- **Guards:** None (initial state)
- **Effects:** Balance recalculated to include this expense.

**questioned**
- **Description:** The other parent has raised a concern. Excluded from balance until resolved.
- **Guards:** Must be in "posted" status; actor must be other parent.
- **Effects:** Balance recalculated to exclude this expense; notification sent to creator.

**pending_satisfaction**
- **Description:** Creator has resolved with "keep" or "edit"; awaiting questioner confirmation. Still excluded from balance.
- **Guards:** Must be in "questioned" status; actor must be creator; resolution_action = "keep" or "edit".
- **Effects:** resolved_at timestamp set; notification sent to questioner.

**resolved**
- **Description:** Questioner has confirmed the resolution. Included in balance again.
- **Guards:** Must be in "pending_satisfaction" status; actor must be questioner.
- **Effects:** satisfied_at timestamp set; balance recalculated to include expense; notification sent to creator.

**resolved_creator_decided**
- **Description:** 7-day timeout expired while in "pending_satisfaction". Creator's resolution stands. Included in balance.
- **Guards:** Must be in "pending_satisfaction" status; more than 7 days since resolved_at; system-triggered.
- **Effects:** Balance recalculated to include expense; activity event logged as "system_timeout".

**resolved_personal**
- **Description:** Creator acknowledged expense as personal (not child-related). Permanently excluded from balance.
- **Guards:** Must be in "questioned" status; actor must be creator; resolution_action = "personal".
- **Effects:** resolved_at timestamp set; permanently excluded from balance; no satisfaction required.

**resolved_deleted**
- **Description:** Creator acknowledged expense as invalid and deleted it. Permanently excluded from balance.
- **Guards:** Must be in "questioned" status; actor must be creator; resolution_action = "delete".
- **Effects:** resolved_at timestamp set; permanently excluded from balance; soft delete (still visible in history); no satisfaction required.

**closed_unresolved**
- **Description:** 30-day timeout expired while in "questioned" status. Creator never resolved. Permanently excluded from balance.
- **Guards:** Must be in "questioned" status; more than 30 days since questioned_at; system-triggered.
- **Effects:** Permanently excluded from balance; activity event logged as "system_closure".

### 3.3 Transition Table

| From Status            | Event                   | To Status              | Guard Conditions                                      | Effects                                              |
|------------------------|-------------------------|------------------------|-------------------------------------------------------|------------------------------------------------------|
| posted                 | question                | questioned             | Actor = other parent                                  | Exclude from balance; notify creator                 |
| questioned             | resolve (keep/edit)     | pending_satisfaction   | Actor = creator                                       | Set resolved_at; notify questioner                   |
| questioned             | resolve (personal)      | resolved_personal      | Actor = creator; action = personal                    | Set resolved_at; permanent exclusion                 |
| questioned             | resolve (delete)        | resolved_deleted       | Actor = creator; action = delete                      | Set resolved_at; soft delete; permanent exclusion    |
| questioned             | 30-day timeout          | closed_unresolved      | questioned_at > 30 days ago                           | Permanent exclusion; system event                    |
| pending_satisfaction   | satisfy                 | resolved               | Actor = questioner                                    | Set satisfied_at; include in balance; notify creator |
| pending_satisfaction   | 7-day timeout           | resolved_creator_decided | resolved_at > 7 days ago                            | Include in balance; system event                     |

### 3.4 Terminal States

The following states are terminal (no further transitions possible):
- **resolved**
- **resolved_creator_decided**
- **resolved_personal**
- **resolved_deleted**
- **closed_unresolved**

Once an expense reaches a terminal state, its status cannot change.

---

## 4. Edge Cases

### 4.1 Expense Creation & Editing

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
**Expected Behavior:** parent_a_share = floor(1001 * 0.5) = 500 cents, parent_b_share = 1001 - 500 = 501 cents. Extra cent goes to parent B.

**EC-007: Create Expense with Future Date**
**Scenario:** User sets expense_date to a future date.
**Expected Behavior:** Expense is created and immediately included in balance (no deferral logic). Future date is informational only.

**EC-008: Create Expense with Past Date Beyond History Limit (Free Tier)**
**Scenario:** Free tier user creates expense with date 4 months ago.
**Expected Behavior:** Expense is created but immediately hidden from ledger view (outside 3-month window). Balance is affected only if expense is within 3 months.

### 4.2 Dispute Workflow

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
**Scenario:** Questioner provides a question_note but selects reason "wrong_amount".
**Expected Behavior:** Note is saved regardless of reason. "Other" only *requires* a note, but notes are optional for other reasons.

**EC-018: Rapid Status Transitions**
**Scenario:** Expense is questioned, resolved, and satisfied within seconds.
**Expected Behavior:** All transitions succeed. Activity events log each step with precise timestamps.

### 4.3 Balance & Payments

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

### 4.4 Recurring Expenses

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
**Expected Behavior:** Same dispute workflow as manual expenses. Status → questioned, excluded from balance.

### 4.5 Tier & History Limits

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

### 4.6 Activity Feed & Audit Trail

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

### 4.7 Notifications

**EC-044: Email Notification Failure**
**Scenario:** Email service (Resend) is down when an expense is created.
**Expected Behavior:** Expense creation succeeds. Notification failure is logged but does not block the action. User can view expense in app.

**EC-045: User Disables All Notifications**
**Scenario:** User disables all notification types in preferences.
**Expected Behavior:** No emails are sent, but in-app activity feed still shows all events.

**EC-046: Notification Sent to Deleted Email**
**Scenario:** User's email is invalid or deleted.
**Expected Behavior:** Email bounces. Notification service logs the bounce. User is unaffected in-app.

### 4.8 Children & Associations

**EC-047: Associate Expense with Deleted Child**
**Scenario:** Child is deleted, but expense remains associated with that child_id.
**Expected Behavior:** Expense shows "(Removed Child)" or the archived child name in grayed-out text.

**EC-048: Filter by Child with No Associated Expenses**
**Scenario:** User filters ledger by a child who has no expenses.
**Expected Behavior:** Empty state: "No expenses found for [Child Name]."

**EC-049: Expense Associated with Multiple Children, Filter by One**
**Scenario:** Expense is associated with Child A and Child B. User filters by Child A.
**Expected Behavior:** Expense appears in filtered results.

### 4.9 Family & Onboarding

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

## 5. Glossary

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

**Dispute Workflow**
The 8-status process by which a questioned expense is handled: posted → questioned → (resolved branches) → terminal states.

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

**Notification Preferences**
User settings controlling which email notifications are sent (e.g., expense_created, expense_questioned, payment_recorded).

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
The current state of an expense in the dispute workflow. Eight possible values: posted, questioned, pending_satisfaction, resolved, resolved_creator_decided, resolved_personal, resolved_deleted, closed_unresolved.

**Status Badge**
UI indicator showing an expense's current status (e.g., "Posted", "Questioned", "Resolved").

**Terminal Status**
An expense status from which no further transitions are possible. Terminal statuses: resolved, resolved_creator_decided, resolved_personal, resolved_deleted, closed_unresolved.

**Timeout**
System-triggered status transition after a time threshold. 7-day timeout: pending_satisfaction → resolved_creator_decided. 30-day timeout: questioned → closed_unresolved.

**Template**
A fixed monthly expense definition used to auto-generate recurring expenses. Contains same fields as a regular expense but generates new instances on schedule.

**Tier**
Subscription level: Free or Pro. Determines feature access and limits.

**Two-Parent Ledger**
The shared expense tracking system where either parent can add expenses but only the creator can edit/delete them. All changes are visible to both parents.

---

**End of Business Analyst Contribution**
