# Changelog

All notable changes to the Opal Scripting VS Code extension are documented in this file.

## [Unreleased]

### Added

- Ambient type definitions (`typings/opal-globals.d.ts`) covering every documented scripting
  global: `client`, `player`, `movement`, `rotation`, `world`, `inventory`, `renderer`, `overlay`,
  `esp`, `modules`, `notification`, `palette`, `mc` (+ `interactionManager`), `keys`,
  `registerScript`/`registerModule`, every event payload from `events.mdx`, and the bound Java
  interop types (`Vec3d`, `Vec3i`, `Vec2f`, `BlockPos`, `Direction`, `RaytracedRotation`,
  `MathHelper`, `Color`, `MAIN_HAND`/`OFF_HAND`).
- `Opal: Install Type Definitions` command that writes `.vscode/opal.d.ts` into the open workspace
  and wires up (or creates) a `jsconfig.json` so plain `.js` files get IntelliSense — also runs
  automatically on activation and when a workspace folder is added.
- `Opal: New Script` command that scaffolds a starter `.js` file (module registration, a settings
  example, a commented event handler).
- Snippets for a full script scaffold, a bare `registerModule` block, an event handler, each of the
  four setting types, a palette view registration, and an overlay island registration.

## [0.1.0] - Unreleased

Initial development version. Not yet published to the VS Code Marketplace.
