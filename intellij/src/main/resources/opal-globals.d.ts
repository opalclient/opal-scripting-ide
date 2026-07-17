// Opal Scripting API — ambient global type declarations
//
// This file is NOT a module (no top-level import/export), so every
// declaration below is a true global, exactly matching what the GraalVM
// JavaScript engine injects into a script's scope at runtime. Drop it
// anywhere under a project's content root (the "Insert/Update Opal Type
// Definitions" action and the "New Opal Script" scaffold both do this for
// you) and WebStorm / IntelliJ IDEA's built-in JavaScript engine will offer
// full completion, parameter hints, and quick docs for `client`, `player`,
// `world`, `renderer`, and the rest of the proxy globals in every plain .js
// script — no tsconfig.json, no import statement, no build step.
//
// Source of truth: opalclient/resources/docs/en/scripting/**, and — where the
// two ever disagree — the Java proxies under wtf/opal/scripting/ in the opal
// client repo, which is what actually runs. Keep this file in sync when the
// scripting API changes.
//
// WHAT THE SANDBOX MEANS FOR THE TYPES BELOW
// -------------------------------------------
// Scripts run under GraalVM `HostAccess.EXPLICIT`: default-deny. It grants no
// member access on un-annotated types, no bean-property mapping, and no
// container access. Anything that is not a primitive, a String, or a member
// annotated `@HostAccess.Export` is invisible to a script — and invisible
// *silently*: a property read on a raw object is `undefined`, never an error.
//
// So three rules hold everywhere here, and a type that breaks one is a bug:
//   • Getters, never properties. `box.getX()`, not `box.x`. `mc.getPlayer()`,
//     not `mc.player`.
//   • Containers are `ScriptList<T>` — `size()`/`isEmpty()`/`get(i)` only.
//     Never an array, never iterable.
//   • A type declared with no members (`HitResult`, `ClientLevel`) has none,
//     deliberately. Do not add speculative ones.
//
// A wrong signature here is worse than a missing one: it is what a script
// author writes their code against. This file previously promised `mc.player`,
// an iterable `JavaList` with `.length`, and raw `Vector4d`/`ItemStack`/
// `BlockState` types — none of which existed at runtime, and the gallery
// scripts written against them silently did nothing in-game.
//
// Generated for the Opal Scripting IDE plugin (JetBrains). See also the
// VS Code extension's equivalent type shim.

// ---------------------------------------------------------------------------
// Script registration
// ---------------------------------------------------------------------------

/** Config object passed to {@link registerScript}. */
interface OpalScriptConfig {
    /** Display name of the script, shown in `.script list` / `.script info`. */
    name: string;
    /** Free-form version string (metadata only, max 16 characters when published). */
    version: string;
    /** Author name(s) shown in `.script info`. */
    authors: string[];
}

/** Config object passed to {@link OpalScript.registerModule}. */
interface OpalModuleConfig {
    /** Module display name, shown in the ClickGUI and matched by `modules.*`. */
    name: string;
    /** One-line description shown in the ClickGUI. */
    description: string;
}

/** Handle returned by {@link registerScript}, used to register one or more modules. */
interface OpalScript {
    /**
     * Registers a script module. The callback receives the module handle
     * used to define settings and attach event handlers. All settings
     * (`addBool`/`addNumber`/`addMode`/`addGroup`) must be defined
     * synchronously inside this callback, before any `module.on(...)` calls.
     */
    registerModule(config: OpalModuleConfig, callback: (module: OpalModule) => void): void;
}

/**
 * Registers a new script entry point. Call this once per script file.
 * Returns a handle used to register one or more modules.
 *
 * ```javascript
 * const script = registerScript({ name: "My Script", version: "1.0.0", authors: ["User"] });
 * ```
 */
declare function registerScript(config: OpalScriptConfig): OpalScript;

// ---------------------------------------------------------------------------
// Module: settings + events
// ---------------------------------------------------------------------------

/**
 * The module handle passed into a `registerModule` callback. Exposes the
 * settings API (`addBool`/`addNumber`/`addMode`/`addGroup` + matching
 * getters/setters) and the event subscription API (`on`).
 */
interface OpalModule {
    // -- Settings: definition ------------------------------------------------

    /** Adds a boolean (toggle) setting. Appears as a switch in the ClickGUI. */
    addBool(name: string, defaultValue: boolean): void;

    /** Adds a numeric (slider) setting. Appears as a slider in the ClickGUI. */
    addNumber(name: string, defaultValue: number, min: number, max: number, step: number): void;

    /**
     * Adds a mode (dropdown) setting. Pass a plain JS array of option
     * strings — no Java enum required. The first option is the default.
     */
    addMode(name: string, options: string[]): void;

    /**
     * Groups one or more previously defined settings under a collapsible
     * header. Must be called *after* the settings it references; unmatched
     * names are ignored.
     */
    addGroup(name: string, settingNames: string[]): void;

    // -- Settings: read/write -------------------------------------------------

    /** Returns the current value of a boolean setting (false if it doesn't exist). */
    getBool(name: string): boolean;
    /** Sets a boolean setting's value. No-ops if the setting doesn't exist. */
    setBool(name: string, value: boolean): void;

    /** Returns the current value of a numeric setting (0.0 if it doesn't exist). */
    getNumber(name: string): number;
    /** Sets a numeric setting's value. No-ops if the setting doesn't exist. */
    setNumber(name: string, value: number): void;

    /** Returns the currently selected option of a mode setting ("" if it doesn't exist). */
    getMode(name: string): string;
    /** Case-insensitive check of whether a mode setting equals a given option. */
    isModeEqual(name: string, option: string): boolean;

    // -- Binds ----------------------------------------------------------------

    /**
     * Binds this module to a key, so it toggles without a trip through the
     * binds menu. Pass a `keys.*` code — `module.setBind(keys.F7)`. A user's
     * own rebind wins over this and survives a `.script reload`, so calling
     * this at registration sets a *default*, not a lock.
     */
    setBind(code: number): void;
    /** The module's current bind code, or `keys.NONE` when unbound. */
    getBind(): number;
    /** Removes the module's bind, leaving it toggleable only from the ClickGUI. */
    clearBind(): void;

    // -- Events ---------------------------------------------------------------

    /** Fired when the module is toggled on. Resets suppressed error reporting. */
    on(event: "enable", handler: () => void): void;
    /** Fired when the module is toggled off. Any owned Dynamic Islands are cleaned up. */
    on(event: "disable", handler: () => void): void;

    /** Start of the 20 TPS client tick, before vanilla tick logic runs. */
    on(event: "preGameTick", handler: (event: OpalEmptyEvent) => void): void;
    /** End of the 20 TPS client tick, after vanilla tick logic has run. */
    on(event: "postGameTick", handler: (event: OpalEmptyEvent) => void): void;

    /** During the 2D HUD pass. Draw with `renderer` here. */
    on(event: "renderScreen", handler: (event: OpalRenderScreenEvent) => void): void;
    /** During the 3D world pass. Use `esp.*` for world-space projection. */
    on(event: "renderWorld", handler: (event: OpalRenderWorldEvent) => void): void;
    /** During the HUD bloom pass; shapes drawn here feed the glow/bloom effect. */
    on(event: "renderBloom", handler: (event: OpalRenderBloomEvent) => void): void;

    /** Before the player's movement is applied for the tick. Cancellable. */
    on(event: "preMove", handler: (event: OpalPreMoveEvent) => void): void;
    /** After the player's movement has been applied. Not cancellable. */
    on(event: "postMove", handler: (event: OpalPostMoveEvent) => void): void;
    /** Before the movement packet is sent. Cancellable; lets you rewrite position/rotation/flags. */
    on(event: "preMovementPacket", handler: (event: OpalPreMovementPacketEvent) => void): void;
    /** After the movement packet has been sent. Read-only, not cancellable. */
    on(event: "postMovementPacket", handler: (event: OpalPostMovementPacketEvent) => void): void;

