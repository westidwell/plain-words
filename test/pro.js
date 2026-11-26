#!/usr/bin/env node
// Checks the Pro stubs: each one refuses with a clear message and points at PRO.md.
"use strict";
const assert = require("assert");
const PRO = require("../src/pro.js");
let n = 0;
assert.strictEqual(PRO.PRO_PRICE, "$1/month");
assert.ok(PRO.PRO_URL.endsWith("/PRO.md"));
for (const fn of ["cleanWordFile", "changeReportDocx", "ownPhraseBank", "teamPhraseBank", "cleanFolder"]) {
  assert.throws(() => PRO[fn](), (e) => e instanceof PRO.ProFeature && /part of Plain Words Pro/.test(e.message) && /not open yet/.test(e.message) && e.message.includes("PRO.md"));
  n++;
}
const md = require("fs").readFileSync(require("path").join(__dirname, "..", "PRO.md"), "utf8");
for (const f of PRO.FEATURES) { assert.ok(md.includes(f.name), "PRO.md lists " + f.name); n++; }
console.log(`${n} Pro checks pass`);
