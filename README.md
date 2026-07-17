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

## Installing from a release

Tagged releases on GitHub attach both plugins as prebuilt files, so you can install without a build:

- **VS Code** (`.vsix`): download the `opal-scripting-*.vsix` asset, open the Extensions view, click
  the `...` menu, choose **Install from VSIX...**, and point it at the file. From a terminal the
  same thing is `code --install-extension opal-scripting-<version>.vsix`.
- **JetBrains** (`.zip`): download the `opal-scripting-intellij-*.zip` asset, then open
  **Settings / Preferences -> Plugins -> gear icon -> Install Plugin from Disk...** in IntelliJ IDEA
  or WebStorm and select the zip. Leave it zipped; the IDE reads the packaged form. Restart when
  prompted.

Neither plugin is on its marketplace yet, so the release assets are how you install a build you
didn't compile yourself.

## Building the artifacts

To produce those same files locally, for a release or to test a change:

- **VS Code `.vsix`** — from `vscode/`:
  ```bash
  npm install
  npm run compile
  npx vsce package        # writes opal-scripting-<version>.vsix
  ```
- **JetBrains zip** — from `intellij/`:
  ```bash
  ./gradlew buildPlugin    # or gradlew.bat on Windows
  # writes build/distributions/opal-scripting-intellij-<version>.zip
  ```

Attach the two files to the GitHub Release for the tag. Each subproject's README covers running from
source and iterating in a live dev host.

## For AI agents

See [`CLAUDE.md`](CLAUDE.md) for the mental model an assistant needs before touching this repo, and
[`llms.txt`](llms.txt) for a structured file index. In short: this is two independent editor
plugins that happen to share a repo and a source-of-truth doc set. Changes to one almost never
require changes to the other; don't assume shared code exists where a `grep` doesn't find any.
