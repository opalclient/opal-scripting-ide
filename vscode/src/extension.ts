import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

const BUNDLED_DTS_RELATIVE_PATH = path.join("typings", "opal-globals.d.ts");
const WORKSPACE_DTS_RELATIVE_PATH = path.join(".vscode", "opal.d.ts");
const JSCONFIG_INCLUDE_ENTRIES = ["**/*.js", ".vscode/opal.d.ts"];

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext): void {
    outputChannel = vscode.window.createOutputChannel("Opal Scripting");
    context.subscriptions.push(outputChannel);

    context.subscriptions.push(
        vscode.commands.registerCommand("opal.newScript", () => createNewScript(context)),
        vscode.commands.registerCommand("opal.installTypeDefinitions", () => installTypeDefinitions(context, { announce: true })),
    );

    // Best-effort: wire up IntelliSense for every workspace folder already
    // open when the extension activates. Silent — this should never
    // interrupt the user with a popup on ordinary startup.
    installTypeDefinitions(context, { announce: false }).catch((err) => log(`Activation install failed: ${describeError(err)}`));

    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders((event) => {
            if (event.added.length === 0) {
                return;
            }
            installTypeDefinitions(context, { announce: false, folders: event.added }).catch((err) =>
                log(`Install-on-folder-add failed: ${describeError(err)}`),
            );
        }),
    );
}

export function deactivate(): void {
    // Nothing to tear down — the files written to the workspace are meant
    // to persist (they are ordinary IntelliSense config, not a live process).
}

/**
 * Copies the bundled ambient `.d.ts` into `.vscode/opal.d.ts` for each
 * target workspace folder, and makes sure a `jsconfig.json` at the folder
 * root includes it (creating a minimal one if none exists, or merging the
 * `include` array into an existing one without touching anything else the
 * user has configured).
 */
async function installTypeDefinitions(
    context: vscode.ExtensionContext,
    options: { announce: boolean; folders?: readonly vscode.WorkspaceFolder[] },
): Promise<void> {
    const folders = options.folders ?? vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
        if (options.announce) {
            vscode.window.showWarningMessage("Opal Scripting: open a folder or workspace first, then run this command again.");
        }
        return;
    }

    const bundledDtsPath = path.join(context.extensionPath, BUNDLED_DTS_RELATIVE_PATH);
    let bundledDts: string;
    try {
        bundledDts = await fs.promises.readFile(bundledDtsPath, "utf8");
    } catch (err) {
        log(`Could not read bundled type definitions at ${bundledDtsPath}: ${describeError(err)}`);
        if (options.announce) {
            vscode.window.showErrorMessage("Opal Scripting: bundled type definitions are missing from this install.");
        }
        return;
    }

    const touchedFolders: string[] = [];
    for (const folder of folders) {
        const root = folder.uri.fsPath;
        try {
            await writeWorkspaceDts(root, bundledDts);
            await ensureJsconfig(root);
            touchedFolders.push(folder.name);
        } catch (err) {
            log(`Failed to install type definitions into ${root}: ${describeError(err)}`);
        }
    }

    if (options.announce) {
        if (touchedFolders.length > 0) {
            vscode.window.showInformationMessage(
                `Opal Scripting: type definitions installed for ${touchedFolders.join(", ")}. Reload the window if IntelliSense doesn't pick them up immediately.`,
            );
        } else {
            vscode.window.showErrorMessage("Opal Scripting: could not install type definitions — see the \"Opal Scripting\" output channel for details.");
        }
    }
}

async function writeWorkspaceDts(workspaceRoot: string, contents: string): Promise<void> {
    const targetPath = path.join(workspaceRoot, WORKSPACE_DTS_RELATIVE_PATH);
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

    // Always refresh: this file is generated, so re-syncing on every
    // activation keeps a workspace's IntelliSense current with whatever
    // extension version the user has installed.
    await fs.promises.writeFile(targetPath, contents, "utf8");
    log(`Wrote ${targetPath}`);
}

interface JsconfigShape {
    compilerOptions?: Record<string, unknown>;
    include?: unknown;
    [key: string]: unknown;
}