    /** An outbound packet is about to be sent (main thread). Cancellable. */
    on(event: "sendPacket", handler: (event: OpalPacketEvent) => void): void;
    /** An inbound packet was received, before it is handled (main thread). Cancellable. */
    on(event: "receivePacket", handler: (event: OpalPacketEvent) => void): void;
    /** An outbound packet is sent immediately on the network thread. Cancellable. */
    on(event: "instantaneousSendPacket", handler: (event: OpalPacketEvent) => void): void;
    /** An inbound packet is received on the network thread, before main-thread queueing. Cancellable. */
    on(event: "instantaneousReceivePacket", handler: (event: OpalPacketEvent) => void): void;

    /** The player attacks an entity, before the interaction is processed. Not cancellable. */
    on(event: "attack", handler: (event: OpalAttackEvent) => void): void;
    /** The player swings an arm, before the swing is sent. Record event, not cancellable. */
    on(event: "swing", handler: (event: OpalSwingEvent) => void): void;
    /** The player uses (right-clicks) the held item. Carries no data. Not cancellable. */
    on(event: "itemUse", handler: (event: OpalEmptyEvent) => void): void;
    /** Before the jump impulse is applied. Cancellable. */
    on(event: "jump", handler: (event: OpalJumpEvent) => void): void;

    /** The local player joins a world, after the client world is initialised. Carries no data. */
    on(event: "joinWorld", handler: (event: OpalEmptyEvent) => void): void;
    /** A loaded block changes state. Not cancellable. */
    on(event: "blockUpdate", handler: (event: OpalBlockUpdateEvent) => void): void;
    /** Before connecting to a multiplayer server. Cancellable — cancel to abort. */
    on(event: "serverConnect", handler: (event: OpalServerConnectEvent) => void): void;
    /** The client disconnects from a server. Carries no data. Not cancellable. */
    on(event: "serverDisconnect", handler: (event: OpalEmptyEvent) => void): void;

    /** A chat message is received from the server, before it is shown. Cancellable. */
    on(event: "chatReceived", handler: (event: OpalChatReceivedEvent) => void): void;

    /** A keyboard key is pressed. Carries the GLFW key code. Not cancellable. */
    on(event: "keyPress", handler: (event: OpalKeyPressEvent) => void): void;
    /** A mouse button is pressed. Carries the GLFW button code. Not cancellable. */
    on(event: "mousePress", handler: (event: OpalMousePressEvent) => void): void;
    /** The GUI is resized (framebuffer resolution changed). Carries no data. Not cancellable. */
    on(event: "resolutionChange", handler: (event: OpalEmptyEvent) => void): void;

    /** Fallback overload for forward-compatibility with events not yet in this file. */
    on(event: string, handler: (event: any) => void): void;
}

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

/** Base shape shared by every cancellable event payload. Every cancellable
 * payload in this file extends this interface; there is no separate
 * accessor shape to worry about. */
interface OpalCancellable {
    /** Whether the event has already been cancelled by another handler. */
    isCancelled(): boolean;
    /** Cancels the event. The flag cannot be cleared once set. */
    cancel(): void;
}

/** Lifecycle / lifecycle-adjacent events that carry no data (see the table in events.mdx). */
interface OpalEmptyEvent {}

/**
 * The `renderScreen` payload.
 *
 * **Nothing on it is readable.** The handler is passed the raw
 * `RenderScreenEvent` record, which carries no `@HostAccess.Export`, so every
 * member call on it throws `Unknown identifier` — `drawContext()`, `canvas()`,
 * `mouseX()`, `mouseY()` and `tickDelta()` all included. Declare the handler
 * with no parameter and read what you need from the globals instead:
 * `client.getTickDelta()` for the partial tick, and the `renderer` global for
 * drawing (it targets the frame's canvas for you).
 */
interface OpalRenderScreenEvent {}

/**
 * The `renderWorld` payload. **Nothing on it is readable** — same reason as
 * {@link OpalRenderScreenEvent}: the raw record carries no
 * `@HostAccess.Export`, so `matrixStack()` and `tickDelta()` both throw. Use
 * `client.getTickDelta()`.
 */
interface OpalRenderWorldEvent {}

/**
 * The `renderBloom` payload. **Nothing on it is readable** — same reason as
 * {@link OpalRenderScreenEvent}: the raw record carries no
 * `@HostAccess.Export`, so `drawContext()`, `canvas()` and `tickDelta()` all
 * throw. Use `client.getTickDelta()`.
 */
interface OpalRenderBloomEvent {}

interface OpalPreMoveEvent extends OpalCancellable {
    getSpeed(): number;
    /** X component of the directional movement input for the step. */
    getInputX(): number;
    /** Y component of the directional movement input for the step. */
    getInputY(): number;
    /** Z component of the directional movement input for the step. */
    getInputZ(): number;
}

interface OpalPostMoveEvent {
    getSpeed(): number;
    getInputX(): number;
    getInputY(): number;
    getInputZ(): number;
}

interface OpalPreMovementPacketEvent extends OpalCancellable {
    getX(): number;
    getY(): number;
    getZ(): number;
    setX(x: number): void;
    setY(y: number): void;
    setZ(z: number): void;
    getYaw(): number;
    getPitch(): number;
    setYaw(yaw: number): void;
    setPitch(pitch: number): void;
    isOnGround(): boolean;
    setOnGround(onGround: boolean): void;
    isSprinting(): boolean;
    setSprinting(sprinting: boolean): void;
    isHorizontalCollision(): boolean;
    setHorizontalCollision(horizontalCollision: boolean): void;
    isForceInput(): boolean;
    setForceInput(forceInput: boolean): void;
}

interface OpalPostMovementPacketEvent {
    getX(): number;
    getY(): number;
    getZ(): number;
    getYaw(): number;
    getPitch(): number;
    isOnGround(): boolean;
    isSprinting(): boolean;
}

/** Shared payload for sendPacket / receivePacket / instantaneous* packet
 * events. */
interface OpalPacketEvent extends OpalCancellable {
    /** Simple class name of the wrapped packet, e.g. `"ServerboundMovePlayerPacket"`. */
    getType(): string;
}

interface OpalAttackEvent {
    /** The entity being attacked. The flattened getters below are shortcuts for its reads. */
    getTarget(): Entity;
    /** Display name of the entity being attacked. */
    getTargetName(): string;
    /** Entity id of the target. */
    getTargetId(): number;
    /** Target's current health, or `-1` if the target is not a living entity. */
    getTargetHealth(): number;
    /** Target's maximum health, or `-1` if the target is not a living entity. */
    getTargetMaxHealth(): number;
    /** Distance to the target, or `-1` if unavailable. */
    getTargetDistance(): number;
}

interface OpalSwingEvent {
    /** Whether the main hand (as opposed to the off hand) is swinging. */
    isMainHand(): boolean;
}

interface OpalJumpEvent extends OpalCancellable {
    isSprinting(): boolean;
    /** Overrides whether the jump is treated as a sprint jump. */
    setSprinting(sprinting: boolean): void;
}

interface OpalBlockUpdateEvent {
    /** X coordinate where the block change occurred. */
    getX(): number;
    /** Y coordinate where the block change occurred. */
    getY(): number;
    /** Z coordinate where the block change occurred. */
    getZ(): number;
    /** Display name of the block before the update (e.g. "Air", "Stone"). */
    getOldBlock(): string;
    /** Display name of the block after the update (e.g. "Air", "Stone"). */
    getNewBlock(): string;
}

