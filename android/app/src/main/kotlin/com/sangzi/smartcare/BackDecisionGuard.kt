package com.sangzi.smartcare

/**
 * 串行化 WebView 的异步返回判断，并拒绝页面切换后到达的陈旧回调。
 */
internal class BackDecisionGuard {
    data class Ticket internal constructor(
        val id: Long,
        val url: String?,
    )

    enum class Completion {
        CURRENT,
        PAGE_CHANGED,
        STALE,
    }

    private var nextId = 0L
    private var activeTicket: Ticket? = null

    fun begin(currentUrl: String?): Ticket? {
        if (activeTicket != null) return null
        nextId += 1
        return Ticket(nextId, currentUrl).also { activeTicket = it }
    }

    fun complete(ticket: Ticket, currentUrl: String?): Completion {
        if (activeTicket?.id != ticket.id) return Completion.STALE
        activeTicket = null
        return if (ticket.url == currentUrl) {
            Completion.CURRENT
        } else {
            Completion.PAGE_CHANGED
        }
    }

    fun cancelAll() {
        activeTicket = null
    }
}
