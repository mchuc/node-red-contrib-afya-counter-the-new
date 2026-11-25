/**
 * AFYA Counter The New – counts up every `minTimePeriod` ms for `countTime` ms.
 * (C) 2019–2026 Marcin Chuć · MIT
 *
 * The state lives in a flow/global context variable (plain JSON, so it also works
 * with persistent context stores); the timer itself stays inside the node.
 */
'use strict';

const COMMANDS = ['reset', 'resetcounter', 'resetall', 'addtime', 'kill', 'destroy'];

function hhmmss(d = new Date()) {
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
}

function seconds(ms) {
  return `${Math.max(0, Math.round(ms / 1000))} s`;
}

module.exports = function (RED) {
  function AFYACounterTheNew(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    // legacy nodes (no scope saved) keep using flow context
    const scope = config.scope === 'global' ? 'global' : 'flow';
    let name = String(config.variableName === undefined ? '' : config.variableName).trim();
    if (!name || name === '-1') name = `AFYA_counter_${node.id}`;
    const { key, store } = RED.util.parseContextStore(name);
    const ctx = () => node.context()[scope];
    const load = () => ctx().get(key, store);
    const save = (state) => ctx().set(key, state, store);

    const countTime = Math.abs(Number(config.countTime)) || 60000;
    const minTimePeriod = Math.abs(Number(config.minTimePeriod)) || 1000;
    const configError =
      minTimePeriod > countTime ? 'interval is longer than the counting time' : null;

    let timer = null;
    const timeouts = new Set();

    const later = (fn, ms) => {
      const t = setTimeout(() => {
        timeouts.delete(t);
        fn();
      }, ms);
      timeouts.add(t);
    };

    const message = (state, phase) => ({
      payload: {
        counter: state.counter,
        stopTime: state.stopTime,
        recallTime: state.recallTime,
        countTime: state.countTime,
        minTimePeriod: state.minTimePeriod,
        timestamp: Date.now(),
        state: phase,
      },
    });

    const activeStatus = (state, starting) =>
      node.status({
        fill: starting ? 'blue' : 'green',
        shape: starting ? 'ring' : 'dot',
        text: `${starting ? 'start' : 'counting'} ${state.counter} · stop ${hhmmss(new Date(state.stopTime))} (in ${seconds(
          state.stopTime - Date.now(),
        )})`,
      });

    function stopTimer() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    /** Ends counting: sends "end", 300 ms later "waiting", clears the variable. */
    function finish(state) {
      stopTimer();
      save(undefined);
      node.send(message(state, 'end'));
      later(() => node.send(message(state, 'waiting')), 300);
      node.status({ fill: 'red', shape: 'dot', text: `stop · counter ${state.counter} · ${hhmmss()}` });
    }

    function tick() {
      const state = load();
      if (!state || typeof state !== 'object') {
        // the variable was removed from outside – stop quietly
        stopTimer();
        node.status({ fill: 'grey', shape: 'ring', text: `stopped (variable removed) · ${hhmmss()}` });
        return;
      }
      state.counter += 1;
      save(state);
      node.send(message(state, 'counting'));
      if (state.stopTime <= Date.now()) finish(state);
      else activeStatus(state, false);
    }

    function start() {
      const now = Date.now();
      const state = {
        counter: 0,
        countTime,
        minTimePeriod,
        recallTime: minTimePeriod,
        stopTime: now + countTime,
        variableName: key,
        resetSensitive: true,
        startTime: now,
      };
      save(state);
      activeStatus(state, true);
      node.send(message(state, 'counting'));
      timer = setInterval(tick, minTimePeriod);
    }

    if (configError) node.status({ fill: 'red', shape: 'ring', text: configError });
    else node.status({ fill: 'grey', shape: 'ring', text: `ready · ${scope}.${key}` });

    node.on('input', (msg, send, done) => {
      if (configError) return done(new Error(`AFYA counter: ${configError}`));

      const cmd = typeof msg.payload === 'string' ? msg.payload.trim().toLowerCase() : '';
      const running = timer !== null;

      if (cmd === 'kill' || cmd === 'destroy') {
        if (!running) {
          save(undefined);
          node.status({ fill: 'grey', shape: 'ring', text: `not running · ${hhmmss()}` });
          return done();
        }
        const state = load() || {};
        if (cmd === 'kill') {
          state.stopTime = Date.now();
          state.resetSensitive = false;
          finish(state);
        } else {
          stopTimer();
          save(undefined);
          node.status({ fill: 'orange', shape: 'dot', text: `destroyed · ${hhmmss()}` });
        }
        return done();
      }

      if (running) {
        const state = load();
        if (state && COMMANDS.includes(cmd)) {
          if (cmd === 'addtime') state.stopTime += countTime;
          if (cmd === 'reset' || cmd === 'resetall') state.stopTime = Date.now() + countTime;
          if (cmd === 'resetcounter' || cmd === 'resetall') state.counter = 0;
          save(state);
          activeStatus(state, false);
        }
        // while counting, other messages are ignored
        return done();
      }

      start();
      done();
    });

    node.on('close', (removed, done) => {
      if (timer) {
        stopTimer();
        save(undefined);
      }
      timeouts.forEach(clearTimeout);
      timeouts.clear();
      done();
    });
  }

  RED.nodes.registerType('afya-counter-the-new', AFYACounterTheNew);
};
