#!/usr/bin/env node
// Runs every sample through the engine and compares it with the saved expected results.
// Usage: node test/run.js            check
//        node test/run.js --update   rewrite test/expected.json after a deliberate rule change
"use strict";
const fs = require("fs"), path = require("path");
const PW = require("../src/engine.js");
const bank = PW.loadBank(JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "bank.json"), "utf8")));
const samples = JSON.parse(fs.readFileSync(path.join(__dirname, "samples.json"), "utf8"));
const expFile = path.join(__dirname, "expected.json");
const got = samples.map((t) => {
  const r = PW.cleanText(t, bank);
  return { after: r.after, words: r.words, changed: r.changed, checked: r.checked, flagged: r.flagged,
    per100_before: r.per100_before, per100_after: r.per100_after, items: PW.items(r).length };
});
if (process.argv.includes("--update")) {
  fs.writeFileSync(expFile, JSON.stringify(got, null, 1) + "\n");
  console.log(`expected.json rewritten for ${got.length} samples`);
  process.exit(0);
}
const want = JSON.parse(fs.readFileSync(expFile, "utf8"));
let bad = 0;
got.forEach((g, i) => {
  const w = want[i] || {};
  const diff = Object.keys(g).filter((k) => JSON.stringify(g[k]) !== JSON.stringify(w[k]));
  if (diff.length) { bad++; console.log(`sample ${i}: differs in ${diff.join(", ")}`); }
});
if (bank.problems && bank.problems.length) { bad++; console.log("phrase bank problems:", bank.problems); }
console.log(`${got.length - bad} of ${got.length} samples match` + (bad ? "" : ", phrase bank has " + bank.rules.length + " rules"));
process.exit(bad ? 1 : 0);
