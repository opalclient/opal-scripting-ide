# Changelog

All notable changes to the Opal Scripting VS Code extension are documented in this file.

## [Unreleased]

### Changed

- Finished event payload coverage and unified the cancel API. `PreMoveEvent`, `PostMoveEvent`,
  `ServerConnectEvent`, `BlockUpdateEvent`, `KeyPressEvent`/`MousePressEvent`, and `SwingEvent` now
  describe the actual `@HostAccess.Export` surface the sandbox exposes, not the raw (unwrapped)
  Java event: `PreMoveEvent`/`PostMoveEvent` expose `getSpeed()` + `getInputX/Y/Z()` instead of a
  `Vec3d`-returning `getMovementInput()`; `ServerConnectEvent` exposes `getHost()`/`getPort()`/
  `getAddress()` instead of an opaque `getServerAddress()`; `BlockUpdateEvent` exposes
  `getX/Y/Z()` + `getOldBlock()`/`getNewBlock()` instead of raw `BlockPos`/`BlockState` getters;
  `KeyPressEvent`/`MousePressEvent` expose `getCode()` (was `getInteractionCode()`); `SwingEvent`
  exposes `isMainHand()` (was a bare `hand()` accessor returning `InteractionHand`). The
  now-unreachable `ServerAddress` opaque type was removed along with it.
- Eliminated the old `CancellableEvent.setCancelled()` shape entirely. Every cancellable event
  payload (`PreMoveEvent`, `PreMovementPacketEvent`, `PacketEvent` and its four subtypes,
  `JumpEvent`, `ServerConnectEvent`, `ChatReceivedEvent`) now extends the same
  `CancellableEvent { isCancelled(): boolean; cancel(): void }` — there is no longer a second,
  interchangeable-looking cancel shape to trip over.

### Added

- Ambient type definitions (`typings/opal-globals.d.ts`) covering every documented scripting
  global: `client`, `player`, `movement`, `rotation`, `world`, `inventory`, `renderer`, `overlay`,
  `esp`, `modules`, `notification`, `palette`, `mc` (+ `interactionManager`), `keys`,
  `registerScript`/`registerModule`, every event payload from `events.mdx`, and the bound Java
  interop types (`Vec3d`, `Vec3i`, `Vec2f`, `BlockPos`, `Direction`, `RaytracedRotation`,
  `MathHelper`, `Color`, `MAIN_HAND`/`OFF_HAND`).
- Read/write packet + event access matching the client's new packet scripting API:
  `PreMovementPacketEvent` (position/rotation/flags getters+setters), the shared `PacketEvent`
  (`getType()`) for `sendPacket`/`receivePacket`/`instantaneousSendPacket`/`instantaneousReceivePacket`,
  and corrected `ChatReceivedEvent` (`getMessage()`), `AttackEvent` (`getTargetName`/`getTargetId`/
  `getTargetHealth`/`getTargetMaxHealth`/`getTargetDistance`), and `JumpEvent` shapes — plus the new
  `timer` global (`timer.create()` stopwatch, `timer.now()`) and `client.sendChat`/`client.runCommand`.
- `Opal: Install Type Definitions` command that writes `.vscode/opal.d.ts` into the open workspace
  and wires up (or creates) a `jsconfig.json` so plain `.js` files get IntelliSense — also runs
  automatically on activation and when a workspace folder is added.
- `Opal: New Script` command that scaffolds a starter `.js` file (module registration, a settings
  example, a commented event handler).
- Snippets for a full script scaffold, a bare `registerModule` block, an event handler, each of the
  four setting types, a palette view registration, and an overlay island registration.

### Fixed

- The ambient typings' header comment incorrectly claimed scripts run "full-trust with no sandbox".
  Scripts have always run sandboxed (GraalVM `HostAccess.EXPLICIT`) — corrected to describe the real
  boundary (`@HostAccess.Export` proxy members + a small JDK allow-list).

## [0.1.0] - Unreleased

Initial development version. Not yet published to the VS Code Marketplace.