interface OpalServerConnectEvent extends OpalCancellable {
    /** Hostname or IP of the server being connected to. */
    getHost(): string;
    /** Port of the server being connected to. */
    getPort(): number;
    /** Combined `host:port` address of the server being connected to. */
    getAddress(): string;
}

interface OpalChatReceivedEvent extends OpalCancellable {
    /** The received chat message as plain text. */
    getMessage(): string;
    /** Whether this is an action-bar overlay message rather than a chat-line message. */
    isOverlay(): boolean;
    /** Reroutes the message to (true) or away from (false) the action bar. */
    setOverlay(overlay: boolean): void;
}

interface OpalKeyPressEvent {
    /** GLFW key code of the pressed key. */
    getCode(): number;
}

interface OpalMousePressEvent {
    /** GLFW button code of the pressed mouse button. */
    getCode(): number;
}

// ---------------------------------------------------------------------------
// client — ClientProxy
// ---------------------------------------------------------------------------

interface ClientProxy {
    /** Prints a message to the local chat. Calls toString() on the object. */
    print(o: any): void;
    /** Prints a success-styled (green) message to the local chat. */
    success(message: string): void;
    /** Prints an error-styled (red) message to the local chat. */
    error(message: string): void;

    /** Whether a specific module is currently enabled. */
    isModuleEnabled(id: string): boolean;
    /** Toggles a module on or off. */
    setModuleEnabled(id: string, enabled: boolean): void;

    /** Sends a chat message to the server, exactly as if typed in the chat box. */
    sendChat(message: string): void;
    /** Runs a client command. The leading "/" is optional — "toggle Fly" and "/toggle Fly" both work. */
    runCommand(command: string): void;

    /** Width of the game window in scaled virtual pixels (affected by GUI scale). */
    getScaledWidth(): number;
    /** Height of the game window in scaled virtual pixels. */
    getScaledHeight(): number;
    /** Current GUI scale factor (e.g. 1.0, 2.0). */
    getScaleFactor(): number;
    /** Raw physical width of the window in pixels. */
    getFramebufferWidth(): number;
    /** Raw physical height of the window in pixels. */
    getFramebufferHeight(): number;

    /** Primary color of the active client theme as an ARGB integer. */
    getThemePrimary(): number;
    /** Secondary color of the active client theme as an ARGB integer. */
    getThemeSecondary(): number;
    /**
     * Interpolates between the primary and secondary theme colors in a
     * pulsing animation. Use `offset` to create gradients/waves across
     * multiple elements.
     */
    getAnimatedThemeColor(speed: number, offset: number): number;

    /** Partial tick time (0.0-1.0), for smooth rendering interpolation between ticks. */
    getTickDelta(): number;
    /** Current frames per second. */
    getFPS(): number;
}

declare const client: ClientProxy;

// ---------------------------------------------------------------------------
// notification — NotificationProxy
// ---------------------------------------------------------------------------

interface NotificationProxy {
    /** Displays a green success toast notification. `duration` is in ms (default 3000). */
    success(title: string, description: string, duration?: number): void;
    /** Displays a red error toast notification. */
    error(title: string, description: string, duration?: number): void;
    /** Displays a yellow warning toast notification. */
    warn(title: string, description: string, duration?: number): void;
    /** Displays a blue informational toast notification. */
    info(title: string, description: string, duration?: number): void;
    /** Displays a notification with a dynamic type: "SUCCESS" | "ERROR" | "WARN" | "INFO". */
    show(type: "SUCCESS" | "ERROR" | "WARN" | "INFO" | string, title: string, description: string, duration?: number): void;
}

declare const notification: NotificationProxy;

// ---------------------------------------------------------------------------
// overlay — OverlayProxy (Dynamic Island HUD)
// ---------------------------------------------------------------------------

interface OpalIslandConfig {
    width: number;
    height: number;
    /** Higher renders on top. */
    priority: number;
    /** Draws one frame of the island's content. */
    render(posX: number, posY: number, width: number, height: number, progress: number): void;
}

interface OverlayProxy {
    /** Creates a new Dynamic Island and returns its unique id. Does not show it — call `showIsland`. */
    createIsland(config: OpalIslandConfig): string;
    /** Activates the island, adding it to the render loop. */
    showIsland(islandId: string): void;
    /** Deactivates the island without destroying it. */
    hideIsland(islandId: string): void;
    /** Permanently deletes the island. */
    destroyIsland(islandId: string): void;
    /** Updates the content width dynamically. */
    setIslandWidth(islandId: string, width: number): void;
    /** Updates the height dynamically. */
    setIslandHeight(islandId: string, height: number): void;
    /** Updates the render priority (higher renders on top). */
    setIslandPriority(islandId: string, priority: number): void;
}

declare const overlay: OverlayProxy;

// ---------------------------------------------------------------------------
// modules — ModulesProxy
// ---------------------------------------------------------------------------

interface ModulesProxy {
    /** Whether a module with the given name is registered. */
    exists(id: string): boolean;
    /** Whether a module is currently enabled (false if it doesn't exist). */
    isEnabled(id: string): boolean;
    /** Enables or disables a module. No-ops silently if the module doesn't exist. */
    setEnabled(id: string, enabled: boolean): void;
    /** Toggles a module on or off. No-ops silently if the module doesn't exist. */
    toggle(id: string): void;

    /** Category name (e.g. "Combat", "Movement"), or null if not found. */
    getCategory(id: string): string | null;
    /** Arraylist suffix (often the active mode), or null. */
    getSuffix(id: string): string | null;
    /** Whether the module is shown in the arraylist/HUD. */
    isVisible(id: string): boolean;
    /** Sets arraylist visibility. No-ops silently if the module doesn't exist. */
    setVisible(id: string, visible: boolean): void;

    /** Display names of all registered modules (native and script-defined). A `ScriptList`, not an array — walk it with `size()`/`get(i)`. */
    listAll(): ScriptList<string>;
    /** Display names of modules in a category: Combat, Movement, Visual, World, Utility, or Scripts. A `ScriptList`, not an array. */
    listCategory(category: string): ScriptList<string>;
    /** Display names of all currently enabled modules. A `ScriptList`, not an array — `listEnabled().size()`, never `.length`. */
    listEnabled(): ScriptList<string>;
}

declare const modules: ModulesProxy;

// ---------------------------------------------------------------------------
// mc — MinecraftProxy
// ---------------------------------------------------------------------------

interface InteractionManagerProxy {
    /**
     * Right-clicks a block face with the given hand. `hitResult` should come
     * from `rotation.getRotationFromRaycastedBlock(...).getHitResult()`.
     */
    interactBlock(hand: InteractionHand, hitResult: HitResult): void;
    /** Begins or updates block-breaking progress on the given position and face. */
    updateBlockBreakingProgress(blockPos: BlockPos, direction: Direction): boolean;
    /** Cancels any in-progress block breaking. */
    cancelBlockBreaking(): void;
    /** Whether a block break is currently in progress. */
    isBreakingBlock(): boolean;

    /** Attacks an entity with the local player's main hand. */
    attackEntity(entity: Entity): void;
    /** Uses the item in the given hand (right-click use, not on a block). */
    interactItem(hand: InteractionHand): void;
    /** Stops using an item (e.g. releasing a bow or stopping eating). */
    stopUsingItem(): void;
}

/**
 * Null-safe access to Minecraft's player/world/interactionManager.
 *
 * **There is no `mc.player` or `mc.world`.** GraalVM JS does no bean-property
 * mapping under `HostAccess.EXPLICIT`, so only the getter form resolves — the
 * property form reads `undefined`, which makes `mc.player === null` a guard
 * that never fires. The idiomatic guard at the top of an event callback is:
 *
 * ```javascript
 * if (mc.getPlayer() === null || mc.getWorld() === null) return;
 * ```
 *
 * Use the dedicated `player`, `world`, `movement`, `rotation`, and `inventory`
 * proxy globals for all actual behaviour.
 */
