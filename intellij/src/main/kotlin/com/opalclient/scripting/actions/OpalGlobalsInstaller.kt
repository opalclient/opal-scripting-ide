package com.opalclient.scripting.actions

import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.project.Project
import com.intellij.openapi.project.guessProjectDir
import com.intellij.openapi.vfs.VfsUtil
import java.io.IOException

/**
 * Copies the bundled `opal-globals.d.ts` ambient type declaration into a
 * project so IntelliJ's built-in JavaScript/TypeScript engine picks up the
 * Opal scripting API (`client`, `player`, `world`, `renderer`, ...) as global
 * ambient types in every plain `.js` script -- no tsconfig.json, no import,
 * no build step.
 */
object OpalGlobalsInstaller {

    private const val RESOURCE_PATH = "/opal-globals.d.ts"
    const val TARGET_FILE_NAME = "opal-globals.d.ts"

    /**
     * Ensures `opal-globals.d.ts` exists at the project root.
     *
     * @param forceOverwrite when `true`, always rewrites the file with the
     *   bundled contents (used by the explicit "Insert/Update" action). When
     *   `false`, an existing file is left untouched (used by the "New Opal
     *   Script" scaffold action, which must never clobber a user's local
     *   edits to the type definitions).
     * @return `true` if the file exists (or was created/updated) after this call.
     */
    fun ensureInstalled(project: Project, forceOverwrite: Boolean = false): Boolean {
        val baseDir = project.guessProjectDir() ?: return false
        val existing = baseDir.findChild(TARGET_FILE_NAME)
        if (existing != null && !forceOverwrite) {
            return true
        }

        val contents = OpalGlobalsInstaller::class.java.getResourceAsStream(RESOURCE_PATH)
            ?.bufferedReader()
            ?.use { it.readText() }
            ?: return false

        return try {
            WriteCommandAction.runWriteCommandAction(project) {
                val file = existing ?: baseDir.createChildData(OpalGlobalsInstaller, TARGET_FILE_NAME)
                VfsUtil.saveText(file, contents)
            }
            true
        } catch (e: IOException) {
            false
        }
    }
}
