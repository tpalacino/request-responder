import assert from "node:assert/strict";
import test from "node:test";

let listener;
let storedRules;
let dynamicRules;
let failUpdate;
let failStorage;

globalThis.chrome = {
  runtime: {
    onMessage: {
      addListener(callback) {
        listener = callback;
      },
    },
  },
  storage: {
    sync: {
      async get() {
        return { rules: structuredClone(storedRules) };
      },
      async set({ rules }) {
        if (failStorage) throw new Error("storage failure");
        storedRules = structuredClone(rules);
      },
    },
  },
  declarativeNetRequest: {
    async getDynamicRules() {
      return structuredClone(dynamicRules);
    },
    async updateDynamicRules({ removeRuleIds, addRules }) {
      if (failUpdate) throw new Error("invalid rule");
      dynamicRules = [
        ...dynamicRules.filter(rule => !removeRuleIds.includes(rule.id)),
        ...structuredClone(addRules),
      ];
    },
  },
};

await import("../dist/background.js");

function send(id, enabled) {
  return new Promise(resolve => {
    assert.equal(listener({ type: "toggleRule", id, enabled }, {}, resolve), true);
  });
}

function reset() {
  storedRules = [
    { id: "one", name: "One", match: "one", replacement: "https://example.com/one", disabled: false },
    { id: "two", name: "Two", match: "two", replacement: "https://example.com/two", disabled: true },
  ];
  dynamicRules = [{ id: 1, condition: { regexFilter: "one" } }];
  failUpdate = false;
  failStorage = false;
}

test("toggles rules in storage and active dynamic rules, including rapid changes", async () => {
  reset();
  assert.deepEqual(await Promise.all([send("one", false), send("two", true)]), [{}, {}]);
  assert.deepEqual(storedRules.map(rule => rule.disabled), [true, false]);
  assert.deepEqual(dynamicRules.map(rule => rule.condition.regexFilter), ["two"]);
  assert.deepEqual(await send("one", true), {});
  assert.deepEqual(dynamicRules.map(rule => rule.condition.regexFilter), ["one", "two"]);
});

test("does not overwrite rules when a rule was deleted", async () => {
  reset();
  assert.match((await send("missing", true)).error, /no longer exists/);
  assert.deepEqual(storedRules.map(rule => rule.disabled), [false, true]);
});

test("failed updates retain existing dynamic and stored rules", async () => {
  reset();
  const originalDynamicRules = structuredClone(dynamicRules);
  failUpdate = true;
  assert.match((await send("one", false)).error, /Could not update/);
  assert.deepEqual(dynamicRules, originalDynamicRules);
  assert.deepEqual(storedRules.map(rule => rule.disabled), [false, true]);
});

test("storage failures restore the previous dynamic rules", async () => {
  reset();
  const originalDynamicRules = structuredClone(dynamicRules);
  failStorage = true;
  assert.match((await send("one", false)).error, /Could not update/);
  assert.deepEqual(dynamicRules, originalDynamicRules);
  assert.deepEqual(storedRules.map(rule => rule.disabled), [false, true]);
});