interface MinecraftProxy {
    /** Block and entity interaction. */
    readonly interactionManager: InteractionManagerProxy;

    /**
     * The local player as a `ScriptEntity`, or `null` if not yet loaded. Good
     * for a null guard, and readable for name/health/position — but for
     * local-player state and movement prefer the richer `player` global.
     */
    getPlayer(): Entity | null;
    /**
     * The active client world, or `null` if not yet loaded. **Null-guard use
     * only** — the returned value is an opaque token with no readable members.
     * Every real world query lives on the `world` global.
     */
    getWorld(): ClientLevel | null;
    /** Same as the `interactionManager` field; kept for completeness. */
    getInteractionManager(): InteractionManagerProxy;
}

declare const mc: MinecraftProxy;

/**
 * An opaque token from `mc.getWorld()`.
 *
 * **Deliberately memberless.** Comparing against `null` needs no member
 * access, so `mc.getWorld() === null` correctly answers "is the world loaded"
 * — the only thing this value is for. Every actual world query is flattened
 * onto the `world` global; use that.
 */
interface ClientLevel {}

// ---------------------------------------------------------------------------
// player — PlayerProxy
// ---------------------------------------------------------------------------

interface PlayerProxy {
    // -- Position -------------------------------------------------------------

    /** Eye position in world space — the origin point for raycasts and rotation calculations. */
    getEyePosition(): Vec3d;
    /** Alias of `getEyePosition()`. */
    getPosition(): Vec3d;
    /** Floored block position, exposing readable `getX()`/`getY()`/`getZ()`. */
    getBlockPosition(): BlockPos;
    /** Current per-tick velocity (delta movement) vector. */
    getVelocity(): Vec3d;
    /** Current yaw (horizontal) rotation in degrees. */
    getYaw(): number;
    /** Current pitch (vertical) rotation in degrees. */
    getPitch(): number;
    /** How far the player has fallen since last touching ground, in blocks. */
    getFallDistance(): number;

    // -- State ------------------------------------------------------------------

    isOnGround(): boolean;
    isInAir(): boolean;
    /** Ticks spent continuously in the air. */
    getAirTicks(): number;
    /** Ticks spent continuously on the ground. */
    getGroundTicks(): number;
    isSneaking(): boolean;
    isSprinting(): boolean;
    /** Whether the player is eating, drinking, blocking, drawing a bow, etc. */
    isUsingItem(): boolean;

    // -- Health -------------------------------------------------------------------

    getHealth(): number;
    getMaxHealth(): number;
    /** Absorption (golden hearts) amount. */
    getAbsorption(): number;
    /** Armor points (0-20) from the currently worn armor. */
    getArmor(): number;

    // -- Effects ------------------------------------------------------------------

    /**
     * Whether the player currently has the named effect. Matched on the
     * effect's display name, case-insensitively — `hasEffect("strength")`.
     */
    hasEffect(name: string): boolean;
    /** The named active effect, or `null` if the player does not have it. */
    getEffect(name: string): Effect | null;
    /** Every effect currently active on the player. A `ScriptList`, not an array. */
    getEffects(): ScriptList<Effect>;

    // -- Combat -------------------------------------------------------------------

    /** Whether the next attack would land a critical hit. */
    canCrit(): boolean;
    /** Attack damage of the item currently held in the main hand. */
    getAttackDamage(): number;
    /** Maximum distance, in blocks, at which the player can attack/interact with entities. */
    getEntityInteractionRange(): number;
    /** Whether the main-hand item is a weapon (sword, axe, or pickaxe). */
    isHoldingWeapon(): boolean;

    // -- Entity utilities -----------------------------------------------------------

    /** Bounding-box distance to a living entity, or -1.0 if the entity is not living. */
    getDistanceToEntity(entity: Entity): number;
    /** Closest point on a living entity's bounding box to the player's eyes, or null if not living. */
    getClosestPoint(entity: Entity): Vec3d | null;
    /** Whether the player's box, shifted by the given offset, is free of collidable blocks. */
    isBoxEmpty(offsetX: number, offsetY: number, offsetZ: number): boolean;
    /** Whether the space directly below the player, at the given vertical offset, is empty. */
    isBoxEmptyBelow(offsetY: number): boolean;
    /** The player's axis-aligned bounding box. */
    getBoundingBox(): Box3D;
    /** Eye height above feet, in blocks. */
    getStandingEyeHeight(): number;

    // -- Actions ----------------------------------------------------------------

    /** Plays the hand swing animation. Call after attacking or placing to trigger the visual swing. */
    swingHand(hand: InteractionHand): void;
    /** Uses (right-clicks) the item in the given hand and plays the swing animation. */
    useItem(hand: InteractionHand): void;
}

declare const player: PlayerProxy;

// ---------------------------------------------------------------------------
// movement — MovementProxy
// ---------------------------------------------------------------------------

interface MovementProxy {
    /** Current horizontal speed in blocks per second (roughly `getSpeed() * 20`). */
    getBlocksPerSecond(): number;
    /** Current horizontal speed as a raw velocity magnitude (blocks per tick). */
    getSpeed(): number;
    /** Whether the player is currently providing movement input (WASD or equivalent). */
    isMoving(): boolean;

    /** X/Z offsets for a given yaw direction and distance: returns [deltaX, deltaZ]. */
    yawPos(yaw: number, value: number): [number, number];
    /** Sets the velocity of an arbitrary entity along a given yaw direction. */
    setEntitySpeed(entity: Entity, speed: number, yaw: number): void;

    /** Sets horizontal speed using the current movement input direction. */
    setSpeed(speed: number): void;
    /**
     * Sets horizontal speed with a strafe blend (0.0 = forward, 1.0 = strafe)
     * **or** along a specific yaw direction in degrees — these two overloads
     * share a call shape (both take two plain numbers), so test the actual
     * in-game behaviour before shipping a script that relies on this.
     */
    setSpeed(speed: number, strafePercentageOrYaw: number): void;

    /** Adjusts a base speed by the player's Swiftness potion effect level (default multiplier). */
    getSwiftnessSpeed(speed: number): number;
    /** Adjusts a base speed by the player's Swiftness potion effect level using a custom multiplier. */
    getSwiftnessSpeed(speed: number, swiftnessMultiplier: number): number;

    /**
     * Current movement yaw based on WASD input and camera rotation.
     *
     * There is a two-argument `getMoveYaw(from, to)` overload on the host
     * proxy, but it is **not callable from a script**: its parameters are JOML
     * `Vector2d`s, and no global binds that class, so there is no way to build
     * an argument for it. It is deliberately not typed here.
     */
    getMoveYaw(): number;
    /** Current movement direction in degrees, accounting for strafe and forward input. */
    getDirectionDegrees(): number;
    /** Movement direction in degrees for a specific yaw. */
    getDirectionDegrees(yaw: number): number;
    /** Current movement direction in radians. */
    getDirectionRadians(): number;
    /** Movement direction in radians for a specific yaw. */
    getDirectionRadians(yaw: number): number;
    /** Exact movement direction (radians) from raw input values. */
    getDirection(rotationYaw: number, moveForward: number, moveStrafing: number): number;
}

declare const movement: MovementProxy;

// ---------------------------------------------------------------------------
// rotation — RotationProxy
// ---------------------------------------------------------------------------

interface RotationProxy {
    // -- Stateful submission ------------------------------------------------------

