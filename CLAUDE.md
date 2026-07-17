# CLAUDE.md

Guidance for an AI assistant working in this repository.

## 30-second mental model

This repo is **two independent editor plugins that happen to share a source of truth**, not a
shared codebase. `vscode/` is a VS Code extension (TypeScript, VS Code Extension API). `intellij/`
is a JetBrains plugin (Kotlin/Java, IntelliJ Platform SDK). They do not import from each other, do
not share a build, and are developed on separate branches by separate agents. If you're touching
one, you almost never need to touch the other — resist the urge to "keep them in sync" beyond both
describing the same runtime API.

The thing both plugins actually model is **Opal's scripting API surface**: a fixed set of ambient
global objects (`client`, `player`, `world`, `renderer`, `notification`, `overlay`, `modules`, `mc`,
`movement`, `rotation`, `inventory`, `esp`, `palette`, `keys`, plus bound Java types like `BlockPos`
/ `Vec2f` / `Color` / `MAIN_HAND`) that Opal's GraalVM JS engine injects into every `.js` script at
runtime. There is no import/require for any of it. The docs for that API live outside this repo, in
the main Opal client repo at `resources/docs/en/scripting/` — every method signature declared in
either plugin should trace back to a `<Method>` tag in those docs, not to guesswork.

## Patterns that matter

- **The Java is ground truth. The docs are a derived artifact, and they have been wrong.** The
  authority for any signature is the `@HostAccess.Export` set on the proxies under
  `src/main/java/wtf/opal/scripting/` in the opal client repo. Use the docs for prose, but when
  they disagree with the Java, the Java wins — it is what executes. Several doc pages taught
  idioms that never worked at runtime (a `mc.player` example in `WorldProxy`'s class javadoc is
  the likely origin of a pattern that then spread to 27 call sites across the example gallery).
  Don't hand-invent a signature, and don't trust a `<Method>` tag you haven't checked against the
  Java.
- **The sandbox is why the types look the way they do.** Scripts run under GraalVM
  `HostAccess.EXPLICIT`: default-deny, with no member access on un-annotated types, no
  bean-property mapping, and no container access. Anything that is not a primitive, a `String`, or
  an `@HostAccess.Export`-annotated member is invisible — *silently*, as `undefined`. So: getters
  never properties (`box.getX()`, not `box.x`), a `ScriptList` reads as a read-only array
  (`length`, `[i]`, `for..of`, and still `size()`/`get(i)`) but refuses writes, and a memberless
  brand type genuinely has no members. A wrong signature
  here is worse than a missing one — it is what script authors code against, and it fails quietly
  in-game rather than loudly in an editor.
- **`vscode/typings/opal-globals.d.ts` is the single highest-value file in this repo.** It is a pure
  ambient global declaration file (no top-level `import`/`export`) so TypeScript treats every
  interface and `declare const` as global scope — exactly matching how the runtime injects these
  names. Keep it that way; wrapping it in `declare global { ... }` would require making the file a
  module (adding an import/export), which is unnecessary complexity here.
- **The VS Code extension writes into the user's workspace, not just its own.** On activation, it
  copies its bundled `.d.ts` to `.vscode/opal.d.ts` in every open workspace folder and ensures a
  `jsconfig.json` includes it (creating a minimal one, or merging just the `include` array into an
  existing one). This is how a plain `.js` project — not a TypeScript project — gets IntelliSense.
  See `vscode/src/extension.ts`'s `installTypeDefinitions`/`ensureJsconfig`.
- **Both plugins target plain `.js` files, not a custom language.** There is no custom grammar,
  parser, or file extension to register — Opal scripts are ordinary JavaScript that VS Code/IntelliJ
  already understand. The value-add is exclusively the ambient type layer, snippets, and scaffolding
  — do not try to reinvent syntax highlighting or a language server from scratch.

## Pitfalls to avoid

- Don't assume a change in `vscode/` needs a mirrored change in `intellij/` in the same commit — they
  build independently and merge on separate branches. Cross-reference the docs, not each other.
  Similarly, don't touch files under `intellij/` from a vscode-focused change or vice versa — that's
  how the two branches collide on merge.
  - Root-level files (this one included, plus `README.md` / `LICENSE` / `llms.txt`) are shared
    governance touched by whichever agent gets there first — keep edits to them minimal and
    single-purpose so they're easy for a human to reconcile across the two branches.
- Don't add a `checkJs`-on-by-default posture to the VS Code IntelliSense setup — Opal scripts are
  loose JS calling into a sandboxed, unchecked-at-compile-time Java interop surface, and turning on
  strict checking globally would flood users who haven't opted in with noise. Type information
  should be additive (hover/autocomplete), not enforcement, unless a user explicitly adds
  `// @ts-check` to their own file.
- Don't fabricate API surface. If a doc page doesn't mention a method, it doesn't go in the type
  definitions — an incomplete-but-accurate `.d.ts` is far more useful than a complete-but-wrong one,
  since a wrong signature actively misleads autocomplete.

## Commits

Conventional Commits, no AI-attribution trailer (see `house-repo` skill / org policy) — this applies
to every commit in this repo regardless of which branch or agent produced it.
