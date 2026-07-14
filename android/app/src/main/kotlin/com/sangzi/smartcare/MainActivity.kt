package com.sangzi.smartcare

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

/**
 * 智护银龄线上壳：仅加载配置的可信源，语音统一走网页端 MiMo 链路。
 */
class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var errorPanel: View
    private lateinit var errorMessage: TextView
    private lateinit var urlPolicy: UrlPolicy
    private lateinit var microphonePermissionPolicy: MicrophonePermissionPolicy

    private var pendingMicrophoneRequest: PermissionRequest? = null
    private var microphonePermissionLaunchInFlight = false
    private var mainFrameLoadFailed = false
    private var activityStarted = false
    private val mainHandler = Handler(Looper.getMainLooper())
    private val backDecisionGuard = BackDecisionGuard()
    private var backDecisionTimeout: Runnable? = null

    private val microphonePermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            completePendingMicrophoneRequest(granted)
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val baseUrl = getString(R.string.app_base_url).trimEnd('/')
        urlPolicy = UrlPolicy(baseUrl)
        microphonePermissionPolicy = MicrophonePermissionPolicy(baseUrl)

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.mediaPlaybackRequiresUserGesture = false
        }
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false)

        if ((applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true)
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.START_SAFE_BROWSING)) {
            WebViewCompat.startSafeBrowsing(applicationContext) { }
        }

        configureWebViewClients()
        configureBackNavigation()
        errorPanel = createErrorPanel()
        setContentView(
            FrameLayout(this).apply {
                addView(
                    webView,
                    FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT,
                    ),
                )
                addView(
                    errorPanel,
                    FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT,
                    ),
                )
            },
        )

        webView.loadUrl("$baseUrl/")
    }

    private fun configureWebViewClients() {
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread { handleWebPermissionRequest(request) }
            }

            override fun onPermissionRequestCanceled(request: PermissionRequest) {
                runOnUiThread {
                    if (pendingMicrophoneRequest === request) {
                        denyPendingMicrophoneRequest()
                    }
                }
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?,
            ): Boolean {
                val safeRequest = request ?: return true
                val rawUrl = safeRequest.url?.toString() ?: return true
                if (safeRequest.isForMainFrame) denyPendingMicrophoneRequest()
                return handleWebNavigation(rawUrl, safeRequest.isForMainFrame, urlPolicy)
            }

            @Deprecated("Legacy WebView callback")
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                url: String?,
            ): Boolean {
                val rawUrl = url ?: return true
                denyPendingMicrophoneRequest()
                return handleWebNavigation(rawUrl, true, urlPolicy)
            }

            override fun onPageStarted(view: WebView?, url: String, favicon: Bitmap?) {
                cancelBackDecision()
                denyPendingMicrophoneRequest()
                mainFrameLoadFailed = false
                hideMainFrameError()

                if (!urlPolicy.isSameOrigin(url)) {
                    view?.stopLoading()
                    handleWebNavigation(url, true, urlPolicy)
                    return
                }
                super.onPageStarted(view, url, favicon)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                if (!mainFrameLoadFailed && url != null && urlPolicy.isSameOrigin(url)) {
                    hideMainFrameError()
                }
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest,
                error: WebResourceError,
            ) {
                super.onReceivedError(view, request, error)
                if (request.isForMainFrame) {
                    showMainFrameError("网络连接暂时不可用，请检查网络后重试。")
                }
            }

            override fun onReceivedHttpError(
                view: WebView?,
                request: WebResourceRequest,
                errorResponse: WebResourceResponse,
            ) {
                super.onReceivedHttpError(view, request, errorResponse)
                if (request.isForMainFrame) {
                    showMainFrameError("页面暂时不可用，请稍后重试。")
                }
            }
        }
    }

    private fun configureBackNavigation() {
        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (webView.canGoBack()) {
                        denyPendingMicrophoneRequest()
                        webView.goBack()
                        return
                    }

                    val callback = this
                    val ticket = backDecisionGuard.begin(webView.url) ?: return
                    val timeout = Runnable {
                        backDecisionTimeout = null
                        when (backDecisionGuard.complete(ticket, webView.url)) {
                            BackDecisionGuard.Completion.CURRENT -> {
                                if (activityStarted && !isFinishing && !isDestroyed) {
                                    performBackDecision(false, callback)
                                }
                            }
                            BackDecisionGuard.Completion.PAGE_CHANGED,
                            BackDecisionGuard.Completion.STALE,
                            -> Unit
                        }
                    }
                    backDecisionTimeout = timeout
                    mainHandler.postDelayed(timeout, BACK_DECISION_TIMEOUT_MS)
                    webView.evaluateJavascript(
                        "Boolean(window.navigation && window.navigation.canGoBack)",
                    ) { canGoBackInChromium ->
                        if (backDecisionTimeout === timeout) {
                            mainHandler.removeCallbacks(timeout)
                            backDecisionTimeout = null
                        }
                        if (
                            backDecisionGuard.complete(ticket, webView.url) !=
                            BackDecisionGuard.Completion.CURRENT
                        ) return@evaluateJavascript
                        if (!activityStarted || isFinishing || isDestroyed) {
                            return@evaluateJavascript
                        }
                        performBackDecision(canGoBackInChromium == "true", callback)
                    }
                }
            },
        )
    }

    private fun performBackDecision(
        canGoBackInChromium: Boolean,
        callback: OnBackPressedCallback,
    ) {
        if (webView.canGoBack()) {
            denyPendingMicrophoneRequest()
            webView.goBack()
        } else if (canGoBackInChromium) {
            denyPendingMicrophoneRequest()
            webView.evaluateJavascript("history.back()", null)
        } else {
            callback.isEnabled = false
            try {
                onBackPressedDispatcher.onBackPressed()
            } finally {
                callback.isEnabled = true
            }
        }
    }

    private fun cancelBackDecision() {
        backDecisionTimeout?.let(mainHandler::removeCallbacks)
        backDecisionTimeout = null
        backDecisionGuard.cancelAll()
    }

    private fun handleWebPermissionRequest(request: PermissionRequest) {
        if (!activityStarted) {
            request.deny()
            return
        }
        if (pendingMicrophoneRequest !== request) {
            denyPendingMicrophoneRequest()
        }

        if (!canGrantMicrophoneRequest(request)) {
            request.deny()
            return
        }
        pendingMicrophoneRequest = request

        if (
            ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED
        ) {
            completePendingMicrophoneRequest(true)
            return
        }

        if (!microphonePermissionLaunchInFlight) {
            microphonePermissionLaunchInFlight = true
            microphonePermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    private fun completePendingMicrophoneRequest(androidPermissionGranted: Boolean) {
        microphonePermissionLaunchInFlight = false
        val request = pendingMicrophoneRequest ?: return
        pendingMicrophoneRequest = null

        if (androidPermissionGranted && activityStarted && canGrantMicrophoneRequest(request)) {
            request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
        } else {
            request.deny()
        }
    }

    private fun canGrantMicrophoneRequest(request: PermissionRequest): Boolean =
        microphonePermissionPolicy.canGrant(
            requestOrigin = request.origin?.toString(),
            requestedResources = request.resources?.toList().orEmpty(),
            topLevelUrl = webView.url,
        )

    private fun denyPendingMicrophoneRequest() {
        val request = pendingMicrophoneRequest ?: return
        pendingMicrophoneRequest = null
        request.deny()
    }

    private fun handleWebNavigation(
        rawUrl: String,
        isForMainFrame: Boolean,
        urlPolicy: UrlPolicy,
    ): Boolean {
        val action = urlPolicy.classify(rawUrl)
        if (action == UrlPolicy.Action.ALLOW_IN_WEBVIEW) return false
        if (!isForMainFrame) return true

        when (action) {
            UrlPolicy.Action.DIAL -> launchSystemIntent(Intent.ACTION_DIAL, rawUrl)
            UrlPolicy.Action.OPEN_EXTERNAL -> launchSystemIntent(Intent.ACTION_VIEW, rawUrl)
            UrlPolicy.Action.BLOCK -> Unit
            UrlPolicy.Action.ALLOW_IN_WEBVIEW -> Unit
        }
        return true
    }

    private fun launchSystemIntent(action: String, rawUrl: String) {
        try {
            startActivity(Intent(action, Uri.parse(rawUrl).normalizeScheme()))
        } catch (_: ActivityNotFoundException) {
            // 设备没有可处理该链接的应用时保持在当前页面。
        } catch (_: SecurityException) {
            // 系统策略拒绝外部 Intent 时保持在当前页面。
        }
    }

    private fun createErrorPanel(): View {
        errorMessage = TextView(this).apply {
            text = "网络连接暂时不可用"
            gravity = Gravity.CENTER
            setTextColor(Color.rgb(38, 48, 58))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
        }
        val retryButton = Button(this).apply {
            text = "重新加载"
            minHeight = dp(56)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
            setOnClickListener {
                mainFrameLoadFailed = false
                hideMainFrameError()
                webView.reload()
            }
        }
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(32), dp(32), dp(32), dp(32))
            setBackgroundColor(Color.WHITE)
            visibility = View.GONE
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES
            addView(
                errorMessage,
                LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                ),
            )
            addView(
                retryButton,
                LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                ).apply { topMargin = dp(24) },
            )
        }
    }

    private fun showMainFrameError(message: String) {
        mainFrameLoadFailed = true
        errorMessage.text = message
        errorPanel.visibility = View.VISIBLE
        errorPanel.announceForAccessibility(message)
    }

    private fun hideMainFrameError() {
        if (::errorPanel.isInitialized) errorPanel.visibility = View.GONE
    }

    private fun dp(value: Int): Int =
        TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value.toFloat(),
            resources.displayMetrics,
        ).toInt()

    override fun onStart() {
        super.onStart()
        activityStarted = true
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        webView.resumeTimers()
    }

    override fun onPause() {
        webView.onPause()
        webView.pauseTimers()
        super.onPause()
    }

    override fun onStop() {
        activityStarted = false
        cancelBackDecision()
        denyPendingMicrophoneRequest()
        super.onStop()
    }

    override fun onDestroy() {
        activityStarted = false
        cancelBackDecision()
        denyPendingMicrophoneRequest()
        webView.stopLoading()
        webView.removeAllViews()
        webView.destroy()
        super.onDestroy()
    }

    private companion object {
        const val BACK_DECISION_TIMEOUT_MS = 750L
    }
}