    /** Submits a target rotation using an instant (snap) model. Call every tick, not once. */
    set(yaw: number, pitch: number): void;
    /** Submits a target rotation using a linear (smooth) model capped to `speed` degrees/tick. */
    setSmooth(yaw: number, pitch: number, speed: number): void;

    // -- Rotation calculation (stateless) -----------------------------------------

    /** Yaw/pitch needed to look at a world position from the player's current eye position. */
    getRotationFromPosition(pos: Vec3d): Vec2f;
    /** Yaw/pitch needed to look at the center of a specific block face. */
    getRotationFromBlock(blockPos: BlockPos, direction: Direction): Vec2f;
    /**
     * Raytraced rotation to a block face, validated to actually hit the
     * intended face within reach (the method Scaffold uses for placement).
     * Returns null if no valid rotation exists.
     */
    getRotationFromRaycastedBlock(
        blockPos: BlockPos,
        side: Direction,
        priorityRotations: Vec2f,
        playerPos: Vec3d,
    ): RaytracedRotation | null;
    /**
     * Raytraced rotation to a living entity, validated within range (the
     * method KillAura uses). Returns null if no valid rotation exists.
     */
    getRotationFromRaycastedEntity(
        entity: LivingEntity,
        closestVector: Vec3d,
        entityInteractionRange: number,
    ): RaytracedRotation | null;
    /** Unit look vector for the given pitch and yaw. */
    getRotationVector(pitch: number, yaw: number): Vec3d;

    // -- Queries & math -------------------------------------------------------------

    /** Current server-side rotation as managed by the rotation handler. */
    getRotation(): Vec2f;
    /** Angular difference between two rotations, accounting for wrapping. */
    getRotationDifference(a: Vec2f, b: Vec2f): number;
    /** Raw cursor delta needed to achieve a rotation delta, given Minecraft's sensitivity multiplier. */
    getCursorDelta(rotationDelta: number, sensitivityMultiplier: number): number;
    /** Patches a rotation with small natural-looking jitter to avoid constant-delta detection. */
    patchConstantRotation(rotation: Vec2f, prevRotation: Vec2f): Vec2f;
    /** Snaps a rotation value to the nearest value achievable by Minecraft's sensitivity system. */
    getSensitivityModifiedRotation(original: number): number;
    /** Sent (server-side) rotation after sensitivity correction. */
    getSentRotation(original: Vec2f): Vec2f;
    /** Applies Minecraft's sensitivity curve to both axes of a rotation. */
    getSensitivityModifiedRotationVec(original: Vec2f): Vec2f;
    /** Converts a rotation to vanilla Minecraft mouse-look coordinates. */
    getVanillaRotation(original: Vec2f): Vec2f;
    /** Wraps a rotation value toward a target to avoid duplicate-angle detection. */
    getDuplicateWrapped(value: number, target: number): number;

    // -- FOV checks -------------------------------------------------------------------

    /** Angular offset between the player's look direction and the direction to an entity. */
    getEntityFOV(entity: Entity): number;
    /** Whether an entity falls within a FOV cone (half-angle in degrees; 180 = full sphere). */
    isEntityInFOV(entity: Entity, fov: number): boolean;
}

declare const rotation: RotationProxy;

// ---------------------------------------------------------------------------
// inventory — InventoryProxy
// ---------------------------------------------------------------------------

interface InventoryProxy {
    // -- Slot switching -------------------------------------------------------------

    /** Switches the selected hotbar slot normally (visible to client and server). */
    setSlot(slot: number): void;
    /** Switches the slot in default silent mode: server sees it, client render may be preserved. */
    setSlotSilent(slot: number): void;
    /** Switches the slot fully spoofed: server sees it, client keeps rendering the original item. */
    setSlotFullSilent(slot: number): void;
    /** Sends a raw selected-slot update packet for the given slot. */
    sendSlotPacket(slot: number): void;
    /** Currently selected hotbar slot index (0-8). */
    getSelectedSlot(): number;

    // -- Item searching ---------------------------------------------------------------

    /** Searches the hotbar (0-8) for a placeable block. Returns -1 if none found. */
    findBlock(): number;
    /** Searches the hotbar (0-8) for an item by display-name substring (case-insensitive). */
    findItem(itemName: string): number;
    /** Searches the full inventory (0-35) for an item by display-name substring (case-insensitive). */
    findItemInInventory(itemName: string): number;

    // -- Stack inspection ---------------------------------------------------------------

    /** Item stack in the given hotbar slot. */
    getStack(slot: number): ItemStack | null;
    /** Main hand item stack as resolved by the slot system (accounts for silent switching). */
    getMainHandStack(): ItemStack | null;
    /** Off hand item stack. */
    getOffHandStack(): ItemStack | null;
    /** Whether the main hand item is a placeable block. */
    isHeldItemBlock(): boolean;
    /** Whether the item in the given slot is a placeable block. */
    isBlock(slot: number): boolean;
    /** Display name of the item in the given slot ("" if empty). */
    getItemName(slot: number): string;
    /** Stack count of the item in the given slot. */
    getItemCount(slot: number): number;
    /** Total count of a specific item across the entire inventory (display-name substring, case-insensitive). */
    countItem(itemName: string): number;
    /** Total placeable blocks across the hotbar and off hand. */
    countBlocks(): number;
}

declare const inventory: InventoryProxy;

// ---------------------------------------------------------------------------
// world — WorldProxy
// ---------------------------------------------------------------------------

interface WorldProxy {
    // -- Block queries --------------------------------------------------------------

    isAir(pos: BlockPos): boolean;
    /** Whether the block can be replaced (air, fluid, grass, etc.). */
    isReplaceable(pos: BlockPos): boolean;
    isSolid(pos: BlockPos): boolean;
    /** Localized display name of the block. */
    getBlockName(pos: BlockPos): string;
    /** Breaking hardness; -1 means unbreakable (bedrock). */
    getBlockHardness(pos: BlockPos): number;

    // -- Block helpers ----------------------------------------------------------------

    /** Whether any face-adjacent block is solid (placeable-against). */
    hasAdjacentBlock(pos: BlockPos): boolean;
    /** Directions where a solid neighbour exists. Can be empty. */
    getAdjacentDirections(pos: BlockPos): ScriptList<Direction>;

    // -- Entity queries ----------------------------------------------------------------

    /** All entities in the world. */
    getEntities(): ScriptList<Entity>;
    /** Living entities (mobs + players) within radius of the player, excluding self. */
    getLivingEntitiesInRange(radius: number): ScriptList<Entity>;

    // -- World info ------------------------------------------------------------------

    /** World time in ticks. */
    getTime(): number;
    /** Time of day: 0=sunrise, 6000=noon, 12000=sunset, 18000=midnight. */
    getTimeOfDay(): number;
    /** Dimension identifier, e.g. "minecraft:overworld". */
    getDimension(): string;
}

declare const world: WorldProxy;

// ---------------------------------------------------------------------------
// esp — EspProxy (3D-to-2D projection)
// ---------------------------------------------------------------------------

interface EspProxy {
    /**
     * Projects an entity's 3D bounding box onto the screen. Pass
     * `client.getTickDelta()` as `tickDelta`. Returns null if behind the
     * camera or fully outside the viewport.
     */
    getEntityBox2D(entity: Entity, tickDelta: number): Box2D | null;
    /** Projects a world point onto the screen. Returns null if behind the camera. */
    project(worldX: number, worldY: number, worldZ: number, tickDelta: number): Vec3d | null;
    /** Projects a Vec3d world position onto the screen. Convenience wrapper around `project`. */
    projectVec(pos: Vec3d, tickDelta: number): Vec3d | null;

