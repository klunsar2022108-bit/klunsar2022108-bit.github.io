# Confirmed Business Rules

## Approval Authority

- Admin approves routine orders, payments, registrations, deliveries, catalogue updates, expenses, and operational requests.
- Super Admin approval is required for role changes, permission changes, account-state changes affecting privileged users, financial policy changes, and high-risk financial adjustments.
- Every approval or rejection is persisted with actor and timestamp audit data.

## Accounts and Roles

- Authentication uses Supabase Auth.
- Customer, student, and teacher accounts are separate `account_type` values on the shared profile record.
- Account existence is separate from `approval_status` and `account_status`.
- Pending accounts can sign in only to permitted pending workflows.
- Deactivated accounts cannot use protected routes or protected database functions.
- Role and permission checks are enforced by Supabase RLS and database functions.

## Cart and Payments

- Programmes, products, and services use one unified cart and payment ledger.
- `order_items.item_type` preserves programme/product/service reporting separation.
- Payment methods are manual verification methods: mobile money, bank transfer, or cash.
- Mobile money and bank transfer require payment proof and a transaction reference.
- Customers submit amount paid; the system records expected amount, amount paid, and balance due.
- Payment proofs are stored in the private `payment-proofs` Supabase Storage bucket.
- Payment lifecycle: `pending` -> `under_review` -> `approved`/`completed`, or `rejected` with a reason.
- Server-side transition functions prevent unauthorized payment status changes.

## Financial Formulas

- Line discount: `line subtotal * discount percent / 100`.
- Discount total: sum of all line discounts.
- Grand total: subtotal minus discount total.
- Income: approved online order totals plus physical-shop sales.
- Expenditure: approved expenses.
- Profit: income minus approved expenditure.
- Balance due: maximum of `order total - amount paid` and zero.

## Delivery

- Physical items require a delivery address.
- Delivery status lifecycle: `processing`, `ready`, `shipped`, `out_for_delivery`, `delivered`, `completed`.
- Delivery becomes visible to customers only after approved/active order states.
- Every status change is stored in `order_delivery_events`.
- Expected delivery is calculated as five days after checkout for physical items.
- GPS tracking is intentionally out of scope.

## Shift and Teacher Allocation

- Students submit shift-change requests.
- Admin reviews ordinary shift changes.
- High-impact teacher reassignment can require Super Admin review.
- Teacher allocations are stored with student, teacher, programme, shift, actor, and timestamps.

## Teacher Financial Visibility

Teachers can see:

- Payment period
- Payment status
- Approved personal payment amount

Teachers cannot see:

- Business profit
- Business expenditure
- Customer payment proofs
- Other teachers' salary records

## Notifications and Email

- In-app notifications are the authoritative audited channel.
- Optional email notifications are queued in `email_outbox`.
- `process-email-outbox` sends queued jobs through Resend and retries failures up to five times.
- SMS is not configured; it can be added as another notification channel later.

## Scope Limitations

- No attendance management.
- No GPS live delivery tracking.
- No video conferencing.
- No biometric attendance.
- No external banking gateway; payments use manual verification.
