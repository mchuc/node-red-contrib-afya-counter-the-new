'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createRED, sleep } = require('./helper');
const counter = require('../afya-counter-the-new/afya-counter-the-new.js');

function setup(config) {
  const RED = createRED();
  counter(RED);
  return { RED, node: RED.create('afya-counter-the-new', config) };
}

const states = (node) => node.sent.map((m) => m.payload.state);

test('counts, ends with "end" + "waiting", clears the variable', async () => {
  const { RED, node } = setup({ variableName: 'cnt', scope: 'global', countTime: '200', minTimePeriod: '40' });
  await node.receive({ payload: 'go' });
  assert.equal(node.sent[0].payload.counter, 0);

  await sleep(100);
  const running = RED.context.global.get('cnt');
  assert.ok(running.counter >= 1);
  assert.equal(JSON.stringify(JSON.parse(JSON.stringify(running))), JSON.stringify(running)); // plain JSON
  assert.equal(running.timer, undefined);

  await sleep(500);
  const s = states(node);
  assert.equal(s.at(-2), 'end');
  assert.equal(s.at(-1), 'waiting');
  assert.ok(node.sent.at(-1).payload.counter >= 4);
  assert.equal(RED.context.global.get('cnt'), undefined);
  assert.equal(node.lastStatus().fill, 'red');
});

test('messages while counting are ignored, commands work', async () => {
  const { RED, node } = setup({ variableName: 'cnt', scope: 'flow', countTime: 10000, minTimePeriod: 30 });
  await node.receive({});
  await sleep(100);
  const before = node.sent.length;
  await node.receive({ payload: 'something' }); // ignored
  assert.equal(node.sent.length, before);

  await node.receive({ payload: 'resetCounter' });
  assert.equal(RED.context.flow.get('cnt').counter, 0);

  const stop = RED.context.flow.get('cnt').stopTime;
  await node.receive({ payload: 'addtime' });
  assert.equal(RED.context.flow.get('cnt').stopTime, stop + 10000);

  await node.receive({ payload: 'kill' });
  assert.deepEqual(states(node).slice(-1), ['end']);
  await sleep(350);
  assert.deepEqual(states(node).slice(-2), ['end', 'waiting']);
  assert.equal(RED.context.flow.get('cnt'), undefined);
});

test('destroy stops without sending', async () => {
  const { RED, node } = setup({ variableName: 'cnt', scope: 'global', countTime: 10000, minTimePeriod: 30 });
  await node.receive({});
  await sleep(50);
  await node.receive({ payload: 'destroy' });
  const count = node.sent.length;
  await sleep(100);
  assert.equal(node.sent.length, count);
  assert.equal(RED.context.global.get('cnt'), undefined);
  assert.equal(node.lastStatus().fill, 'orange');
});

test('redeploy (close) stops the timer', async () => {
  const { RED, node } = setup({ variableName: 'cnt', scope: 'global', countTime: 10000, minTimePeriod: 20 });
  await node.receive({});
  await node.close();
  const count = node.sent.length;
  await sleep(80);
  assert.equal(node.sent.length, count);
  assert.equal(RED.context.global.get('cnt'), undefined);
});

test('config values are compared as numbers ("9000" < "60000")', async () => {
  const { node } = setup({ variableName: 'cnt', countTime: '60000', minTimePeriod: '9000' });
  const { error } = await node.receive({});
  assert.equal(error, undefined);
  await node.close();

  const bad = setup({ variableName: 'cnt', countTime: '1000', minTimePeriod: '5000' }).node;
  assert.match((await bad.receive({})).error.message, /interval is longer/);
});

test('legacy node: no scope → flow, variableName -1 → per-node name', async () => {
  const { RED, node } = setup({ variableName: -1, countTime: 10000, minTimePeriod: 1000 });
  await node.receive({});
  assert.equal(RED.context.flow.get('AFYA_counter_n1').counter, 0);
  await node.close();
});