    /** Smooth, camera-relative entity position at the current partial tick. Null for non-living entities. */
    getInterpolatedPosition(entity: Entity, tickDelta: number): Vec3d | null;
    /** Linear interpolation between two values: `start + (end - start) * tickDelta`. */
    lerp(start: number, end: number, tickDelta: number): number;

    /** Whether a world position projects to a visible on-screen location. */
    isOnScreen(worldX: number, worldY: number, worldZ: number, tickDelta: number): boolean;
    /** Whether any part of an entity's bounding box projects to visible screen coordinates. */
    isEntityOnScreen(entity: Entity, tickDelta: number): boolean;
}

declare const esp: EspProxy;

// ---------------------------------------------------------------------------
// renderer — RendererProxy
// ---------------------------------------------------------------------------

/** Fonts registered with the renderer. Custom fonts are not supported — only these three. */
type OpalFontName = "productsans-bold" | "productsans-medium" | "materialicons-regular";

interface RendererProxy {
    // -- Basic shapes -----------------------------------------------------------------

    rect(x: number, y: number, width: number, height: number, color: number): void;
    roundedRect(x: number, y: number, width: number, height: number, radius: number, color: number): void;
    circle(cx: number, cy: number, radius: number, color: number): void;

    // -- Gradients --------------------------------------------------------------------

    rectGradient(x: number, y: number, width: number, height: number, color1: number, color2: number, angleDegrees: number): void;
    roundedRectGradient(
        x: number, y: number, width: number, height: number, radius: number,
        color1: number, color2: number, angleDegrees: number,
    ): void;

    // -- Per-corner radii ---------------------------------------------------------------

    roundedRectVarying(
        x: number, y: number, width: number, height: number,
        radiusTopLeft: number, radiusTopRight: number, radiusBottomRight: number, radiusBottomLeft: number,
        color: number,
    ): void;
    roundedRectVaryingGradient(
        x: number, y: number, width: number, height: number,
        radiusTopLeft: number, radiusTopRight: number, radiusBottomRight: number, radiusBottomLeft: number,
        color1: number, color2: number, angleDegrees: number,
    ): void;

    // -- Outlines & strokes ---------------------------------------------------------------

    rectOutline(x: number, y: number, width: number, height: number, thickness: number, color: number): void;
    roundedRectOutline(x: number, y: number, width: number, height: number, radius: number, thickness: number, color: number): void;
    roundedRectOutlineVarying(
        x: number, y: number, width: number, height: number,
        radiusTopLeft: number, radiusTopRight: number, radiusBottomRight: number, radiusBottomLeft: number,
        thickness: number, color: number,
    ): void;
    rectStroke(x: number, y: number, width: number, height: number, strokeThickness: number, color: number, strokeColor: number): void;
    rectOutlineStroke(
        x: number, y: number, width: number, height: number,
        outlineThickness: number, strokeThickness: number, outlineColor: number, strokeColor: number,
    ): void;

    // -- Special shapes -----------------------------------------------------------------

    /** Rectangle filled with an animated rainbow gradient. */
    rainbowRect(x: number, y: number, width: number, height: number): void;

    // -- Composite effects --------------------------------------------------------------

    /** Soft box shadow behind a rounded-rectangle footprint. */
    shadow(
        x: number, y: number, width: number, height: number, radius: number,
        blur: number, offsetX: number, offsetY: number, color: number,
    ): void;
    /** Frosted-glass fill: the blurred backdrop captured behind the UI. */
    blurFill(x: number, y: number, width: number, height: number, radius: number): void;
    blurFillVarying(
        x: number, y: number, width: number, height: number,
        radiusTopLeft: number, radiusTopRight: number, radiusBottomRight: number, radiusBottomLeft: number,
    ): void;
    /** Fills with the glow (bloom) pass texture, producing a soft glow around bright content. */
    glowFill(x: number, y: number, width: number, height: number, radius: number): void;
    /**
     * Inner glow along the inside edges of a rounded rectangle.
     * **Experimental** — advanced and visually unverified; no native Opal UI callers yet.
     */
    innerGlow(x: number, y: number, width: number, height: number, radius: number, spread: number, color: number): void;

    // -- Images ---------------------------------------------------------------------------

    /**
     * Loads an image from the client's resource path and returns a handle.
     * Never `null` — a failed load yields a handle whose `isValid()` is
     * `false` rather than throwing, so check that before drawing. Cached:
     * repeat calls with the same path are cheap.
     */
    loadImage(path: string): ScriptImage;
    /** Draws a loaded image within the given bounds with optional corner rounding. */
    image(handle: ScriptImage, x: number, y: number, width: number, height: number, radius: number): void;
    /** Draws a loaded image multiplied by a tint color (recoloring icons, fading). */
    imageTinted(handle: ScriptImage, x: number, y: number, width: number, height: number, radius: number, tint: number): void;
    /** Releases a GPU image previously obtained from `loadImage`. */
    destroyImage(handle: ScriptImage): void;

    // -- Path API ---------------------------------------------------------------------------

