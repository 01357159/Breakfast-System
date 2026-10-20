# Review-First Order Feedback Flow

**Status:** Proposed for team review. Implementation is paused until the team confirms the flow.

## Goal

Improve review eligibility, identity, order recognition, and active-order cleanup without redesigning dine-in, pickup, payment, physical receipts, or daily queue numbers in the same change.

## Current assumptions

- Customers scan the QR code at a table using their own phones.
- The QR supplies the table number.
- Ordering remains available without login.
- The browser stores a private receipt secret for each order. The table number alone does not grant access to an order.
- A different phone scanning the same table QR cannot see or claim an earlier customer's order.
- Dine-in and pickup fulfillment details will be designed separately after the team confirms its intended workflow.

## Customer flow

1. The customer submits an order without signing in.
2. The customer's phone stores the private receipt used to read that order's status.
3. The customer can continue viewing the order from that phone while it is active.
4. When the owner marks the order completed, the order remains visible with a **Remove from active orders** action.
5. Removing the order hides it from the active-order screen on that phone. It does not delete the database order or its private review receipt.
6. Thirty minutes after completion, the order becomes eligible for a review.
7. The customer signs in with Google when they choose to review. The private receipt links the eligible order to that Google account.
8. Once linked, that customer can manage the review from another device while signed in to the same account.

## Review interface

- The primary action is **Write a review**.
- The order selector uses a recognizable meal summary instead of a UUID. Example: `鮪魚蛋餅 ×1、奶茶 ×1 · A-03 · NT$70`.
- Each option includes ordered item names and quantities, order date, table number, and total.
- If an order contains many items, show the first few names followed by the number of additional items.
- The customer's public display name comes from the linked Google account and cannot be changed per review.
- The customer enters only a 1–5 star rating and review text.
- A customer may edit or delete only their own review.
- An owner may reply but may not edit or delete the customer's review.

## Data and authorization

- Record a completion timestamp separately from the order creation time.
- Review eligibility begins thirty minutes after the completion timestamp.
- Receipt possession is required to link an unclaimed guest order to a Google account.
- An order can be linked to only one customer account.
- One current review is allowed per order.
- The server derives the review display name from the authenticated Google user's profile. User-editable profile data is used only for display and never for authorization.
- Database authorization continues to enforce review ownership and owner-only reply permissions.
- Hiding an order from the active screen is a local presentation preference. It does not remove operational or review records.

## Boundaries for this change

This review-first change will not define:

- dine-in versus pickup checkout selection;
- daily pickup sequence numbers such as `001`;
- ready, served, collected, or picked-up operational states;
- payment handling;
- printer or physical receipt integration;
- automatic deletion of business records.

Those subjects depend on the team's intended store workflow and should be designed as a separate order-lifecycle project.

## Error and empty states

- If no eligible order exists, explain that the order must be completed and that review access opens thirty minutes later.
- If the phone has no matching private receipt, do not expose orders based only on table number.
- If a claim already belongs to another account, reject it without revealing that account's identity.
- If Google profile name is unavailable, use a neutral fallback such as `Google 使用者` rather than asking for an arbitrary review name.
- Preserve entered rating and review text when a submission fails.

## Verification

- Confirm a different phone at the same table cannot see or claim an earlier order.
- Confirm a completed order cannot be reviewed before the thirty-minute delay.
- Confirm the receipt holder can link the order after the delay.
- Confirm order choices display meal details instead of only order IDs.
- Confirm the public name comes from Google and cannot be edited in the form.
- Confirm dismissing an active order does not remove review eligibility or owner records.
- Confirm customers cannot edit or delete another customer's review.
- Confirm owners can reply but cannot alter customer review content or rating.
