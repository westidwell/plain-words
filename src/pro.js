/* Plain Words Pro: what's reserved for the Pro edition.
 *
 * Pro isn't open yet. Each function below names a Pro feature and returns a
 * clear message instead of doing the work, so the free page can show the
 * feature as locked. Pull requests that build these features will be closed
 * with a pointer to PRO.md. Bug fixes and new free features are welcome.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PlainWordsPro = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PRO_PRICE = "$1/month";
  var PRO_URL = "https://github.com/westidwell/plain-words/blob/main/PRO.md";

  var FEATURES = [
    { id: "word-files", name: "Word files in and out", what: "Open a .docx and get it back cleaned, with every change as a tracked change." },
    { id: "change-report", name: "Change report as a Word document", what: "A one-page report of every swap, check and flag, ready to send with the draft." },
    { id: "own-bank", name: "Your own phrase bank", what: "Add your own rules, switch any rule off, and import or export the list." },
    { id: "team-bank", name: "Team phrase bank", what: "One shared list of rules and words to leave alone for everyone on a team." },
    { id: "batch", name: "Clean a whole folder", what: "Run every file in a folder at once and get one summary back." }
  ];

  function ProFeature(id) {
    var f = FEATURES.filter(function (x) { return x.id === id; })[0];
    var name = f ? f.name : "That feature";
    this.name = "ProFeature";
    this.feature = id;
    this.message = name + " is part of Plain Words Pro (" + PRO_PRICE + ", not open yet): see PRO.md, " + PRO_URL;
  }
  ProFeature.prototype = Object.create(Error.prototype);
  ProFeature.prototype.constructor = ProFeature;

  function locked(id) { return function () { throw new ProFeature(id); }; }

  return {
    PRO_PRICE: PRO_PRICE,
    PRO_URL: PRO_URL,
    FEATURES: FEATURES,
    ProFeature: ProFeature,
    message: function (id) { return new ProFeature(id).message; },
    /** Clean a Word file and return it with tracked changes. Pro. */
    cleanWordFile: locked("word-files"),
    /** Build the change report as a Word document. Pro. */
    changeReportDocx: locked("change-report"),
    /** Load, edit, import or export your own phrase bank. Pro. */
    ownPhraseBank: locked("own-bank"),
    /** Share one phrase bank across a team. Pro. */
    teamPhraseBank: locked("team-bank"),
    /** Clean every file in a folder at once. Pro. */
    cleanFolder: locked("batch")
  };
});
