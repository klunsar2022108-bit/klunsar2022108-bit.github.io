# Implementation Status

## Architecture Rules

- Presentation: TanStack Router routes and reusable UI components.
- Business logic: shared cart, order, notification, chat, auth, and workflow services.
- Data: Supabase tables, RLS policies, security-definer functions, storage policies, triggers, and reporting views.
- Protected operations are enforced server-side. Frontend visibility is not treated as authorization.

## Phase Status

### Phase 1: Foundation

Complete. Authentication, profiles, roles, account status, approval status, permissions, RLS, deactivation, and Super Admin restrictions are deployed.

### Phase 2: Training Management

Complete. Courses, modules, lessons, shifts, students, tutors, enrolments, assignments, and teacher allocation are deployed.

### Phase 3: Academic Management

Complete. Assessments, exam results, progress, certificates, teacher submissions, certificate eligibility, and student academic views are deployed.

### Phase 4: Business Management

Complete. Products, services, attributes, pricing, stock, stock movements, cart, orders, order items, online sales, and physical sales are deployed.

### Phase 5: Payments

Complete for configured manual verification. Payment methods, amount paid, expected amount, balance, reference, private proof storage, review status, rejection reason, receipts, invoices, refunds, audit records, and controlled transitions are deployed.

### Phase 6: Delivery

Complete without GPS tracking. Addresses, expected delivery dates, controlled status transitions, customer visibility rules, delivery history, and delivery notifications are deployed.

### Phase 7: Communication

Complete for in-app/database communication. Chat threads/messages, broadcasts, notifications, notification channels, email outbox, Resend worker, support requests, feedback, and contact inquiries are deployed.

### Phase 8: Analytics

Complete. Role-scoped reports cover sales periods/channels, products, stock, customers/balances, students, teachers, income, expenditure, profit, delivery, and CSV export.

### Phase 9: Security and Audit

Complete. RLS, permission functions, protected routes, private payment-proof storage, audit triggers, account deactivation, controlled state transitions, application-error records, session records, and Super Admin controls are deployed.

### Phase 10: Testing and Deployment

Build and migration verification pass. Remaining production setup is external configuration: Resend secrets/sender verification, scheduler invocation for the email worker, and user-acceptance/security testing with real role accounts.

## Final Workflow

Registration -> role selection -> approval -> dashboard access -> programme/product/service selection -> cart or registration -> payment -> verification -> allocation or fulfilment -> notification -> delivery or training progress -> results -> certificate/records -> analytics and audit.

## Known Scope Boundaries

- Attendance management is out of scope.
- GPS delivery tracking is out of scope.
- Video conferencing is out of scope.
- Biometric attendance is out of scope.
- External banking integration is out of scope; manual payment verification is supported.
