# Opal Scripting IDE

Editor tooling for writing [Opal](https://opal.wtf) scripts. Opal is a Minecraft utility client
with a GraalVM JavaScript scripting engine. Scripts are plain `.js` files; the engine injects a set
of global proxy objects (`client`, `player`, `world`, `renderer`, `notification`, `overlay`,
`modules`, `mc`, `movement`, `rotation`, `inventory`, `esp`, `palette`, plus bound Java types like
`BlockPos`/`Vec2f`/`Color`/`MAIN_HAND`) directly into a script's scope at runtime. There is no
`import`/`require` step, which also means there is no built-in discoverability for the API surface.
This repo's job is to give editors that discoverability back.

This is a monorepo of two independent editor integrations built against the same scripting API:

- **[`vscode/`](vscode/)**: a VS Code extension. Ships ambient TypeScript/JSDoc type definitions
  for every scripting global (so hovering or autocompleting `player.` or `renderer.` in a plain `.js`
  file shows real signatures and docs), boilerplate snippets, and an `Opal: New Script` scaffolding
  command.
- **[`intellij/`](intellij/)**: a JetBrains plugin (IntelliJ IDEA / WebStorm) providing the equivalent
  experience for JetBrains editors: ambient type definitions, live templates, and a matching
  new-script action.

Both integrations are generated from the same ground truth: the scripting docs shipped in
`resources/docs/en/scripting/` in the main Opal client repository (events, settings, and one
reference page per proxy global). If the runtime API changes, that's where the fix starts. The
editor tooling here should be regenerated to match, not hand-patched to disagree with it.

## Repository layout

```
vscode/      VS Code extension — see vscode/README.md for install + usage
intellij/    JetBrains plugin — see intellij/README.md for install + usage
```

Each subdirectory is a self-contained project with its own build. There is no shared build step or
shared package between them today, and duplication between the two is expected and acceptable, since
they target different plugin platforms (VS Code's extension API vs. IntelliJ's plugin SDK) with
different type systems (TypeScript/JSDoc vs. Kotlin/Java).

## Status

Both extensions work today. The VS Code extension compiles clean and its ambient types, snippets,
and scaffold command all run against a plain `.js` workspace; see `vscode/README.md` for what's left
(Marketplace publishing, an extension icon). The JetBrains plugin builds and packages with
`./gradlew buildPlugin`; see `intellij/README.md` for its current status and the Gradle/IntelliJ
Platform version it targets.

## For AI agents

See [`CLAUDE.md`](CLAUDE.md) for the mental model an assistant needs before touching this repo, and
[`llms.txt`](llms.txt) for a structured file index. In short: this is two independent editor
plugins that happen to share a repo and a source-of-truth doc set. Changes to one almost never
require changes to the other; don't assume shared code exists where a `grep` doesn't find any.
