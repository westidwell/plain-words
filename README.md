# Plain Words

**A plain-English editor for business writing.** Paste a draft and Plain Words swaps stiff words for plain ones, then marks the judgment calls for you to look at. It runs entirely in your browser: no account, no server, nothing you paste ever leaves the page.

**[Try it →](https://westidwell.github.io/plain-words/)**

<!-- Screenshot goes here: docs/screenshot.png, captured from the live page. -->

## What it does

Before:

> I wanted to reach out to provide a comprehensive update. In order to ensure a seamless transition, we will utilize a phased approach and leverage the new scanners.

After:

> I wanted to reach out to provide a full update. To ensure a smooth transition, we will use a phased approach and use the new scanners.

Stiff spots per 100 words: **17.9 → 0**. Three plain swaps were made on their own. Two more ("comprehensive" and "leverage") were changed and listed for you to check, because they're sometimes the right word.

## How it works

Every rule in the phrase bank (`src/bank.json`, 206 rules) is one of three kinds:

| Kind | What happens | Example |
| --- | --- | --- |
| **Swap** (86) | Changed. Safe every time. | utilize → use |
| **Check** (55) | Changed, and listed so you can look. | leverage → use |
| **Flag** (65) | Never changed, only marked. | "game-changer", "it's not just X, it's Y" |

It leaves alone anything that isn't yours to rewrite: code, links, email addresses, quoted text, and any words you add to the "Words to leave alone" list. It fixes "a/an" after a swap, keeps capitals at the start of a sentence, and won't make a swap that puts the same word twice in a row.

The proof pane shows every change marked up, a "Look at these first" list jumps to the judgment calls, and **Save copy and report** gives you the clean text plus a Markdown report of every change.

## Free vs Pro

| | Free (this repo) | Pro ($1/month, not open yet) |
| --- | --- | --- |
| Paste and clean, unlimited | Yes | Yes |
| Marked-up proof, "Look at these first", every change | Yes | Yes |
| Copy, save clean text and a Markdown report | Yes | Yes |
| Word files in and out, with tracked changes | | Yes |
| Change report as a Word document | | Yes |
| Your own phrase bank, and a team bank | | Yes |
| Clean a whole folder at once | | Yes |

Pro features show as locked buttons on the page. See [PRO.md](PRO.md).

## Use it

- **On the web:** open the [live page](https://westidwell.github.io/plain-words/).
- **Offline:** download `index.html` and open it in any browser. It's one self-contained file.
- **In your own code:** `src/engine.js` works in the browser (`window.PlainWords`) and in Node.

```js
const PW = require("./src/engine.js");
const bank = PW.loadBank(require("./src/bank.json"));
const result = PW.cleanText("We will utilize the new process.", bank);
console.log(result.after); // "We will use the new process."
```

## Build and test

Needs Node 18 or newer. No dependencies.

```sh
node build.js      # folds src/ into index.html
npm test           # 30 samples must match test/expected.json, plus the Pro checks
```

After a deliberate rule change, run `node test/run.js --update` and read the diff of `test/expected.json` before you commit it.

## Suggest a rule

See [CONTRIBUTING.md](CONTRIBUTING.md). Found a phrase that should be on the list, or a swap that gets it wrong? [Open an issue](https://github.com/westidwell/plain-words/issues) with the phrase, what it should become, and a sentence where it shows up. Rules live in `src/bank.json`:

```json
{ "type": "Word", "find": "utilize", "change_to": "use", "how": "Swap", "group": "Plain word", "why": "Plain word does the same job" }
```

## Privacy

The page makes no network calls with your text. Your settings and your last draft are kept in your browser's local storage so they're there next time; **Clear** empties the draft. There's no tracking or analytics of any kind.

## License

[MIT](LICENSE). If Plain Words saves you some editing, a star helps other people find it.