async function ensureJsconfig(workspaceRoot: string): Promise<void> {
    const jsconfigPath = path.join(workspaceRoot, "jsconfig.json");

    let existingRaw: string | undefined;
    try {
        existingRaw = await fs.promises.readFile(jsconfigPath, "utf8");
    } catch {
        existingRaw = undefined;
    }

    if (existingRaw === undefined) {
        const fresh: JsconfigShape = {
            compilerOptions: {
                target: "es2021",
                lib: ["es2021"],
                checkJs: false,
                allowJs: true,
            },
            include: JSCONFIG_INCLUDE_ENTRIES,
        };
        await fs.promises.writeFile(jsconfigPath, `${JSON.stringify(fresh, null, 4)}\n`, "utf8");
        log(`Created ${jsconfigPath}`);
        return;
    }

    // A jsconfig.json already exists. Merge the include entries in
    // conservatively; if it isn't valid JSON (e.g. it has comments), leave
    // it untouched rather than risk clobbering hand-authored config —
    // the ambient .d.ts already works without jsconfig.json in many setups
    // via VS Code's inferred JS project, so this is a best-effort upgrade.
    let parsed: JsconfigShape;
    try {
        parsed = JSON.parse(existingRaw);
    } catch (err) {
        log(`Existing jsconfig.json at ${jsconfigPath} is not plain JSON (comments?) — leaving it untouched: ${describeError(err)}`);
        return;
    }

    const include = Array.isArray(parsed.include) ? (parsed.include as unknown[]) : [];
    const includeSet = new Set(include.map(String));
    let changed = false;
    for (const entry of JSCONFIG_INCLUDE_ENTRIES) {
        if (!includeSet.has(entry)) {
            include.push(entry);
            includeSet.add(entry);
            changed = true;
        }
    }

    if (!changed) {
        return;
    }

    parsed.include = include;
    await fs.promises.writeFile(jsconfigPath, `${JSON.stringify(parsed, null, 4)}\n`, "utf8");
    log(`Updated include[] in ${jsconfigPath}`);
}

/**
 * "Opal: New Script" — prompts for a name and scaffolds a starter `.js`
 * file (module registration + settings example + a commented event
 * handler), mirroring the anatomy shown in intro.mdx / settings.mdx.
 */
async function createNewScript(context: vscode.ExtensionContext): Promise<void> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
        vscode.window.showErrorMessage("Opal Scripting: open the folder you keep your scripts in first (usually opal/scripts/).");
        return;
    }

    const name = await vscode.window.showInputBox({
        title: "Opal: New Script",
        prompt: "Script / module name",
        placeHolder: "MyScript",
        validateInput: (value) => validateScriptName(value),
    });
    if (!name) {
        return; // cancelled
    }

    let targetFolder: vscode.WorkspaceFolder;
    if (folders.length === 1) {
        targetFolder = folders[0];
    } else {
        const pick = await vscode.window.showWorkspaceFolderPick({ placeHolder: "Where should the script be created?" });
        if (!pick) {
            return;
        }
        targetFolder = pick;
    }

    const fileName = `${sanitizeFileName(name)}.js`;
    const targetPath = path.join(targetFolder.uri.fsPath, fileName);

    if (fs.existsSync(targetPath)) {
        const choice = await vscode.window.showWarningMessage(
            `${fileName} already exists in ${targetFolder.name}. Overwrite it?`,
            { modal: true },
            "Overwrite",
        );
        if (choice !== "Overwrite") {
            return;
        }
    }

    await fs.promises.writeFile(targetPath, scriptTemplate(name), "utf8");

    // Make sure the workspace this file lives in has IntelliSense wired up
    // too, so the freshly-created file gets hover/autocomplete immediately.
    installTypeDefinitions(context, { announce: false, folders: [targetFolder] }).catch((err) =>
        log(`Install after scaffold failed: ${describeError(err)}`),
    );

    const document = await vscode.workspace.openTextDocument(targetPath);
    await vscode.window.showTextDocument(document);
}

function validateScriptName(value: string): string | undefined {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return "Script name can't be empty.";
    }
    if (trimmed.length > 32) {
        // Matches the 1-32 character limit enforced when a script is
        // later uploaded to the private cloud (publishing.mdx).
        return "Script names must be 32 characters or fewer to match the cloud-upload limit.";
    }
    if (/[\\/:*?"<>|]/.test(trimmed)) {
        return "Script name can't contain \\ / : * ? \" < > |";
    }
    return undefined;
}

function sanitizeFileName(name: string): string {
    return name.trim().replace(/[\\/:*?"<>|]+/g, "_");
}

function scriptTemplate(name: string): string {
    const safeName = name.replace(/"/g, '\\"');
    return `const script = registerScript({
    name: "${safeName}",
    version: "1.0.0",
    authors: ["You"]
});

script.registerModule({
    name: "${safeName}",
    description: "Describe what this module does"
}, (module) => {
    // Settings must be defined before any module.on(...) calls below.
    module.addBool("Enabled", true);
    module.addNumber("Speed", 1.0, 0.1, 5.0, 0.1);
    module.addMode("Mode", ["Vanilla", "NCP"]);
    module.addGroup("Options", ["Speed", "Mode"]);

    module.on("enable", () => {
        client.print("${safeName} enabled!");
    });

    module.on("disable", () => {
        client.print("${safeName} disabled!");
    });

    module.on("preGameTick", () => {
        // Always null-check — these are null in menus and loading screens.
        if (mc.player === null || mc.world === null) return;
        if (!module.getBool("Enabled")) return;

        // const speed = module.getNumber("Speed");
        // const mode = module.getMode("Mode");
        //
        // Runs 20 times/second — this is where your per-tick logic goes.
    });

    // Renderer calls only work during render events — uncomment to draw
    // on the HUD (see the Renderer reference for the full drawing API).
    // module.on("renderScreen", (event) => {
    //     renderer.text("productsans-medium", "${safeName}", 10, 10, 8, renderer.color(255, 255, 255));
    // });
});
`;
}

function log(message: string): void {
    outputChannel?.appendLine(message);
}

function describeError(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}
