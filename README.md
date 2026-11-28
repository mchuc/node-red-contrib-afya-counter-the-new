# node-red-contrib-afya-counter-the-new

[![npm](https://img.shields.io/npm/v/node-red-contrib-afya-counter-the-new)](https://www.npmjs.com/package/node-red-contrib-afya-counter-the-new)
[![license: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A Node-RED counter you are in control of: after a message it counts **+1 every N ms** until the counting time is over – and you can reset it, extend it or stop it while it runs.

**[English](#english) · [Polski](#polski)**

---

## English

### Install

```bash
cd ~/.node-red
npm install node-red-contrib-afya-counter-the-new
```

Requires Node-RED ≥ 3.0 and Node.js ≥ 18. The node appears in the **AFYA** palette group as **counter**.

### Configuration

| Field | Description |
|---|---|
| Labels | Language of the descriptions in the edit dialog: *system language* (Polish for a Polish system, English for all others), *English* or *Polski*. Only the descriptions change – fields and values stay the same. |
| **Count for** | Counting time in ms (1 min = 60000, 1 h = 3600000). |
| **+1 every** | Interval in ms; must not be longer than the counting time. |
| **Variable** | Context variable with the running state – `global` (readable from any flow) or `flow`, optionally in a chosen context store. |
| **Name** | Optional label. |

### Input

When idle, **any message starts counting**. While counting, only these commands in `msg.payload` are used:

| Command | Effect |
|---|---|
| `reset` | restart the time (stop = now + counting time), keep the counter |
| `resetCounter` | set the counter to 0, keep the time |
| `resetAll` | both of the above |
| `addtime` | add the counting time to the current stop time |
| `kill` | stop now and send `end` + `waiting` |
| `destroy` | stop now without sending anything |

### Output

```json
{ "counter": 12, "state": "counting", "stopTime": 1764057660000, "countTime": 60000,
  "minTimePeriod": 1000, "recallTime": 1000, "timestamp": 1764057612000 }
```

`state`: `counting` on every step, `end` when finished, `waiting` 300 ms later.

### State in a global variable

While running, the variable holds plain JSON (`counter`, `stopTime`, `countTime`, …), so it works with
persistent context stores and can be read from any flow: `global.get("AFYA_xxxxx").counter`.
The variable is removed when counting ends. A redeploy stops a running counter.

### Upgrading to 0.1.0

Nodes created with older versions keep using **flow** context until you change it in the dialog.
`kill` now ends at once instead of on the next tick. See [change.log](change.log).

---

## Polski

Licznik, nad którym masz kontrolę: po wiadomości liczy **+1 co N ms**, aż minie czas liczenia – w trakcie
można go zresetować, wydłużyć albo zatrzymać.

### Instalacja

```bash
cd ~/.node-red
npm install node-red-contrib-afya-counter-the-new
```

Wymaga Node-RED ≥ 3.0 i Node.js ≥ 18. Węzeł **counter** jest w grupie palety **AFYA**.

**Etykiety (Labels)** – język opisów w oknie konfiguracji: *język systemu* (polski dla polskiego systemu, angielski dla każdego innego), *English* albo *Polski*. Zmieniają się tylko opisy – pola i wartości zostają takie same.

### Komendy w `msg.payload` (w trakcie liczenia)

* `reset` – czas od nowa, licznik bez zmian,
* `resetCounter` – zeruje licznik, czas bez zmian,
* `resetAll` – oba powyższe,
* `addtime` – dodaje czas liczenia do bieżącego końca,
* `kill` – kończy od razu i wysyła `end` + `waiting`,
* `destroy` – kończy bez wysyłania.

Gdy licznik stoi, dowolna wiadomość go uruchamia. Na wyjściu `state`: `counting`, `end`, a 300 ms później `waiting`.
Stan w trakcie liczenia jest w zmiennej **global** lub **flow** (czysty JSON, działa też z trwałym magazynem
kontekstu). Węzły z wcześniejszych wersji używają nadal **flow**, dopóki nie zmienisz tego w formularzu.

---

Marcin Chuć · [MIT](LICENSE)
