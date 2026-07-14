# Opal Scripting Support (JetBrains)

A JetBrains IDE plugin (IntelliJ IDEA / WebStorm) that improves the developer
experience for writing [Opal](https://opal.wtf) scripts -- plain `.js` files
run by Opal's GraalVM JavaScript scripting engine, which injects global proxy
objects (`client`, `player`, `world`, `renderer`, `notification`, `overlay`,
`modules`, `mc`, `movement`, `rotation`, `inventory`, `esp`, `palette`, plus
bound types like `BlockPos`/`Vec2f`/`Color`/`MAIN_HAND`) into every script's
scope at runtime -- no import/require step.

## Scope: what this is, and isn't

Full custom-language tooling for Opal scripts -- a real PSI parser, semantic
type inference, go-to-definition across the proxy API -- would need the
IntelliJ Platform SDK's language injection framework and is a multi-month
undertaking. That is **not** what this plugin does.

Instead, it leans entirely on IntelliJ's own, already excellent, built-in
JavaScript/TypeScript support: WebStorm and IntelliJ IDEA Ultimate (with the
bundled JavaScript plugin enabled) already understand JSDoc/TypeScript
ambient global declarations. Ship an accurate `.d.ts` and the native engine
gives you real completion, parameter hints, and quick docs -- for free, no
PSI layer required.

## Features

1. **`opal-globals.d.ts`** (`src/main/resources/opal-globals.d.ts`) -- a
   hand-written ambient TypeScript declaration file covering every proxy
   global and its methods: `client`, `notification`, `overlay`, `modules`,
   `mc`, `player`, `movement`, `rotation`, `inventory`, `world`, `esp`,
   `renderer`, `palette`, `keys`, the `module.on(...)` event map (with a
   typed payload interface per event), the bound Java interop types
   (`Vec2f`, `BlockPos`, `Direction`, `RaytracedRotation`, `Color`,
   `MAIN_HAND`/`OFF_HAND`), and the `registerScript`/`registerModule`
   settings API. It is not a module (no top-level `import`/`export`), so it
   behaves exactly like the runtime does: every declaration is a true global.

   - **File | New | Opal Script** copies this file into the project root the
     first time you scaffold a script (if it isn't already there).
   - **Tools | Insert/Update Opal Type Definitions** copies or refreshes it
     into the current project at any time (this one always overwrites, so
     use it to pick up a newer version of this plugin's type definitions).

2. **Live templates** (group "Opal Scripting", `src/main/resources/liveTemplates/OpalScripting.xml`):

   | Abbreviation | Expands to |
   |---|---|
   | `opalscript` | `registerScript({...})` entry point |
   | `opalmodule` | `script.registerModule({...}, (module) => {...})` with enable/disable |
   | `opalevent` | `module.on("event", (event) => {...})` |
   | `opalbool` | `module.addBool(...)` |
   | `opalnumber` | `module.addNumber(...)` |
   | `opalmode` | `module.addMode(...)` |
   | `opalgroup` | `module.addGroup(...)` |
   | `opalsettings` | one of each setting type + a group, wired together |
   | `opalisland` | `overlay.createIsland({...})` + `showIsland` |
   | `opalpalette` | `palette.createView({...})` + `openView` |

   Trigger them by typing the abbreviation and pressing Tab in any file (the
   templates aren't hard-scoped to a custom Opal file type -- there is none --
   so they're registered broadly; in practice you'll invoke them in the `.js`
   files under your `opal/scripts/` folder).

3. **File | New | Opal Script** -- scaffolds a starter script (an
   `internalFileTemplate`, `src/main/resources/fileTemplates/internal/Opal Script.js.ft`)
   with working `registerScript`/`registerModule` boilerplate: an `Enabled`
   toggle, `enable`/`preGameTick`/`renderScreen`/`disable` handlers already
   wired up.

## Build status

`./gradlew build` and `./gradlew buildPlugin` both succeed against IntelliJ
Platform Gradle Plugin `2.1.0` + Gradle `8.7` + IntelliJ IDEA Community
`2024.1` (the `platformType`/`platformVersion` pinned in `gradle.properties`).
Verified locally: `BUILD SUCCESSFUL`, and the packaged
`build/distributions/opal-scripting-intellij-0.1.0.zip` contains the
compiled action classes, `plugin.xml`, `opal-globals.d.ts`, the live
templates, and the file template.

Gradle reports that `org.jetbrains.intellij.platform` `2.1.0` is outdated
(latest was `2.18.1` at build time) and recommends upgrading. That upgrade is
a deliberate follow-up, not done here: `2.18.1` requires Gradle `9.0+`, and
once on Gradle 9 its `intellijPlatform { dependencies { ... } }` block no
longer accepts `instrumentationTools()` in the shape used here (removed or
renamed somewhere between `2.1.0` and `2.18.1`) -- bumping both needs someone
with access to the plugin's current migration notes to update the
`dependencies` block accordingly, so this was left on the last version
verified to build cleanly end-to-end rather than shipped half-migrated.

## Install from source

This plugin is not yet published to the JetBrains Marketplace. To try it:

```bash
cd intellij
./gradlew buildPlugin        # or gradlew.bat on Windows
```

This produces a distributable zip under `build/distributions/`. Install it
in IntelliJ IDEA or WebStorm via:

**Settings/Preferences -> Plugins -> gear icon -> Install Plugin from Disk...**
and point it at the generated zip.

Or, for iterative development, run a disposable sandbox IDE with the plugin
already loaded:

```bash
./gradlew runIde
```

## Requirements

- The scaffolding, live templates, and "New Opal Script" action work in any
  IntelliJ Platform IDE (2024.1+).
- The actual autocompletion/quick-docs payoff from `opal-globals.d.ts`
  requires the bundled JavaScript/TypeScript engine, which ships in
  WebStorm and is available (bundled, toggleable) in IntelliJ IDEA
  Ultimate. It is not present in IntelliJ IDEA Community.

## Project layout

```
intellij/
  build.gradle.kts             IntelliJ Platform Gradle Plugin (2.x) build script
  settings.gradle.kts
  gradle.properties            plugin id/version/build-range + target platform
  gradlew, gradlew.bat, gradle/wrapper/
  src/main/kotlin/com/opalclient/scripting/
    actions/
      NewOpalScriptAction.kt        File | New | Opal Script
      InsertOpalGlobalsAction.kt    Tools | Insert/Update Opal Type Definitions
      OpalGlobalsInstaller.kt       shared copy-into-project logic
    icons/
      OpalIcons.kt
  src/main/resources/
    META-INF/plugin.xml
    opal-globals.d.ts               the ambient type declarations (the main deliverable)
    fileTemplates/internal/Opal Script.js.ft
    liveTemplates/OpalScripting.xml
    icons/opalScript.svg
```

## Known limitations

- Live template contexts are registered broadly (`OTHER` plus a best-effort
  `JS_EXPRESSION`/`JS_STATEMENT` match if the bundled JS plugin is present)
  rather than scoped to a dedicated "Opal Script" file type, because there is
  no such file type -- Opal scripts are plain `.js`. This means the
  `opal*` abbreviations are technically available in any file, not just
  Opal scripts.
- `opal-globals.d.ts` models the scripting API as documented in
  `opalclient/resources/docs/en/scripting/**`. Two of that doc set's older,
  pre-reorganization pages (`reference/interaction.mdx`'s `player`/`inventory`
  examples, and `intro.mdx`'s `eyePos.getY()` snippet) contradict the newer,
  more precise `character/player.mdx` and `world/types.mdx` pages about
  whether `Vec3d`'s methods are callable by readable name from script code --
  they are not (Fabric intermediary mappings rename them at runtime). This
  file follows the newer, more precise pages: `Vec3d`/`Vec3i`/`MathHelper`
  are modeled as opaque construct-and-pass-through types with no callable
  instance methods, matching the documented runtime behaviour.
