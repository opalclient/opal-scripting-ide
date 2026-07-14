package com.opalclient.scripting.actions

import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAware

/**
 * "Tools | Insert/Update Opal Type Definitions" action. Copies (or refreshes)
 * the bundled `opal-globals.d.ts` into the current project's root, for
 * projects that weren't scaffolded with "New Opal Script" or whose copy has
 * drifted from the version bundled with this plugin.
 *
 * Unlike the scaffold action, this one always overwrites -- it is the
 * explicit "update" entry point.
 */
class InsertOpalGlobalsAction : AnAction(), DumbAware {

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val installed = OpalGlobalsInstaller.ensureInstalled(project, forceOverwrite = true)

        val group = NotificationGroupManager.getInstance().getNotificationGroup("Opal Scripting")
        val message = if (installed) {
            "${OpalGlobalsInstaller.TARGET_FILE_NAME} installed/updated at the project root."
        } else {
            "Could not write ${OpalGlobalsInstaller.TARGET_FILE_NAME} -- check the project has a writable content root."
        }
        group.createNotification(message, if (installed) NotificationType.INFORMATION else NotificationType.WARNING)
            .notify(project)
    }
}
