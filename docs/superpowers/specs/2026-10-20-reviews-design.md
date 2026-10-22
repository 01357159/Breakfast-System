# Verified customer reviews

Approved flow: guest ordering stays available; Google sign-in is required only to review a completed order. Public visitors can read ratings, reviews, and owner replies. Customers can update and delete only their own reviews. Owners can reply but cannot change or remove customer reviews.

## Architecture

Use Supabase Auth (Google OAuth with PKCE) and Postgres. Store owner accounts in a private administrator-managed allowlist. Store orders and secret receipt hashes privately; publish only review text, display name, ratings, and replies. Database functions authenticate and authorize each mutation. No authorization relies on editable user metadata or on visiting `/owner`.

Guest checkout creates a random receipt secret saved in the browser before submission. The server stores its SHA-256 hash. Receipt possession allows reading that order and claiming it after Google sign-in, only after an owner marks it completed. A completed order can be claimed once and can have one review. A customer can subsequently manage the review from any signed-in device. Losing the browser receipt before claiming loses the ability to claim that order. Customers sharing a browser also share its guest receipts.

The owner account cannot claim orders, write customer reviews, or edit/delete them, including reviews written before being made an owner. Owners may publish or update their reply. Deleting a customer review also deletes its reply.

## Interface

Add a public customer reviews route with average rating, count, verified purchase indicators, rating distribution, Google sign-in, completed order selection, review form, edit/delete controls, and replies. Preserve table query parameters in navigation and OAuth redirects. Invite customers to review from completed order status cards. Add an owner reviews tab and an owner Google login gate when the backend is configured. Use Traditional Chinese labels and the existing orange/blue visual language.

## Operations and errors

When Supabase environment variables are absent, preserve the existing local ordering demonstration and show reviews as unavailable. Local demonstration orders cannot qualify for verified reviews. When configured, orders and completion status use the database; network failures never silently create a local verified order. Keep draft text on failed submissions, disable duplicate submissions, show errors, confirm deletions, and refresh lists after mutations. Poll visible lists for updates.

## Deployment boundary

Prepare schema, authorization tests, environment example, and Google/owner setup instructions locally. Do not modify unrelated connected Supabase projects. A project must be selected and OAuth credentials configured before real login can be exercised. Existing local orders are not imported as verified purchases. Menu editing remains the existing local feature; submitted prices are not a payment authority. Server-managed catalog pricing and anti-abuse controls are outside this review feature.
