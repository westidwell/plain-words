# Contributing

Thanks for helping. Two kinds of help are especially welcome:

- **Phrase rules.** A stiff phrase that should be on the list, or a swap that gets it wrong. Open an issue with the phrase, what it should become, and a real sentence where it shows up. Rules live in `src/bank.json`.
- **Bug fixes** and **new free features** for the page or the engine.

Features listed in [PRO.md](PRO.md) are reserved for the Pro edition, so pull requests that add them will be closed with a pointer to PRO.md.

## Before you open a pull request

```sh
node build.js   # rebuild index.html from src/
npm test        # 30 samples plus the Pro checks must pass
```

If you changed a rule on purpose, run `node test/run.js --update` and read the diff of `test/expected.json` before you commit it. Keep the page dependency-free and keep everything in the browser: no network calls with the user's text, ever.
