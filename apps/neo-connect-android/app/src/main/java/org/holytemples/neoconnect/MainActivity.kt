package org.holytemples.neoconnect

import android.app.Activity
import android.os.Bundle
import android.graphics.Color
import android.view.Gravity
import android.widget.*
import android.text.method.ScrollingMovementMethod
import java.io.File
import java.util.concurrent.Executors

/**
 * NEO Connect's first native terminal prototype. Commands run locally inside
 * this app's Android UID/sandbox; this is not a privileged Linux container,
 * PTY, Termux fork or remote-shell implementation.
 */
class MainActivity : Activity() {
    private val worker = Executors.newSingleThreadExecutor()
    private lateinit var output: TextView
    private lateinit var command: EditText
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(6, 23, 19))
            setPadding(24, 28, 24, 24)
        }
        val heading = TextView(this).apply {
            text = "NEO CONNECT  •  LOCAL TERMINAL"
            setTextColor(Color.rgb(125, 242, 178))
            textSize = 18f
        }
        val help = TextView(this).apply {
            text = "Android app sandbox · no root · no remote access\nBuilt-in commands depend on your Android device."
            setTextColor(Color.LTGRAY)
            textSize = 12f
        }
        output = TextView(this).apply {
            text = "NEO Connect v0.1\nReady. Try: pwd, id, ls\n"
            setTextColor(Color.WHITE)
            typeface = android.graphics.Typeface.MONOSPACE
            textSize = 13f
            movementMethod = ScrollingMovementMethod()
            setTextIsSelectable(true)
        }
        command = EditText(this).apply {
            hint = "Enter local command"
            setSingleLine(true)
            setTextColor(Color.WHITE)
            setHintTextColor(Color.GRAY)
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
        }
        val run = Button(this).apply {
            text = "RUN LOCALLY"
            setOnClickListener { executeLocal(command.text.toString()) }
        }
        layout.addView(heading)
        layout.addView(help)
        val scroll = ScrollView(this)
        scroll.addView(output)
        layout.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        layout.addView(command)
        layout.addView(run)
        setContentView(layout)
    }
    private fun executeLocal(line: String) {
        if (line.isBlank()) return
        command.text.clear()
        output.append("\n$ $line\n")
        worker.execute {
            try {
                val process = ProcessBuilder("/system/bin/sh", "-c", line)
                    .directory(filesDir)
                    .redirectErrorStream(true).start()
                val text = process.inputStream.bufferedReader().use { it.readText().take(65536) }
                val code = process.waitFor()
                runOnUiThread { output.append(text + "\n[exit $code]\n") }
            } catch (ex: Exception) {
                runOnUiThread { output.append("[error] ${ex.javaClass.simpleName}\n") }
            }
        }
    }
    override fun onDestroy() { worker.shutdownNow(); super.onDestroy() }
}
