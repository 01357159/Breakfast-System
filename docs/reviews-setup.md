# Google login and verified reviews setup

The UI and database schema are implemented. The schema has been exercised with a local Postgres runtime; the real Supabase project and Google OAuth still need configuration.

Target project supplied for this app: `lndujnanoepwmtydlnrz`.
The connected Supabase account returned “You do not have permission to perform this action” for that project. No remote tables or settings were changed.

## 1. Install the database schema

Open the project's Supabase SQL Editor and execute `supabase/schema.sql` once. This creates a `private` schema with orders, reviews, replies and an owner allowlist, plus public RPC wrappers. It does not import browser demonstration orders. Use a dedicated project; if tables with these names already exist, review them before running the script.

Keep `private` out of the Data API's exposed schemas. Its tables have row level security enabled with no browser table access; the functions perform explicit caller checks. No customer or owner receives direct table mutation privileges.

## 2. Enable Google OAuth

Follow [Supabase's Google setup documaentation](https://supabase.com/docs/guides/auth/social-login/auth-google).

1. Create a Google OAuth Web client in Google Cloud. Configure the consent screen and the `openid`, email, and profile scopes. If the application is in testing, add your test accounts.
2. Add `http://localhost:5173` as an authorized JavaScript origin for development, and your deployed origin when available.
3. Add `https://lndujnanoepwmtydlnrz.supabase.co/auth/v1/callback` as the Google authorized redirect URI.
4. In Supabase Authentication → Sign In / Providers → Google, enter the Google client ID and client secret and enable Google. Store the Google secret in Supabase, never in a Vite environment variable.
5. In Authentication → URL Configuration, set the Site URL. Allow development redirect patterns `http://localhost:5173/customer/reviews**` and `http://localhost:5173/owner**`; add the corresponding production URLs when deploying. The `**` suffix includes the table query string. Keep production entries restricted to your own origin and these paths.

The client uses PKCE with automatic browser code exchange, and redirects back to the current page including its table query parameter. OAuth must return to the same browser and origin that started sign-in.

## 3. Configure the frontend

Copy `frontend/.env.example` to `frontend/.env.local`, then fill in:

```dotenv
VITE_SUPABASE_URL=https://lndujnanoepwmtydlnrz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-project-publishable-key
```

Find the publishable key in the project's API settings. Do not use a secret or `service_role` key. Restart Vite after changing the environment. In production, set both variables before building.

Without these variables, the existing local ordering demonstration remains available and reviews show a service setup message. With them, customer orders and owner completion statuses use Supabase, and owner access requires an authorized account. Menus still use the existing browser storage implementation.

## 4. Authorize the owner

Sign in once through the app with the intended owner's Google account, creating its Supabase Auth user. Then run this in the SQL Editor using the exact intended account email:

```sql
insert into private.owners(user_id)
select id from auth.users where email = 'owner@example.com'
on conflict do nothing;
```

Confirm exactly one intended account was added. Reload the app so it checks the allowlist again. Visiting `/owner` or changing user profile metadata never grants ownership.

## 5. Exercise the complete flow

1. Use one browser profile for the guest customer and a separate browser profile for the owner. Supabase sessions are shared between tabs on the same origin.
2. Order as a guest through `/customer/menu?seat=A-01`. No Google sign-in is needed. The browser saves a random receipt secret before the network request; only its hash is stored on the server.
3. In the owner profile, sign in, accept the order, and mark it completed.
4. In the customer profile, open order status and choose the review invitation. Sign in with Google. The reviews page claims completed orders using this browser's receipts, then lists them in the order selector.
5. Publish a 1–5 star review, edit it, and verify its average/count update. Other customers can read it but cannot edit it.
6. Publish a reply in the owner's reviews tab. The owner has no action or database permission to alter the customer's review or stars.
7. Confirm deleting a customer's own review also removes its reply. The completed order can be reviewed again, still limited to one current review per order.
8. Sign in as the same customer from another device to manage the already claimed review. Before claiming an order, its original browser receipt must be preserved; losing it loses that claim capability. Anyone sharing a browser profile shares its unclaimed guest receipts. Table number alone is never proof of ownership.

If a checkout request fails, retry it: the same order ID and receipt are reused so a lost response does not create a duplicate. A pending retry first resolves the previous submitted cart. If the current cart has changed, the app explicitly displays the recovered order's actual details and preserves the new cart for a separate confirmation. Definitive database validation failures release the pending snapshot so corrected data can be submitted.

## Local checks

From `frontend`:

```powershell
npm install
npm test
npm run lint
npm run build
```

The permission test executes the actual schema in PGlite with simulated Supabase Auth identity tables and database roles. It covers anonymous reads, receipt access, order completion restrictions, Google identity requirements, claim ownership, rating validation, customer edits/deletion and owner replies. It does not exercise Google's external consent flow or the hosted project's API configuration.

The existing app trusts submitted menu prices; this feature is not a payment system. Catalog persistence, authoritative pricing, order spam prevention and deployment infrastructure remain separate work.
