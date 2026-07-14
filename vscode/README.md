# Opal Scripting (VS Code)

IntelliSense, snippets, and scaffolding for [Opal](https://opal.wtf)'s scripting engine: GraalVM
JavaScript, hot-reloaded from `opal/scripts/`. Scripts are plain `.js` files; the engine injects
global proxy objects (`client`, `player`, `world`, `renderer`, `notification`, `overlay`, `modules`,
`mc`, `movement`, `rotation`, `inventory`, `esp`, `palette`, `keys`, plus bound types like
`BlockPos`/`Vec2f`/`Color`/`MAIN_HAND`) directly into a script's scope at runtime; there's no
`import`/`require` step. This extension exists to make that invisible API surface visible in the
editor.

## Features

- **Full IntelliSense for every ambient global.** Hovering `player.`, `renderer.`, `world.`, or any
  other proxy shows the real method signature, parameter names/types, and a description sourced
  directly from Opal's scripting docs, in a plain `.js` file, with no changes to how you write
  scripts. This covers every proxy (`client`, `player`, `movement`, `rotation`, `world`, `inventory`,
  `renderer`, `overlay`, `esp`, `modules`, `notification`, `palette`, `mc`), every event payload
  (`preGameTick`, `renderScreen`, `preMovementPacket`, `chatReceived`, …), the `registerScript` /
  `registerModule` / settings API, and the bound Java interop types (`Vec3d`, `Vec2f`, `BlockPos`,
  `Direction`, `Color`, `MAIN_HAND`/`OFF_HAND`, `keys`).
- **Snippets** for the boilerplate you type constantly: a full script scaffold, a bare
  `registerModule` block, an event handler, each of the four setting types (bool/number/mode/group),
  a command-palette view registration, and a Dynamic Island overlay registration. Every snippet body
  is real code that runs, not a placeholder.
- **`Opal: New Script` command.** Run it from the Command Palette (`Ctrl+Shift+P` /
  `Cmd+Shift+P`), give it a name, and it drops a starter `.js` file into your workspace with a
  module registration, a settings example, and a commented-out render handler: the fastest way
  from "empty folder" to a loaded module.
- **`Opal: Install Type Definitions` command.** Re-runs the IntelliSense setup on demand (useful
  right after installing the extension into a workspace you already had open, or if you deleted the
  generated files).

## Installing (from source)

The extension isn't on the Marketplace yet. To run it from source:

1. Clone this repository and open the `vscode/` folder in VS Code.
2. `npm install`
3. `npm run compile` (or `npm run watch` while you're iterating on the extension itself)
4. Press `F5` to launch an Extension Development Host with the extension loaded.
5. In that new window, open the folder where your `.js` scripts live (typically your Opal
   `opal/scripts/` directory) and start typing. Hover and autocomplete should work immediately.

To install it into your everyday VS Code instead of just the dev host, package it with
`npx vsce package` (from `vscode/`) and install the resulting `.vsix` via the Extensions view's
"Install from VSIX..." command.

## How the IntelliSense actually works

Opal scripts are plain JavaScript, not TypeScript. There's nothing to compile and nothing you need
to opt into. On activation (and whenever a new workspace folder is added), the extension:

1. Copies its bundled ambient type definitions to `.vscode/opal.d.ts` in each open workspace
   folder. This file declares every proxy global, every event payload, and every bound Java type as
   plain ambient declarations, with no `import`/`export`, so TypeScript (which powers VS Code's built-in
   JavaScript language service) treats it as global scope, exactly like the real runtime does.
2. Ensures a `jsconfig.json` exists at the workspace root that includes that file (creating a
   minimal one if you don't have one, or merging just the `include` entries into an existing one
   without touching anything else you've configured).

Both generated files are meant to be regenerated: the `.d.ts` is refreshed on every activation so
it always matches your installed extension version, and the `jsconfig.json` merge only ever adds
the two entries it needs. You can safely delete either one and re-run `Opal: Install Type
Definitions` to get them back. There's no `checkJs` turned on by default, so existing scripts won't
suddenly sprout type errors; this is autocomplete/hover only unless you opt a file into stricter
checking yourself with `// @ts-check`.

## Project layout

```
vscode/
  src/extension.ts           extension entry point (commands + IntelliSense wiring)
  typings/opal-globals.d.ts  the ambient type definitions — the actual API reference
  snippets/opal.code-snippets
  package.json
```

## Status

Everything described above works today. Not yet done: publishing to the VS Code Marketplace
(the `publisher` field is a placeholder), and a real extension icon.
