const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { money, quantity, dateInput } = require('../src/lib/validate');
const catalog = require('../src/validators/catalog');
const rentals = require('../src/validators/rentals');
const h = require('./helpers');

describe('shared field validation', () => {
  it('normalizes Indian and international phones without accepting wrong lengths or letters', () => {
    for (const phone of ['9876543210', '+91 (98765) 43210']) assert.equal(catalog.customerCreate.parse({ name: 'Customer', phone }).phone, '+919876543210');
    for (const phone of ['987654321', '98765432101', '+9109876543210', '+91919876543210', 'abc9876543210', '98765.43210']) assert.equal(catalog.customerCreate.safeParse({ name: 'Customer', phone }).success, false, phone);
    for (const phone of ['+47 41234567', '+44 20 7946 0018', '+33 6 12 34 56 78']) assert.equal(catalog.customerCreate.safeParse({ name: 'Customer', phone }).success, true, phone);
  });
  it('rejects coercion traps, fractional counts and excess money precision', () => {
    for (const value of [null, true, false, '', ' ', [], '0x10', '1e2', Infinity, NaN, -1]) assert.equal(money.safeParse(value).success, false, String(value));
    assert.equal(money.parse('12.50'), 12.5);
    assert.equal(money.safeParse(12.345).success, false);
    assert.equal(money.safeParse(0.000001).success, false);
    assert.equal(money.safeParse(0.29).success, true);
    assert.equal(quantity.parse('2'), 2);
    for (const value of [1.5, 0, -1, '2.75', true]) assert.equal(quantity.safeParse(value).success, false);
  });
  it('checks required text, email and real ordered calendar dates', () => {
    assert.equal(catalog.categoryCreate.safeParse({ name: '   ' }).success, false);
    assert.equal(catalog.companyUpdate.parse({ email: ' Owner@Example.com  ' }).email, 'owner@example.com');
    assert.equal(catalog.companyUpdate.parse({ email: ' ' }).email, null);
    assert.equal(catalog.companyUpdate.safeParse({ email: 'owner@bad' }).success, false);
    for (const value of ['2026-02-30', '2026-13-01', 'tomorrow', '123', '']) assert.equal(dateInput.safeParse(value).success, false);
    assert.equal(rentals.rangeQuery.safeParse({ start_date: '2026-09-26', end_date: '2026-09-25' }).success, false);
  });
});

describe('authoritative API validation and replay', () => {
  let app, owner;
  before(async () => { await h.startDb(); app = h.buildApp(); });
  after(h.stopDb);
  beforeEach(async () => { await h.resetDb(); await h.seedPlans(); owner = await h.registerBusiness(app); });
  it('rejects invalid direct API requests with field errors', async () => {
    const invalid = await owner.post('/customers').send({ name: 'Pat', phone: '987654321' });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.errors[0].path, 'phone');
    const eq = await h.createEquipment(owner);
    for (const quantity_added of [true, 1.5, 'NaN', null]) assert.equal((await owner.post(`/equipment/${eq.id}/stock`).send({ quantity_added })).status, 400);
    assert.equal((await owner.put('/account/company').send({ email: 'broken' })).status, 400);
    assert.equal((await owner.put('/settings/low_stock_threshold').send({ value: 1.5 })).status, 400);
    assert.equal((await owner.get('/rentals?date_from=2026-09-26&date_to=2026-09-25')).status, 400);
  });
  it('keeps legacy phones readable and prevents aliases from creating duplicates', async () => {
    const customer = await h.createCustomer(owner, { phone: '9876543210' });
    const Customer = require('../src/models/Customer');
    await Customer.updateOne({ _id: customer.id }, { $set: { phone: '98765 43210', phoneNormalized: '9876543210' } }).setOptions({ skipTenantCheck: true });
    assert.equal((await owner.get('/customers/+919876543210')).body.id, customer.id);
    assert.equal((await owner.post('/customers').send({ name: 'Duplicate', phone: '+919876543210' })).status, 409);
    assert.equal((await owner.put(`/customers/${customer.id}`).send({ address: 'New address' })).status, 200);
    assert.equal((await owner.get(`/customers/${customer.id}`)).body.phone, '98765 43210');
    await Customer.updateOne({ _id: customer.id }, { $set: { phone: '555-0100', phoneNormalized: '5550100' } }).setOptions({ skipTenantCheck: true });
    assert.equal((await owner.put(`/customers/${customer.id}`).send({ name: 'Legacy renamed', phone: '555-0100' })).status, 200);
    assert.equal((await owner.put(`/customers/${customer.id}`).send({ phone: '555-0101' })).status, 400);
  });
  it('replays accepted creates and rejects changed payloads for the same sync ID', async () => {
    const payload = { name: 'Offline customer', phone: '+919876543210', sync_id: randomUUID() };
    const first = await owner.post('/customers').send(payload);
    const retry = await owner.post('/customers').send(payload);
    assert.equal(first.status, 201); assert.equal(retry.body.id, first.body.id);
    assert.equal((await owner.get('/customers')).body.length, 1);
    assert.equal((await owner.post('/customers').send({ ...payload, name: 'Changed' })).body.code, 'SYNC_CONFLICT');
    const other = await h.registerBusiness(app);
    assert.notEqual((await other.post('/customers').send(payload)).status, 201, 'global unique sync ID never exposes another tenant');
  });
  it('does not repeat equipment purchase side effects when a response is lost', async () => {
    const cat = (await owner.post('/categories').send({ name: 'Offline category', sync_id: randomUUID() })).body;
    const payload = { name: 'Offline item', category_id: cat.id, stock_count: 2, purchase_price_per_unit: 10, sync_id: randomUUID() };
    const first = await owner.post('/equipment').send(payload);
    const retry = await owner.post('/equipment').send(payload);
    assert.equal(first.status, 201); assert.equal(retry.body.id, first.body.id);
    assert.equal((await owner.get('/expenses')).body.filter((e) => e.equipment_id === first.body.id).length, 1);
    const expense = { category: 'Fuel', amount: 12.50, sync_id: randomUUID() };
    const a = await owner.post('/expenses').send(expense), b = await owner.post('/expenses').send(expense);
    assert.equal(a.status, 201); assert.equal(a.body.id, b.body.id);
  });
  it('rejects expected dates before rental start and impossible damage counts', async () => {
    const eq = await h.createEquipment(owner), customer = await h.createCustomer(owner);
    const rental = (await owner.post('/rentals').send({ customer_id: customer.id, equipment_id: eq.id })).body;
    assert.equal((await owner.put(`/rentals/${rental.id}`).send({ expected_return_date: '2000-01-01' })).status, 400);
    const result = await owner.post('/rentals/return').send({ rental_ids: [rental.id], damages: [{ rental_id: rental.id, damaged_quantity: 2, amount: 1 }] });
    assert.equal(result.status, 400);
    assert.equal((await owner.get('/rentals')).body[0].status, 'Active');
  });
});