    /** Begins a new custom path; subsequent moveTo/lineTo/quadTo/cubicTo calls build it. */
    beginPath(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    /** Quadratic bézier curve through control point (cx, cy) to (x, y). */
    quadTo(cx: number, cy: number, x: number, y: number): void;
    /** Cubic bézier curve through control points (c1x, c1y) and (c2x, c2y) to (x, y). */
    cubicTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
    /** Sets the stroke color used by the next `stroke()` call. */
    strokeColor(color: number): void;
    /** Sets the stroke width used by the next `stroke()` call. */
    strokeWidth(width: number): void;
    /** Strokes the current path using the active stroke color and width. */
    stroke(): void;
    /** Closes the current path, connecting its last point back to its first. */
    closePath(): void;

    // -- Text rendering ---------------------------------------------------------------------

    /** Draws a line of text and returns its advance width. */
    text(fontName: OpalFontName | string, text: string, x: number, y: number, size: number, color: number): number;
    /** Draws a line of text with a drop shadow and returns its advance width. */
    textShadow(fontName: OpalFontName | string, text: string, x: number, y: number, size: number, color: number): number;
    /** Draws a line of text filled with a horizontal two-color gradient. */
    textGradient(fontName: OpalFontName | string, text: string, x: number, y: number, size: number, color1: number, color2: number): void;
    /** Measures the rendered width of a string without drawing it. */
    textWidth(fontName: OpalFontName | string, text: string, size: number): number;
    /** Measures the rendered height of a string without drawing it. */
    textHeight(fontName: OpalFontName | string, text: string, size: number): number;
    /** Wraps a string into lines that each fit within the given width. */
    wrapText(fontName: OpalFontName | string, text: string, width: number, size: number): ScriptList<string>;
    /** Trims a string to fit within the given width, appending an ellipsis if truncated. */
    trimText(fontName: OpalFontName | string, text: string, width: number, size: number): string;

    // -- Transforms -------------------------------------------------------------------------

    /** Runs `content` under a uniform scale transform pivoted at the center of the given rectangle. */
    scale(factor: number, x: number, y: number, width: number, height: number, content: () => void): void;
    /** Runs `content` with the origin translated to the rectangle's center and rotated by `degrees`. */
    rotate(degrees: number, x: number, y: number, width: number, height: number, content: () => void): void;
    /** Pushes a scissor/clip region, runs `content`, then pops it. */
    scissor(x: number, y: number, width: number, height: number, content: () => void): void;
    /** Sets the global alpha multiplier applied to all subsequent draws this frame. */
    globalAlpha(alpha: number): void;

    // -- Color helpers ----------------------------------------------------------------------

    /** Packs r/g/b/a (0-255 each) into an ARGB integer. Prefer this over raw 0xAARRGGBB literals. */
    color(r: number, g: number, b: number, a: number): number;
    /** Packs r/g/b (0-255 each) into a fully opaque ARGB integer (alpha 255). */
    color(r: number, g: number, b: number): number;
    /** Replaces the alpha channel of an ARGB color, preserving its RGB channels. */
    withAlpha(color: number, alpha: number): number;
    /** Scales the alpha of an ARGB color by an opacity factor (0.0-1.0). */
    applyOpacity(color: number, opacity: number): number;
    /** Linearly interpolates between two ARGB colors (0.0 = color1, 1.0 = color2). */
    interpolate(color1: number, color2: number, factor: number): number;
    /** Darkens an ARGB color by the given factor. */
    darker(color: number, factor: number): number;
    /** Brightens an ARGB color by the given factor. */
    brighter(color: number, factor: number): number;
}

declare const renderer: RendererProxy;

// ---------------------------------------------------------------------------
// palette — PaletteProxy (command-palette views)
// ---------------------------------------------------------------------------

interface OpalPaletteFooterHint {
    key: string;
    label: string;
}

interface OpalPaletteViewConfig {
    /** Unique view id. Passed to `openView` / `removeView`. */
    id: string;
    /** Draws one frame into the content rectangle. `dt` is wall-clock seconds since the last frame. */
    render(x: number, y: number, w: number, h: number, dt: number): void;
    /** Display title shown in the palette list (searchable). Defaults to `id`. */
    title?: string;
    /** Sub-text shown beside the title. Defaults to "Script view". */
    description?: string;
    /** Placeholder text shown in the search row while the view is open. */
    placeholder?: string;
    /** Footer key hints, e.g. `[{ key: "Space", label: "Start" }]`. */
    footer?: OpalPaletteFooterHint[];
    /** Handles a key press. Return true to consume. Esc always closes the view before reaching here. */
    keyPressed?(keyCode: number, mods: number): boolean;
    /** Handles a typed character. Return true to consume. */
    charTyped?(codepoint: number): boolean;
    /** Handles a click in content-local coordinates. Return true to consume. */
    mouseClicked?(localX: number, localY: number, button: number): boolean;
}

interface PaletteProxy {
    /**
     * Creates and registers a custom palette view. Requires at least
     * `{ id, render }`. Returns the view id, or null if the config was invalid.
     */
    createView(config: OpalPaletteViewConfig): string | null;
    /** Opens the command palette directly into a previously registered view. */
    openView(id: string): void;
    /** Unregisters a previously registered view. */
    removeView(id: string): void;
}

declare const palette: PaletteProxy;

// ---------------------------------------------------------------------------
// keys — GLFW key code constants (for palette view keyPressed handlers)
// ---------------------------------------------------------------------------

interface OpalKeys {
    UP: number;
    DOWN: number;
    LEFT: number;
    RIGHT: number;
    SPACE: number;
    ENTER: number;
    ESCAPE: number;
    TAB: number;
    BACKSPACE: number;
    LEFT_SHIFT: number;
    LEFT_CONTROL: number;
    A: number; B: number; C: number; D: number; E: number; F: number; G: number; H: number;
    I: number; J: number; K: number; L: number; M: number; N: number; O: number; P: number;
    Q: number; R: number; S: number; T: number; U: number; V: number; W: number; X: number;
    Y: number; Z: number;
    NUM_0: number; NUM_1: number; NUM_2: number; NUM_3: number; NUM_4: number;
    NUM_5: number; NUM_6: number; NUM_7: number; NUM_8: number; NUM_9: number;
    F1: number; F2: number; F3: number; F4: number; F5: number; F6: number;
    F7: number; F8: number; F9: number; F10: number; F11: number; F12: number;
    /** Left mouse button. */
    MOUSE_0: number;
    /** Right mouse button. */
    MOUSE_1: number;
    /** Middle mouse button. */
    MOUSE_2: number;
    MOUSE_3: number;
    MOUSE_4: number;
    /** The "no bind" sentinel — what `module.getBind()` returns when unbound. */
    NONE: number;
}

declare const keys: OpalKeys;

// ---------------------------------------------------------------------------
// timer — stopwatch helper
// ---------------------------------------------------------------------------

/** Stopwatch handle returned by `timer.create()`. Tracks elapsed time since
 * the last `reset()` (or since creation, if never reset). */
interface OpalStopwatch {
    /** Resets the elapsed-time baseline to now. */
    reset(): void;
    /** Milliseconds elapsed since the last `reset()` (or creation). */
    elapsed(): number;
    /** Whether at least `ms` milliseconds have elapsed since the last reset. */
    passed(ms: number): boolean;
    /** `passed(ms)`, and if true, also resets the baseline — the common
     * "has enough time gone by? if so, restart the clock" rate-limit check. */
    passedAndReset(ms: number): boolean;
}

interface OpalTimer {
    /** Creates a new stopwatch, its baseline starting at the moment of creation. */
    create(): OpalStopwatch;
    /** Current engine time in milliseconds — a raw timestamp, not tied to any stopwatch. */
    now(): number;
}

declare const timer: OpalTimer;

// ---------------------------------------------------------------------------
// Bound Java interop types (see world/types.mdx)
// ---------------------------------------------------------------------------

/** Yaw/pitch pair. Construct with `new Vec2f(yaw, pitch)`. */
declare class Vec2f {
    constructor(yaw: number, pitch: number);
    getYaw(): number;
    getPitch(): number;
}

/**
 * Integer block position, backed by the `ScriptBlockPos` wrapper. Construct
 * with `new BlockPos(x, y, z)`.
 */
declare class BlockPos {
    constructor(x: number, y: number, z: number);
    getX(): number;
    getY(): number;
    getZ(): number;
    /** Returns a new BlockPos shifted one block in the given direction. */
    offset(direction: Direction): BlockPos;
}

/**
 * A cardinal or vertical facing direction. Scripts do not construct this
 * directly — obtain one from `world.getAdjacentDirections(pos)`.
 */
interface Direction {
    getOpposite(): Direction;
    getName(): "north" | "south" | "east" | "west" | "up" | "down";
}

/**
 * A validated rotation paired with the hit result needed for block/entity
 * interaction. Returned by `rotation.getRotationFromRaycastedBlock()` and
 * `rotation.getRotationFromRaycastedEntity()` — may be null.
 */
interface RaytracedRotation {
    getYaw(): number;
    getPitch(): number;
    /** Pass to `mc.interactionManager.interactBlock()`. */
    getHitResult(): HitResult;
}

/**
 * A world-space double vector — the `ScriptVec3` wrapper. Returned by
 * `player.getPosition()`/`getEyePosition()`/`getVelocity()`/`getClosestPoint()`,
 * `rotation.getRotationVector()`, and the `esp` projection methods.
 *
 * Bound as `Vec3d`, so `new Vec3d(x, y, z)` constructs one. (The global used
 * to be the raw Mojang `Vec3` class, which was neither constructible nor
 * readable from a script — `HostAccess.EXPLICIT` exports nothing on it.)
 */
declare class Vec3d {
    constructor(x: number, y: number, z: number);
    getX(): number;
    getY(): number;
    getZ(): number;
    /** Length of this vector from the origin. */
    length(): number;
    distanceTo(other: Vec3d): number;
    add(other: Vec3d): Vec3d;
    subtract(other: Vec3d): Vec3d;
    toString(): string;
}

/**
 * Raw `net.minecraft.util.Mth` math utility, bound as `MathHelper`.
 *
 * **Unusable — do not reach for it.** It is bound as the raw Mojang class,
 * which carries no `@HostAccess.Export`, so every call on it is denied at
 * runtime. Use `esp.lerp(start, end, tickDelta)` for interpolation, or
 * JavaScript's built-in `Math` for general math.
 */
declare const MathHelper: Record<string, never>;

/**
 * Standard `java.awt.Color`. The one JDK type scripts can touch directly: its
 * two constructors and `getRGB()` are explicitly allow-listed by the
 * host-access policy, which is why they work where `MathHelper`'s do not. An
 * alternative to `renderer.color(r, g, b, a)` for building packed ARGB ints.
 */
declare class Color {
    constructor(r: number, g: number, b: number, a?: number);
    /** Packed ARGB integer, suitable for any renderer color parameter. */
    getRGB(): number;
}

/** `net.minecraft.world.InteractionHand` enum constant. */
interface InteractionHand {}
/** The player's main hand. */
declare const MAIN_HAND: InteractionHand;
/** The player's off hand. */
declare const OFF_HAND: InteractionHand;

// ---------------------------------------------------------------------------
// Script wrapper types
//
// Everything the API hands a script is one of these: a primitive, a String, a
// Script* wrapper exposing getters, or an explicitly opaque token. Nothing
// else is reachable — HostAccess.EXPLICIT grants no member access on
// un-annotated types, no bean-property mapping, and no container access, and
// it fails silently (a property read on a raw object is `undefined`, never an
// error). So: getters never properties, ScriptList never arrays, and an
// opaque brand means genuinely no readable members.
// ---------------------------------------------------------------------------

/**
 * An entity — the `ScriptEntity` wrapper. What `world.getEntities()`,
 * `world.getLivingEntitiesInRange()`, `mc.getPlayer()` and
 * `AttackEvent.getTarget()` hand a script.
 *
 * `getName()` returns a plain `string`. It used to return a Minecraft
 * `Component`, forcing an `entity.getName().getString()` idiom — that is gone,
 * and `.getString()` on the result will now fail.
 *
 * The living-only reads (`getHealth`, `getMaxHealth`, `getAbsorption`,
 * `getArmor`) answer `-1` on a non-living entity — gate on `>= 0`, since `0`
 * is a legitimate value for several of them.
 */
interface Entity {
    /** Localised display name, as plain text. */
    getName(): string;
    getId(): number;
    getUuid(): string;
    isAlive(): boolean;
    /** Whether this entity is living (a mob or a player) and so has health. */
    isLiving(): boolean;
    isPlayer(): boolean;
    getX(): number;
    getY(): number;
    getZ(): number;
    getYaw(): number;
    getPitch(): number;
    /** Current health, or `-1` if not a living entity. */
    getHealth(): number;
    /** Maximum health, or `-1` if not a living entity. */
    getMaxHealth(): number;
    /** Absorption (golden hearts), or `-1` if not a living entity. */
    getAbsorption(): number;
    /** Armor points (0-20), or `-1` if not a living entity. */
    getArmor(): number;
    /** Distance from the local player, in blocks. */
    getDistance(): number;
    /** Whether this entity has the named effect (matched on display name, case-insensitively). */
    hasEffect(name: string): boolean;
    /** The named effect, or `null` if absent or this is not a living entity. */
    getEffect(name: string): Effect | null;
    /** Every active effect on this entity. Empty for a non-living entity. */
    getEffects(): ScriptList<Effect>;
}
/** A living entity (mob or player). Same wrapper — `isLiving()` reports which. */
type LivingEntity = Entity;

/**
 * One active status effect — the `ScriptEffect` wrapper. Obtain from
 * `player.getEffects()`/`getEffect(name)` or the entity equivalents.
 */
interface Effect {
    /** Namespaced registry id, e.g. `"minecraft:strength"`. */
    getId(): string;
    /** Localised display name, e.g. `"Strength"`. */
    getName(): string;
    /** **0-based** amplifier, as Minecraft stores it: Strength II is `1`. */
    getAmplifier(): number;
    /** **1-based** level, as a nameplate shows it: Strength II is `2`. */
    getLevel(): number;
    /** Remaining duration in ticks (20 per second). */
    getDuration(): number;
    /** Remaining duration in whole seconds. */
    getDurationSeconds(): number;
    isInfinite(): boolean;
    /** Whether this effect came from a beacon or conduit rather than a potion. */
    isAmbient(): boolean;
    /** Packed ARGB color of the effect's particles. */
    getColor(): number;
}

/**
 * An item stack — the `ScriptItemStack` wrapper, from `inventory.getStack()` /
 * `getMainHandStack()` / `getOffHandStack()`.
 */
interface ItemStack {
    isEmpty(): boolean;
    getCount(): number;
    /** Localised display name, as plain text. */
    getName(): string;
    /** Namespaced registry id, e.g. `"minecraft:diamond_pickaxe"`. */
    getId(): string;
    isDamageable(): boolean;
    /** Durability used so far. `0` when not damageable. */
    getDamage(): number;
    /** Total durability. `0` when not damageable. */
    getMaxDamage(): number;
    isBlock(): boolean;
}

/**
 * A world-space axis-aligned bounding box — the `ScriptBox3D` wrapper, from
 * `player.getBoundingBox()`.
 */
interface Box3D {
    getMinX(): number;
    getMinY(): number;
    getMinZ(): number;
    getMaxX(): number;
    getMaxY(): number;
    getMaxZ(): number;
    getWidth(): number;
    getHeight(): number;
    getDepth(): number;
    toString(): string;
}

/**
 * A screen-space rectangle — the `ScriptBox2D` wrapper, from
 * `esp.getEntityBox2D()`.
 *
 * The components are laid out `(x, y, width, height)`, **not** four corners.
 * Both spellings are exported: the raw component names (`getZ()` is the width,
 * `getW()` the height) and the readable ones.
 */
interface Box2D {
    /** Left edge (screen X). */
    getX(): number;
    /** Top edge (screen Y). */
    getY(): number;
    /** The width, under its raw component name. Same as `getWidth()`. */
    getZ(): number;
    /** The height, under its raw component name. Same as `getHeight()`. */
    getW(): number;
    /** Left edge — the readable spelling of `getX()`. */
    getX1(): number;
    /** Top edge — the readable spelling of `getY()`. */
    getY1(): number;
    /** Right edge (`x + width`). */
    getX2(): number;
    /** Bottom edge (`y + height`). */
    getY2(): number;
    getWidth(): number;
    getHeight(): number;
    toString(): string;
}

/**
 * An opaque pass-back token from `RaytracedRotation.getHitResult()`.
 *
 * **Deliberately memberless.** A script can read nothing off it and does not
 * need to: its only legitimate use is being handed straight to
 * `mc.interactionManager.interactBlock()`.
 */
interface HitResult {}

/**
 * A loaded image — the `ScriptImage` wrapper, from `renderer.loadImage()`.
 *
 * `loadImage` always returns a handle, never `null`: check `isValid()` before
 * drawing, since a failed load yields an invalid handle rather than an error.
 */
interface ScriptImage {
    isValid(): boolean;
    /** Pixel width, or `0` when invalid. */
    getWidth(): number;
    /** Pixel height, or `0` when invalid. */
    getHeight(): number;
    toString(): string;
}

/**
 * A container as seen from script code — the `ScriptList` wrapper.
 *
 * **Not an array, and not iterable.** `HostAccess.EXPLICIT` grants no
 * container access, so a raw `java.util.List` handed to a script is completely
 * inert; this wrapper exports exactly the three members below. `list.length`,
 * `list[0]`, `for..of`, `.map`, and the spread operator do not work on one.
 * Walk it with an index:
 *
 * ```js
 * const entities = world.getLivingEntitiesInRange(16);
 * for (let i = 0; i < entities.size(); i++) {
 *     const entity = entities.get(i);
 * }
 * ```
 */
interface ScriptList<T> {
    size(): number;
    isEmpty(): boolean;
    /** Bounds-safe: an out-of-range index returns `null` rather than throwing. */
    get(index: number): T | null;
}
