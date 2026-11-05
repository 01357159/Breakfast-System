import { test } from 'node:test';
import assert from 'node:assert/strict';
import { submitGuestOrder } from '../src/data/guestCheckout.js';

function memoryStorage() {
  const values = new Map();
  return { getItem: k => values.get(k) || null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) };
}
const order = { seat: 'A-01', pickupTime: '10:30', items: [{ name:'蛋餅',price:35,qty:1 }] };
test('a definitive validation failure permits corrected checkout', async () => {
  const storage = memoryStorage();
  const options = { storage, randomId: () => 'order-1', randomToken: () => 'receipt' };
  await assert.rejects(submitGuestOrder({ ...options, order: { ...order, items:[{...order.items[0],qty:100}] },
    call: async () => { throw Object.assign(new Error('invalid quantity'),{code:'P0001'}); },
  }));
  let submitted;
  await submitGuestOrder({ ...options, order, call: async (_name,args) => { submitted=args; return {orderId:args.p_id}; } });
  assert.equal(submitted.p_items[0].qty,1);
});
test('lost responses reuse the receipt and preserve a different current cart', async () => {
  const storage = memoryStorage();
  let submitted;
  let requests = 0;
  const options = { storage, randomId: () => 'order-1', randomToken: () => 'receipt', call: async (_name,args) => {
    requests++;
    if (!submitted) submitted=args;
    assert.deepEqual(args,submitted);
    if (requests===1) throw new Error('network disconnected after server accepted');
    return {orderId:args.p_id};
  } };
  await assert.rejects(submitGuestOrder({...options,order}));
  const result = await submitGuestOrder({...options,order:{...order,seat:'A-02'}});
  assert.equal(result.recoveredPrevious,true);
  assert.equal(requests,2);
});
test('storage failure stops submission before network activity', async () => {
  let called = false;
  const storage = {getItem:()=>null,setItem:()=>{throw new Error('quota exceeded');}};
  await assert.rejects(submitGuestOrder({storage,order,randomId:()=> 'id',randomToken:()=> 'receipt',call:async()=>{called=true;}}));
  assert.equal(called,false);
});
