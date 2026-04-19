# GolfDraw — Play. Give. Win.

> A subscription-driven golf platform combining Stableford score tracking, monthly prize draws, and charity fundraising.

**Live URL:** https://golf-platform-eosin.vercel.app

---

## Test Credentials

| Role | Email | Password | URL |
|------|-------|----------|-----|
| Admin | admingolfdraw@gmail.com | admin@2026 | /admin |
| Test User | testuser@golfdraw.com | Test@2026 | /dashboard |

---

## What It Does

GolfDraw lets golfers subscribe monthly or yearly, enter their last 5 Stableford scores, and automatically participate in monthly prize draws. A portion of every subscription goes to the charity of the user's choice.

- **Subscribe** — £10/month or £100/year
- **Enter scores** — last 5 Stableford scores (1–45), rolling window
- **Win prizes** — 3-match, 4-match, or 5-match jackpot
- **Give back** — 10–50% of subscription goes to chosen charity

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Auth + Database | Supabase (Postgres + RLS) |
| Payments | Stripe (Checkout + Webhooks) |
| Email | Resend |
| Deployment | Vercel |
| Styling | CSS Variables + Tailwind |

---

## Features

### User
- Signup with email verification → Stripe checkout → active subscription
- Dashboard: scores, draw history, charity, winnings
- 5-score rolling window with date validation (one score per date)
- Charity selection with 10–50% contribution slider
- Winner proof upload (screenshot of golf platform scores)

### Admin
- User management — view profiles, scores, subscriptions, change roles
- Draw engine — random or weighted (by score frequency), simulate before publish
- Jackpot rollover if no 5-match winner
- Charity management — add, edit, delete, feature charities
- Winner verification — approve/reject proof, mark as paid
- Analytics — revenue, subscriber count, charity contributions

### Public
- Homepage with charity-first messaging
- Charity directory with search, individual charity profiles
- Independent donation flow (not tied to subscription)
- How it works, pricing, contact pages

---

## Project Structure

```
app/
├── admin/              # Admin dashboard
├── api/
│   ├── admin/          # Admin API routes (users, draws, charities, winners)
│   ├── auth/           # Auth helpers
│   ├── checkout/       # Stripe checkout session
│   ├── dashboard/      # Dashboard data API
│   ├── scores/         # Score CRUD
│   ├── subscriptions/  # Subscription sync
│   └── webhooks/       # Stripe webhook handler
├── auth/callback/      # Email verification callback
├── charities/          # Charity directory + individual profiles
├── dashboard/          # User dashboard
├── donate/             # Standalone donation page
├── login/              # Login page
├── pricing/            # Pricing page with auto-checkout
└── signup/             # Multi-step signup flow

components/
└── shared/navbar.tsx

lib/
├── draw-engine/        # Draw + prize pool logic
├── scalability/        # Multi-country, campaigns, accounts scaffolding
├── stripe/             # Stripe client
└── supabase/           # Server, client, admin Supabase helpers
```

---

## Environment Variables

Create a `.env.local` file in the root:

```env
# App
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

---

## Database Setup

Run the full schema in Supabase SQL Editor. Key tables:

- `profiles` — extends auth.users, stores role, charity selection
- `subscriptions` — Stripe subscription data per user
- `golf_scores` — up to 5 scores per user (rolling window enforced)
- `draws` — monthly draw records with winning numbers and prize pools
- `draw_entries` — one entry per user per draw
- `winners` — prize winners with proof upload and payout tracking
- `charities` — charity directory
- `charity_contributions` — logged each billing cycle

**Important SQL to run after schema:**

```sql
-- Profile auto-creation trigger
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'user')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

---

## Supabase Configuration

### URL Configuration
Go to **Authentication → URL Configuration:**
- Site URL: `https://your-domain.vercel.app`
- Redirect URLs: `https://your-domain.vercel.app/auth/callback`

### Email Template
Go to **Authentication → Email Templates → Confirm signup**, replace body with:

```html
<h2>Confirm your signup</h2>
<p>Click below to confirm your email and continue to payment:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a></p>
```

---

## Stripe Setup

### Webhook Events
Create a webhook endpoint at `https://your-domain.vercel.app/api/webhooks/stripe`

Subscribe to:
- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.deleted`

### Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

---

## Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Open http://localhost:3000
```

For local Stripe webhooks:
```bash
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

---

## Deployment (Vercel)

1. Push repo to GitHub
2. Import to Vercel — create new project
3. Set all environment variables in Vercel dashboard
4. Deploy
5. Add Stripe webhook endpoint pointing to deployed URL
6. Add deployed URL to Supabase redirect URLs allowlist

---

## Prize Pool Logic

| Match | Pool Share | Rollover |
|-------|-----------|----------|
| 5-Number Match | 40% | Yes (Jackpot) |
| 4-Number Match | 35% | No |
| 3-Number Match | 25% | No |

Jackpot rolls over to next month if no 5-match winner.

---

## Scalability

- Region/currency-aware checkout (`lib/scalability/config.ts`)
- Team/corporate account scaffolding (`lib/scalability/accounts.ts`)
- Campaign module with feature flag (`lib/scalability/campaigns.ts`)
- Codebase structured for mobile app extension

---

*Built for Digital Heroes — Full Stack Trainee Selection · April 2026*