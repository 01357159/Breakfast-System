import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getReviewComposerState } from '../src/reviews/reviewComposerState.js';

const customer = { id: 'customer-1' };

test('one unreviewed completed order opens directly from the write review action', () => {
  const state = getReviewComposerState({
    user: customer,
    isOwner: false,
    authError: '',
    orders: [{ orderId: 'order-1', review_id: null }],
  });

  assert.equal(state.canWrite, true);
  assert.equal(state.defaultOrderId, 'order-1');
  assert.equal(state.message, '找到 1 筆可評論的已完成訂單。');
});

test('multiple eligible orders require the customer to choose one', () => {
  const state = getReviewComposerState({
    user: customer,
    isOwner: false,
    authError: '',
    orders: [
      { orderId: 'order-1', review_id: null },
      { orderId: 'order-2', review_id: null },
    ],
  });

  assert.equal(state.canWrite, true);
  assert.equal(state.defaultOrderId, '');
  assert.equal(state.message, '找到 2 筆可評論的已完成訂單。');
});

test('signed-in customer without an eligible order gets an exact next step', () => {
  const state = getReviewComposerState({ user: customer, isOwner: false, authError: '', orders: [] });

  assert.equal(state.canWrite, false);
  assert.match(state.message, /同一個瀏覽器/);
  assert.match(state.message, /店家標記為已完成/);
});

test('owner account explains why customer review input is unavailable', () => {
  const state = getReviewComposerState({ user: customer, isOwner: true, authError: '', orders: [] });

  assert.equal(state.canWrite, false);
  assert.match(state.message, /店家帳號/);
});
