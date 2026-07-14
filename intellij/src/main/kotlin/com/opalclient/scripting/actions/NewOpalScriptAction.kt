package com.opalclient.scripting.actions

import com.intellij.ide.actions.CreateFileFromTemplateAction
import com.intellij.ide.actions.CreateFileFromTemplateDialog
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.psi.PsiDirectory
import com.opalclient.scripting.icons.OpalIcons

private const val TEMPLATE_NAME = "Opal Script"

/**
 * "File | New | Opal Script" action. Scaffolds a starter script from the
 * bundled `Opal Script.js.ft` internal file template (registerScript +
 * registerModule boilerplate with enable/disable/preGameTick/renderScreen
 * handlers already wired up).
 *
 * Also makes sure `opal-globals.d.ts` exists in the target project, so the
 * very first script a user creates already gets full IDE completion on
 * `client`/`player`/`world`/`renderer`/... without any extra setup step.
 * This runs when the action is invoked (dialog build time) rather than
 * after the file is created, so it happens regardless of whether the user
 * confirms or cancels the "new file" dialog -- which is fine, since it only
 * ever creates the types file if one isn't already present (see
 * [OpalGlobalsInstaller.ensureInstalled]).
 */
class NewOpalScriptAction :
    CreateFileFromTemplateAction(
        TEMPLATE_NAME,
        "Creates a new Opal scripting engine script (.js) preloaded with registerScript/registerModule boilerplate",
        OpalIcons.SCRIPT,
    ),
    DumbAware {

    override fun buildDialog(project: Project, directory: PsiDirectory, builder: CreateFileFromTemplateDialog.Builder) {
        OpalGlobalsInstaller.ensureInstalled(project)

        builder
            .setTitle("New Opal Script")
            .addKind("Opal Script", OpalIcons.SCRIPT, TEMPLATE_NAME)
    }

    override fun getActionName(directory: PsiDirectory, newName: String, templateName: String): String = TEMPLATE_NAME
}
