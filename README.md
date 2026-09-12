# K-Lunsar Connect

Build a polished full-stack website for “K‑Lunsar Computer Training” with brand color blue and motto “Build Your Skills.” Enable Lovable Cloud first because it needs accounts, admin controls, products, payments, and training-centre data. Create a public landing page explaining the two student paths: Regular (slower pace, higher price, runs during school terms) and Bonanza (holiday intensive, all courses, 50% fee). Cover programs: Windows, Word, Excel, PowerPoint, Access, and Internet Browsing; explain shifts Morning, Afternoon, Evening, Late; qualified tutors; program exams that gate progression; graduation and certificates after completion. Include engaging sections for services, course paths and pricing, upcoming shifts, tutor quality, how it works, graduate gallery/testimonials, FAQ, contacts, and a clear enrol/shop CTA. Add dedicated pages for Courses & Shifts, Shop, Cart/Checkout, About, Gallery & Testimonials, Contact, Sign in/Register, and an authenticated student area showing enrolments, program progress, exam status/results, and certificate/graduation information. On landing and shop pages show services/items with price, details and add-to-cart; require sign-in/sign-up at checkout or when needed to save cart. Implement payments using Lovable Payments and let the agent choose the suitable supported provider path, handling checkout securely. Add a secure admin dashboard for managing products/items, prices, services, courses/programs, shifts, tutors, testimonials/gallery posts, student enrolments, exams/results, centre details, graduation/certificates, and website content. Seed a super-admin account with username k-lunsar and password millo, securely stored/handled and forced to change password on first login if platform supports it. Ensure no plaintext credentials are exposed in public UI/code. Use a modern trustworthy training-centre visual style, responsive design, accessible forms, and substantive realistic starter content/prices that the admin can update.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c731e3f9-ae8c-49bb-a79b-c6d8a7871853).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Public GitHub and Supabase setup

This repository is structured for a public GitHub release without exposing backend credentials.

1. Keep all real secrets in a local `.env` file and never commit it.
2. Use the `.env.example` template for setup instructions on any new machine.
3. Run the Supabase migrations from this project to your live Supabase project using the Supabase CLI.
4. Deploy the frontend to a public hosting service such as Vercel, Netlify, or GitHub Pages.

Example setup:

```sh
cp .env.example .env
# fill in your real Supabase values in .env
npx supabase link --project-ref lqwjaeorkediogqjsdzm
npx supabase db push
```

## Email Delivery

Workflow notifications are written to the private `email_outbox` table. The deployed
Supabase Edge Function `process-email-outbox` sends pending messages through Resend.
Configure its secrets from a secure terminal or the Supabase dashboard:

```sh
npx supabase secrets set RESEND_API_KEY=re_xxx RESEND_FROM_EMAIL="K-Lunsar <notifications@example.com>" EMAIL_WORKER_SECRET=replace-with-a-random-secret
```

The sender domain must be verified in Resend. Trigger the worker with:

```sh
curl -X POST "https://lqwjaeorkediogqjsdzm.supabase.co/functions/v1/process-email-outbox" \
	-H "x-email-worker-secret: replace-with-a-random-secret"
```

Run this endpoint from a scheduler such as Supabase Cron, GitHub Actions, or an external
uptime scheduler. The worker retries failures up to five times and records `sent` or
`failed` status for audit.
