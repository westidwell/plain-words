/* Plain Words engine (browser and Node).
   Nothing leaves the page: it takes text and a bank and returns the cleaned text and the list of changes. */
(function (root) {
  "use strict";
  var VERSION = "1.0.0";
  var W = "\\p{L}\\p{N}_";              // Python's Unicode \w
  var HOWS = ["Swap", "Check", "Flag"];

  // ------------------------------------------------------------------ Python regex -> JS regex
  var SYNTAX = "^$\\.*+?()[]{}|/";
  function pyToJs(src) {
    var flags = "gu";
    var m = /^\(\?([aiLmsux]+)\)/.exec(src);
    if (m) {
      src = src.slice(m[0].length);
      if (m[1].indexOf("i") >= 0) flags += "i";
      if (m[1].indexOf("m") >= 0) flags += "m";
      if (m[1].indexOf("s") >= 0) flags += "s";
    }
    var out = "", inClass = false, i = 0;
    var bWord = "(?:(?<=[" + W + "])(?![" + W + "])|(?<![" + W + "])(?=[" + W + "]))";
    var bNot = "(?:(?<=[" + W + "])(?=[" + W + "])|(?<![" + W + "])(?![" + W + "]))";
    while (i < src.length) {
      var c = src[i];
      if (c === "\\" && i + 1 < src.length) {
        var n = src[i + 1];
        i += 2;
        if (n === "w") { out += inClass ? W : "[" + W + "]"; continue; }
        if (n === "W") { out += inClass ? "\\P{L}" : "[^" + W + "]"; continue; }
        if (n === "b" && !inClass) { out += bWord; continue; }
        if (n === "B" && !inClass) { out += bNot; continue; }
        if (n === "A") { out += "^"; continue; }
        if (n === "Z") { out += "$"; continue; }
        if (/[0-9A-Za-z]/.test(n)) { out += "\\" + n; continue; }   // \s \d \n \t \u etc.
        if (SYNTAX.indexOf(n) >= 0 || (inClass && n === "-")) { out += "\\" + n; continue; }
        out += n;                                                 // \' \" \, ... are plain in JS
        continue;
      }
      if (inClass) {
        if (c === "]") inClass = false;
        out += c; i++; continue;
      }
      if (c === "[") {
        inClass = true; out += c; i++;
        if (src[i] === "^") { out += "^"; i++; }
        if (src[i] === "]") { out += "\\]"; i++; }
        continue;
      }
      if (c === "(" && src.slice(i, i + 4) === "(?P<") { out += "(?<"; i += 4; continue; }
      if (c === "(" && src.slice(i, i + 4) === "(?P=") {
        var end = src.indexOf(")", i);
        out += "\\k<" + src.slice(i + 4, end) + ">"; i = end + 1; continue;
      }
      if (c === "$" && flags.indexOf("m") < 0) { out += "(?=\\n?$)"; i++; continue; }
      out += c; i++;
    }
    return new RegExp(out, flags);
  }

  function escJs(ch) { return SYNTAX.indexOf(ch) >= 0 ? "\\" + ch : ch; }

  function compileRule(r) {
    if (r.kind === "Pattern") return pyToJs(r.find);
    var text = r.find.trim().replace(/\s+/g, " ");
    var parts = [];
    for (var ch of text) {
      if (ch === " ") parts.push("\\s+");
      else if (ch === "-" || ch === "‐" || ch === "‑") parts.push("[\\-\\u2010\\u2011\\s]");
      else if (ch === "'" || ch === "’") parts.push("['\\u2019]");
      else parts.push(escJs(ch));
    }
    var isW = new RegExp("^[" + W + "]", "u");
    var chars = Array.from(text);
    var left = isW.test(chars[0]) ? "(?<![" + W + "\\-])" : "";
    var right = isW.test(chars[chars.length - 1]) ? "(?![" + W + "\\-])" : "";
    return new RegExp(left + parts.join("") + right, "giu");
  }

  // ------------------------------------------------------------------ bank
  function cap1(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s; }

  function loadBank(json) {
    var rules = [], never = [], problems = [];
    var list = Array.isArray(json) ? json : (json.rules || []);
    list.forEach(function (x, idx) {
      var row = idx + 2;
      var g = function (k) { var v = x[k]; if (v === undefined) v = x[k.replace(" ", "_")]; return v === undefined || v === null ? "" : String(v); };
      var on = (g("on") || "Y").trim().toUpperCase().slice(0, 1) || "Y";
      if (on === "N") return;
      var kind = cap1(g("type").trim() || "Word");
      if (kind === "Never") { never.push(g("find").trim()); return; }
      var find = kind === "Pattern" ? g("find") : g("find").trim();
      var change = kind === "Pattern" ? g("change to") : g("change to").trim();
      var how = cap1(g("how").trim() || "Swap");
      if (!find) return;
      if (HOWS.indexOf(how) < 0) { problems.push("Row " + row + ": How must be Swap, Check or Flag; treated as Flag"); how = "Flag"; }
      rules.push({ kind: kind, find: find, change: change, how: how, group: g("group").trim(), why: g("why").trim(), row: row, regex: null });
    });
    (json.never || []).forEach(function (t) { if (String(t).trim()) never.push(String(t).trim()); });
    var ok = [];
    rules.forEach(function (r) {
      try { r.regex = compileRule(r); ok.push(r); }
      catch (e) { problems.push("Row " + r.row + ": pattern skipped, it doesn't work (" + e.message + ")"); }
    });
    return { rules: ok, never: never, problems: problems };
  }

  // ------------------------------------------------------------------ engine
  var PROTECT = [/```[\s\S]*?```/gu, /`[^`\n]+`/gu, /https?:\/\/[^\s)>\]]+/gu,
    new RegExp("(?:(?<=[" + W + "])(?![" + W + "])|(?<![" + W + "])(?=[" + W + "]))www\\.[^\\s)>\\]]+", "gu"),
    new RegExp("[" + W + ".+\\-]+@[" + W + "\\-]+\\.[" + W + ".\\-]+", "gu"),
    /\]\([^)\n]*\)/gu, /<[^<>\n]+>/gu];
  var QUOTES = [/"[^"\n]{1,300}"/gu, /“[^”\n]{1,300}”/gu];

  function spansOf(rx, text) {
    var out = [];
    for (var m of text.matchAll(rx)) out.push([m.index, m.index + m[0].length]);
    return out;
  }

  function protectedSpans(text, never, quotes, extra) {
    var spans = (extra || []).slice();
    PROTECT.concat(quotes ? QUOTES : []).forEach(function (rx) { spans = spans.concat(spansOf(rx, text)); });
    never.forEach(function (term) {
      if (!term) return;
      var esc = Array.from(term).map(escJs).join("");
      spans = spans.concat(spansOf(new RegExp("(?<![" + W + "])" + esc + "(?![" + W + "])", "giu"), text));
    });
    spans.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    return spans;
  }

  function overlaps(spans, s, e) {
    for (var i = 0; i < spans.length; i++) if (spans[i][0] < e && s < spans[i][1]) return true;
    return false;
  }

  function scan(text, rules, never, quotes, extra, singleLine) {
    var prot = protectedSpans(text, never, quotes, extra);
    var cands = [], flags = [];
    rules.forEach(function (r) {
      r.regex.lastIndex = 0;
      for (var m of text.matchAll(r.regex)) {
        var s = m.index, e = s + m[0].length;
        if (s === e || overlaps(prot, s, e)) continue;
        if (singleLine && m[0].indexOf("\n") >= 0) continue;
        var h = { s: s, e: e, rule: r, m: m, text: m[0], repl: null, cap: false };
        (r.how === "Flag" ? flags : cands).push(h);
      }
    });
    cands.sort(function (a, b) { return (b.e - b.s) - (a.e - a.s) || a.rule.row - b.rule.row; });
    var chosen = [];
    cands.forEach(function (h) {
      if (!chosen.some(function (c) { return c.s < h.e && h.s < c.e; })) chosen.push(h);
    });
    chosen.sort(function (a, b) { return a.s - b.s; });
    var taken = chosen.map(function (c) { return [c.s, c.e]; });
    var seen = {}, kept = [];
    flags.slice().sort(function (a, b) { return a.s - b.s || (b.e - b.s) - (a.e - a.s); }).forEach(function (f) {
      var key = f.s + ":" + f.e;
      if (overlaps(taken, f.s, f.e) || seen[key] || kept.some(function (k) { return k.s <= f.s && f.e <= k.e; })) return;
      seen[key] = 1;
      kept.push(f);
    });
    return { chosen: chosen, flags: kept, prot: prot };
  }

  var isAlpha = function (c) { return /\p{L}/u.test(c); };
  var isUpper = function (c) { return c !== c.toLowerCase(); };
  var isLower = function (c) { return c !== c.toUpperCase(); };

  function casing(repl, matched) {
    if (!repl) return repl;
    var letters = Array.from(matched).filter(isAlpha);
    if (letters.length > 1 && letters.every(function (c) { return isUpper(c) && !isLower(c); })) return repl.toUpperCase();
    var first = letters[0] || "";
    var r = Array.from(repl);
    var k = r.findIndex(isAlpha);
    if (k < 0) return repl;
    if (first && isUpper(first)) { r[k] = r[k].toUpperCase(); return r.join(""); }
    if (first && isLower(first)) { r[k] = r[k].toLowerCase(); return r.join(""); }
    return repl;
  }

  var LINE_PREFIX = /^[ \t]*(?:[-*+][ \t]+|\d+[.)][ \t]+|#{1,6}[ \t]+|>[ \t]*)?(?:\*\*|__|\*|_)?[ \t]*(?=\n?$)/;

  function atSentenceStart(text, pos) {
    var i = pos;
    while (i > 0 && " \t".indexOf(text[i - 1]) >= 0) i--;
    if (i === 0 || "\r\n".indexOf(text[i - 1]) >= 0) return true;
    var j = i;
    while (j > 0 && "\"'”’)*_".indexOf(text[j - 1]) >= 0) j--;
    if (j > 0 && ".!?".indexOf(text[j - 1]) >= 0) return true;
    var ls = Math.max(text.lastIndexOf("\n", pos - 1), text.lastIndexOf("\r", pos - 1)) + 1;
    if (pos === 0) ls = 0;
    return LINE_PREFIX.test(text.slice(ls, pos));
  }

  function needsAn(word) {
    var w = word.toLowerCase();
    if (["hour", "honest", "honor", "heir"].some(function (p) { return w.indexOf(p) === 0; })) return true;
    if (["uni", "use", "usu", "uti", "ura", "eu", "one", "once", "ewe"].some(function (p) { return w.indexOf(p) === 0; })) return false;
    return w.length > 0 && "aeiou".indexOf(w[0]) >= 0;
  }

  var ARTICLE = new RegExp("(?<![" + W + "'])(an|a)([ \\t]+)(?=\\n?$)", "iu");

  function fixArticle(text, ss, nextWord) {
    var m = ARTICLE.exec(text.slice(Math.max(0, ss - 6), ss));
    if (!m || !nextWord) return null;
    var art = m[1], gap = m[2];
    var want = needsAn(nextWord) ? "an" : "a";
    if (art.toLowerCase() === want) return null;
    var fixed = (art.length > 1 || (isUpper(art) && !isLower(art))) ? casing(want, art) : want;
    if (isUpper(art[0])) fixed = cap1(want);
    return [ss - m[0].length, fixed + gap];
  }

  function at(rx, text, pos) { rx.lastIndex = pos; return rx.exec(text); }
  var LOWER_WORD = new RegExp("[a-z][" + W + "'\\u2019\\-]*", "uy");
  var NEXT_WORD = new RegExp("[ \\t]*([A-Za-z][" + W + "'\\u2019\\-]*)", "uy");
  var NEXT_WORD_R = new RegExp("^[ \\t]*([A-Za-z][" + W + "'\\u2019\\-]*)", "u");

  function expand(m, tpl) {
    return tpl.replace(/\\(?:g<([^>]+)>|(\d{1,2})|(.))/g, function (_, g, d, o) {
      if (g !== undefined) { var v = /^\d+$/.test(g) ? m[+g] : (m.groups || {})[g]; return v || ""; }
      if (d !== undefined) return m[+d] || "";
      return o === "n" ? "\n" : o === "t" ? "\t" : o === "\\" ? "\\" : "\\" + o;
    });
  }

  function planEdits(text, chosen, prot) {
    var edits = [], starts = {};
    chosen.forEach(function (h) { starts[h.s] = h; });
    chosen.forEach(function (h) {
      var r = h.rule, repl;
      if (r.kind === "Pattern") repl = r.change ? expand(h.m, r.change) : "";
      else repl = casing(r.change, h.text);
      var ss = h.s, ee = h.e, m, fix;
      var last = edits.length ? edits[edits.length - 1] : null;
      if (repl === "" && r.kind === "Word") {
        if (atSentenceStart(text, h.s)) {
          while (ee < text.length && " \t".indexOf(text[ee]) >= 0) ee++;
          var nxt = starts[ee];
          if (nxt !== undefined) nxt.cap = true;
          else {
            m = at(LOWER_WORD, text, ee);
            if (m && !overlaps(prot, ee, ee + m[0].length)) {
              repl = m[0][0].toUpperCase() + m[0].slice(1);
              ee += m[0].length;
            }
          }
        } else {
          var prevEnd = last ? last[1] : -1;
          if (h.s > 0 && " \t".indexOf(text[h.s - 1]) >= 0 && (ee >= text.length || " \t,.;:!?)\r\n".indexOf(text[ee]) >= 0)) {
            if (h.s - 1 >= prevEnd) ss -= 1;
            else if (ee < text.length && " \t".indexOf(text[ee]) >= 0) ee += 1;
          } else if (prevEnd === h.s && /[ \t]$/.test(last[2]) && ee < text.length && " \t".indexOf(text[ee]) >= 0) {
            ee += 1;
          }
          m = at(NEXT_WORD, text, ee);
          fix = fixArticle(text, ss, m ? m[1] : "");
          if (fix && (!last || fix[0] >= last[1])) { ss = fix[0]; repl = fix[1].replace(/[ \t]+$/, ""); }
        }
      } else if (repl) {
        m = NEXT_WORD_R.exec(repl);
        fix = fixArticle(text, ss, m ? m[1] : "");
        if (fix && (!last || fix[0] >= last[1])) { ss = fix[0]; repl = fix[1] + repl; }
      }
      if (h.cap && repl) {
        var rr = Array.from(repl), k = rr.findIndex(isAlpha);
        if (k >= 0) { rr[k] = rr[k].toUpperCase(); repl = rr.join(""); }
      }
      if (last && ss < last[1]) ss = Math.max(ss, last[1]);
      h.repl = repl;
      edits.push([ss, ee, repl, h]);
    });
    return edits;
  }

  function applyEdits(text, edits) {
    var out = [], lastEnd = 0;
    edits.forEach(function (e) { out.push(text.slice(lastEnd, e[0]), e[2]); lastEnd = e[1]; });
    out.push(text.slice(lastEnd));
    return out.join("");
  }

  var WORDS_RX = new RegExp("[A-Za-z0-9][" + W + "'\\u2019\\-]*", "gu");
  function words(text) { var n = 0; for (var _ of text.matchAll(WORDS_RX)) n++; return n; }

  var WORD = /[A-Za-z][A-Za-z'’]*/g;
  function lw(s) { return (s.match(WORD) || []).map(function (w) { return w.toLowerCase(); }); }

  function guardRepeats(text, edits) {
    var kept = [], dropped = [], tail = "", lastEnd = 0;
    edits.forEach(function (ed) {
      var ss = ed[0], ee = ed[1], repl = ed[2], h = ed[3];
      var rw = lw(repl), ow = lw(text.slice(ss, ee));
      var prev = lw((tail + text.slice(lastEnd, ss)).slice(-60));
      var nxt = lw(text.slice(ee, ee + 60));
      var clash = null;
      if (rw.length && prev.length && prev[prev.length - 1] === rw[0] && rw[0].length > 2 && (!ow.length || ow[0] !== rw[0])) clash = rw[0];
      else if (rw.length && nxt.length && nxt[0] === rw[rw.length - 1] && rw[rw.length - 1].length > 2 && (!ow.length || ow[ow.length - 1] !== rw[rw.length - 1])) clash = rw[rw.length - 1];
      if (clash) {
        var r = h.rule;
        h.rule = { kind: r.kind, find: r.find, change: r.change, how: "Flag", group: r.group, row: r.row, regex: r.regex,
          why: ("Not changed: swapping in '" + clash + "' would put it twice in a row. " + r.why).trim() };
        dropped.push(h);
        return;
      }
      tail = (tail + text.slice(lastEnd, ss) + repl).slice(-60);
      lastEnd = ee;
      kept.push(ed);
    });
    return { kept: kept, dropped: dropped };
  }

  function round2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }

  function cleanText(text, bank, opts) {
    opts = opts || {};
    var quotes = opts.quotes !== false, never = bank.never.concat(opts.never || []);
    var sc = scan(text, bank.rules, never, quotes, opts.extra, opts.singleLine);
    var edits = planEdits(text, sc.chosen, sc.prot);
    var g = guardRepeats(text, edits);
    edits = g.kept;
    var flags = sc.flags;
    if (g.dropped.length) flags = flags.concat(g.dropped).sort(function (a, b) { return a.s - b.s; });
    var after = applyEdits(text, edits);
    var sc2 = scan(after, bank.rules, never, quotes, [], opts.singleLine);
    var n = Math.max(words(text), 1);
    return {
      before: text, after: after, edits: edits, flags: flags, words: words(text),
      changed: edits.filter(function (e) { return e[3].rule.how === "Swap"; }).length,
      checked: edits.filter(function (e) { return e[3].rule.how === "Check"; }).length,
      flagged: flags.length,
      per100_before: round2((sc.chosen.length + sc.flags.length) * 100 / n),
      per100_after: round2((sc2.chosen.length + sc2.flags.length) * 100 / Math.max(words(after), 1)),
      left_after: sc2.chosen.length + sc2.flags.length
    };
  }

  function lineIndex(text) {
    var nl = []; for (var i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) nl.push(i);
    return function (pos) { var lo = 0, hi = nl.length; while (lo < hi) { var mid = (lo + hi) >> 1; if (nl[mid] < pos) lo = mid + 1; else hi = mid; } return lo + 1; };
  }

  function snippet(text, s, e, pad) {
    pad = pad || 50;
    var a = Math.max(0, s - pad), b = Math.min(text.length, e + pad);
    if (s - pad > 0) { var sp = text.lastIndexOf(" ", s - pad + 9); if (sp >= a) a = sp + 1; }
    var left = (a > 0 ? "..." : "") + text.slice(a, s), right = text.slice(e, b) + (b < text.length ? "..." : "");
    return [left.replace(/\n/g, " "), text.slice(s, e).replace(/\n/g, " "), right.replace(/\n/g, " ")];
  }

  /** Every change and flag in reading order, for the page to show. */
  function items(res) {
    var t = res.before, out = [], lineOf = lineIndex(t);
    res.edits.forEach(function (ed) {
      var h = ed[3];
      out.push({ kind: h.rule.how, pos: ed[0], end: ed[1], before: t.slice(ed[0], ed[1]), after: ed[2], group: h.rule.group, why: h.rule.why, row: h.rule.row, line: lineOf(ed[0]), context: snippet(t, ed[0], ed[1]) });
    });
    res.flags.forEach(function (f) {
      out.push({ kind: "Flag", pos: f.s, end: f.e, before: f.text, after: f.rule.change, group: f.rule.group, why: f.rule.why, row: f.rule.row, line: lineOf(f.s), context: snippet(t, f.s, f.e) });
    });
    out.sort(function (a, b) { return a.pos - b.pos; });
    return out;
  }

  var api = { VERSION: VERSION, loadBank: loadBank, cleanText: cleanText, items: items, words: words, pyToJs: pyToJs };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PlainWords = api;
})(typeof window !== "undefined" ? window : this);
