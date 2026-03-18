# 🔐 Waves & Wires — Admin Panel

Separate admin deployment. Uses the SAME Supabase project as the store.

## Why Separate?
- Admin panel is not discoverable from the store URL
- Even if store is compromised, admin is on a different domain
- Can restrict Supabase allowed origins to admin URL only
- Different deployment = different attack surface

## Setup
```bash
cp .env.example .env   # Same Supabase keys as store, but VITE_SITE_URL = this admin URL
npm install
npm run dev
```

## Deploy (Vercel recommended)
```bash
vercel
# Add env vars in Vercel dashboard
```

## Create Your First Admin
1. Go to your deployed admin URL
2. Try to sign in — you'll get "no admin access"
3. In Supabase SQL Editor:
```sql
UPDATE public.profiles SET is_admin = TRUE
WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```
4. Sign in again — you're in ✅

## Extra Security (Recommended)
In Supabase Dashboard → Authentication → URL Configuration,
add ONLY these to Allowed Redirect URLs:
- `https://ww-admin.vercel.app/login`
- `https://ww-admin.vercel.app/dashboard`

This prevents any other URL from using Supabase auth with your project.

## Routes
| URL | Page |
|---|---|
| `/login` | Admin login |
| `/dashboard` | Main dashboard |
| `/dashboard/orders` | Order management |
| `/dashboard/products` | Product CRUD |
| `/dashboard/customers` | Customer list |
| `/dashboard/analytics` | Charts & stats |
| `/dashboard/inventory` | Stock levels |
| `/dashboard/coupons` | Discount codes |
| `/dashboard/settings` | Store config |
