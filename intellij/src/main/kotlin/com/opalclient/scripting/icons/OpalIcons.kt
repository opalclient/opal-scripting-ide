package com.opalclient.scripting.icons

import com.intellij.openapi.util.IconLoader

/** Icons bundled with the Opal Scripting plugin. */
object OpalIcons {

    /** The icon shown for the "New Opal Script" action and file-template kind. */
    @JvmField
    val SCRIPT = IconLoader.getIcon("/icons/opalScript.svg", OpalIcons::class.java)
}
