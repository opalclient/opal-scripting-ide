# Changelog

All notable changes to the Opal Scripting VS Code extension are documented in this file.

## [Unreleased]

### Changed

- **BREAKING: `entity.getName()` returns a `string`.** It used to return a Minecraft `Component`;
  the `TextComponent` type is gone along with the `entity.getName().getString()` idiom.
- **BREAKING: there is no `mc.player` / `mc.world`.** Only `mc.getPlayer()` / `mc.getWorld()`
  resolve — GraalVM JS does no bean-property mapping under `HostAccess.EXPLICIT`, so the property
  form always read `undefined`, silently defeating every `mc.player === null` guard written
  against it. `getPlayer()` now returns a readable `Entity`; `getWorld()` returns an opaque,
  memberless `ClientLevel` token good only for a null check. The `LocalPlayer` type is gone.
- **BREAKING: collections are `ScriptList<T>`, not arrays.** `ScriptList` is
  `{ size(); isEmpty(); get(i) }` and is **not** iterable — the old `JavaList<T> extends
  Iterable<T>` with `.length` and index access described an API that never existed
  (`HostAccess.EXPLICIT` grants no container access). Affects `modules.listAll`/`listCategory`/
  `listEnabled` (previously typed `string[]`, outright wrong), `player.getEffects`,
  `world.getEntities`/`getLivingEntitiesInRange`/`getAdjacentDirections`, `renderer.wrapText`,
  and `movement.yawPos` (previously typed as a `[number, number]` tuple).
- **BREAKING: geometry and item types are wrappers with getters, not property bags.** `Vector4d`
  → `Box2D` (`getX()`/`getWidth()`/…; laid out `x, y, width, height`, not four corners),
  `Vector3d` → `Vec3d`, `AABB` → `Box3D`, and the opaque `ItemStack` is now a readable wrapper.
  `GpuImageHandle` → `ScriptImage` (with `getWidth`/`getHeight`, and no `NONE` sentinel — a
  failed `loadImage` returns a handle whose `isValid()` is `false`).
- **BREAKING: removed types for APIs that no longer exist** — `client.getModule()` and its
  `ModuleHandle`/`OpalNativeModule` type, `world.getBlockState()`/`getBlock()` and their
  `BlockState`/`Block` types, and the `Vec3i` global. All were unreadable at runtime, so nothing
  could depend on them.
- `Vec3d` is now the `ScriptVec3` wrapper: `new Vec3d(x, y, z)` works, and
  `getX()`/`getY()`/`getZ()`/`length()`/`distanceTo()`/`add()`/`subtract()` are all callable. It
  was previously modelled as an opaque construct-and-pass-through type on the stated grounds that
  "Fabric intermediary mappings rename its methods at runtime" — a diagnosis wrong twice over
  (the client is on Mojang mappings; the real cause was the sandbox's default-deny policy).
- `RenderScreenEvent`, `RenderWorldEvent` and `RenderBloomEvent` are now memberless. Their
  `drawContext()`, `canvas()`, `mouseX()`, `mouseY()`, `matrixStack()` and `tickDelta()` members
  were all promised but unreachable: the handler is passed the raw event record, which carries no
  `@HostAccess.Export`, so every call on it throws. Use `client.getTickDelta()` and the `renderer`
  global. (`GuiGraphicsExtractor`, `RenderCanvas` and `PoseStack` are gone with them.)
- Dropped the `movement.getMoveYaw(from, to)` overload and the `Vector2d` type it took. The
  overload exists on the host proxy but is uncallable from a script: its parameters are JOML
  `Vector2d`s and no global binds that class, so an argument for it cannot be built.
- `MathHelper` is documented as unusable rather than merely awkward — it is bound as the raw
  Mojang `Mth` class, so every call on it is denied.
- The "New Opal Script" scaffold no longer seeds `if (mc.player === null || mc.world === null)`
  into every generated script, which is where much of the broken pattern came from.
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

- `module.setBind(code)` / `getBind()` / `clearBind()`, letting a module claim a default key at
  registration — `module.setBind(keys.F7)`.
- `keys.F1`–`keys.F12`, `keys.MOUSE_0`–`keys.MOUSE_4`, and `keys.NONE` (the unbound sentinel).
- `player.getArmor()`, `player.hasEffect(name)`, `player.getEffect(name)`, `player.getEffects()`,
  and the `Effect` wrapper behind them. The amplifier convention is documented on the type:
  `getAmplifier()` is 0-based, `getLevel()` is 1-based — Strength II is amplifier 1, level 2.
- A readable `Entity` wrapper: `isPlayer()`, `isLiving()`, `getHealth()`, `getMaxHealth()`,
  `getArmor()`, `getAbsorption()`, `hasEffect()`, `getEffects()`, position and rotation. The
  living-only reads answer the `-1` sentinel on a non-living entity, documented per member.
- `AttackEvent.getTarget()`, returning that `Entity` rather than only the flattened
  `getTargetName()`/`getTargetHealth()`/… accessors.
- Ambient type definitions (`typings/opal-globals.d.ts`) covering every documented scripting
  global: `client`, `player`, `movement`, `rotation`, `world`, `inventory`, `renderer`, `overlay`,
  `esp`, `modules`, `notification`, `palette`, `mc` (+ `interactionManager`), `keys`,
  `registerScript`/`registerModule`, every event payload from `events.mdx`, and the bound
  interop types (`Vec3d`, `Vec2f`, `BlockPos`, `Direction`, `RaytracedRotation`, `MathHelper`,
  `Color`, `MAIN_HAND`/`OFF_HAND`).
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
