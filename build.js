#!/usr/bin/env node
// Folds the engine and the phrase bank into one self-contained page: index.html.
// Usage: node build.js
"use strict";
const fs = require("fs"), path = require("path");
const here = (...p) => path.join(__dirname, ...p);
const page = fs.readFileSync(here("src", "page.html"), "utf8");
const engine = fs.readFileSync(here("src", "engine.js"), "utf8");
const bank = JSON.parse(fs.readFileSync(here("src", "bank.json"), "utf8"));
if (/<\/script/i.test(engine)) throw new Error("engine.js must not contain a closing script tag");
const bankJson = JSON.stringify(bank).replace(/</g, "\\u003c");
for (const mark of ["/*__BANK__*/", "/*__ENGINE__*/"]) if (!page.includes(mark)) throw new Error("page.html is missing " + mark);
const out = page.replace("/*__BANK__*/", () => bankJson).replace("/*__ENGINE__*/", () => engine);
fs.writeFileSync(here("index.html"), out);
console.log(`index.html written, ${out.length.toLocaleString()} bytes, ${bank.rules ? bank.rules.length : "?"} rules`);
