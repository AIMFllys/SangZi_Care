package com.sangzi.smartcare

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.speech.RecognizerIntent
import android.speech.tts.TextToSpeech
import android.webkit.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.util.Locale

/**
 * 智护银龄 — 桑梓智护项目主 Activity
 * WebView 加载 Next.js 静态导出的 HTML/JS/CSS
 * 实现 JSBridge 原生端：电话拨打、TTS、ASR、存储
 */
class MainActivity : AppCompatActivity(), TextToSpeech.OnInitListener {

    private lateinit var webView: WebView
    private var tts: TextToSpeech? = null
    private val CALL_PHONE_REQUEST = 1001
    private val RECORD_AUDIO_REQUEST = 1002
    private var pendingPhoneNumber: String? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 初始化 TTS
        tts = TextToSpeech(this, this)

        // 创建 WebView
        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }

        setContentView(webView)

        // 注入 JSBridge
        webView.addJavascriptInterface(JSBridge(), "SangZiBridge")

        // 拦截 tel: 协议
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.startsWith("tel:")) {
                    makePhoneCall(url.removePrefix("tel:"))
                    return true
                }
                return false
            }
        }

        // 加载本地静态文件
        webView.loadUrl("file:///android_asset/web/index.html")
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale.CHINESE
        }
    }

    private fun makePhoneCall(number: String) {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE)
            == PackageManager.PERMISSION_GRANTED
        ) {
            val intent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$number"))
            startActivity(intent)
        } else {
            pendingPhoneNumber = number
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.CALL_PHONE),
                CALL_PHONE_REQUEST
            )
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == CALL_PHONE_REQUEST &&
            grantResults.isNotEmpty() &&
            grantResults[0] == PackageManager.PERMISSION_GRANTED
        ) {
            pendingPhoneNumber?.let { makePhoneCall(it) }
            pendingPhoneNumber = null
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        tts?.shutdown()
        webView.destroy()
        super.onDestroy()
    }

    // ============================================================
    // JSBridge — WebView 与原生层通信接口
    // ============================================================

    inner class JSBridge {

        /** 拨打电话 */
        @JavascriptInterface
        fun makePhoneCall(number: String) {
            runOnUiThread { this@MainActivity.makePhoneCall(number) }
        }

        /** 原生 TTS 语音合成 */
        @JavascriptInterface
        fun speak(text: String, rate: Float) {
            tts?.setSpeechRate(rate)
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "sangzi_tts")
        }

        /** 停止 TTS */
        @JavascriptInterface
        fun stopSpeak() {
            tts?.stop()
        }

        /** 检查 TTS 是否可用 */
        @JavascriptInterface
        fun isTTSAvailable(): Boolean {
            return tts != null
        }

        /** 启动原生 ASR 语音识别 */
        @JavascriptInterface
        fun startASR() {
            runOnUiThread {
                if (ContextCompat.checkSelfPermission(
                        this@MainActivity,
                        Manifest.permission.RECORD_AUDIO
                    ) == PackageManager.PERMISSION_GRANTED
                ) {
                    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                        putExtra(
                            RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                            RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
                        )
                        putExtra(RecognizerIntent.EXTRA_LANGUAGE, "zh-CN")
                    }
                    startActivityForResult(intent, RECORD_AUDIO_REQUEST)
                } else {
                    ActivityCompat.requestPermissions(
                        this@MainActivity,
                        arrayOf(Manifest.permission.RECORD_AUDIO),
                        RECORD_AUDIO_REQUEST
                    )
                }
            }
        }

        /** 检查 ASR 是否可用 */
        @JavascriptInterface
        fun isASRAvailable(): Boolean {
            val pm = packageManager
            val activities = pm.queryIntentActivities(
                Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH), 0
            )
            return activities.isNotEmpty()
        }

        /** 本地存储 — 读取 */
        @JavascriptInterface
        fun getItem(key: String): String? {
            val prefs = getSharedPreferences("sangzi_storage", MODE_PRIVATE)
            return prefs.getString(key, null)
        }

        /** 本地存储 — 写入 */
        @JavascriptInterface
        fun setItem(key: String, value: String) {
            val prefs = getSharedPreferences("sangzi_storage", MODE_PRIVATE)
            prefs.edit().putString(key, value).apply()
        }

        /** 本地存储 — 删除 */
        @JavascriptInterface
        fun removeItem(key: String) {
            val prefs = getSharedPreferences("sangzi_storage", MODE_PRIVATE)
            prefs.edit().remove(key).apply()
        }
    }
}
