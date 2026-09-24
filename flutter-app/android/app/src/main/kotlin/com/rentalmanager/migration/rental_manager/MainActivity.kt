package com.rentalmanager.migration.rental_manager

import android.app.Activity
import android.content.Intent
import android.provider.DocumentsContract
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private var pending: MethodChannel.Result? = null
    private var pdf: ByteArray? = null
    private var fileName: String = "invoice.pdf"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "rental_manager/files")
            .setMethodCallHandler { call, result ->
                if (call.method != "savePdf") { result.notImplemented(); return@setMethodCallHandler }
                if (pending != null) { result.error("busy", "A save is already in progress.", null); return@setMethodCallHandler }
                val bytes = call.argument<ByteArray>("bytes")
                if (bytes == null) { result.error("invalid", "No PDF data supplied.", null); return@setMethodCallHandler }
                pdf = bytes
                fileName = (call.argument<String>("name") ?: "invoice.pdf").replace(Regex("[^a-zA-Z0-9._-]"), "_")
                pending = result
                try { startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT_TREE), 4071) }
                catch (e: Exception) { pending = null; pdf = null; result.error("save", e.message, null) }
            }
    }

    @Deprecated("Used for the Storage Access Framework picker")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != 4071) return
        val result = pending ?: return
        pending = null
        val bytes = pdf
        pdf = null
        if (resultCode != Activity.RESULT_OK || data?.data == null || bytes == null) {
            result.error("cancelled", "Download was cancelled before a save folder was selected.", null)
            return
        }
        try {
            val tree = data.data!!
            val parent = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree))
            val target = DocumentsContract.createDocument(contentResolver, parent, "application/pdf", fileName)
                ?: throw IllegalStateException("Unable to create PDF file.")
            contentResolver.openOutputStream(target)?.use { it.write(bytes) }
                ?: throw IllegalStateException("Unable to write PDF file.")
            result.success(null)
        } catch (e: Exception) { result.error("save", e.message, null) }
    }
}
