package com.sangzi.smartcare

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class BackDecisionGuardTest {
    @Test
    fun allowsOnlyOnePendingDecision() {
        val guard = BackDecisionGuard()

        assertNotNull(guard.begin("https://example.com/one"))
        assertNull(guard.begin("https://example.com/two"))
    }

    @Test
    fun distinguishesTheCurrentPageFromANavigationRace() {
        val guard = BackDecisionGuard()
        val current = requireNotNull(guard.begin("https://example.com/one"))

        assertEquals(
            BackDecisionGuard.Completion.CURRENT,
            guard.complete(current, "https://example.com/one"),
        )

        val changed = requireNotNull(guard.begin("https://example.com/one"))
        assertEquals(
            BackDecisionGuard.Completion.PAGE_CHANGED,
            guard.complete(changed, "https://example.com/two"),
        )
    }

    @Test
    fun staleCallbackCannotConsumeANewerDecision() {
        val guard = BackDecisionGuard()
        val first = requireNotNull(guard.begin("https://example.com/one"))
        assertEquals(
            BackDecisionGuard.Completion.CURRENT,
            guard.complete(first, "https://example.com/one"),
        )
        val second = requireNotNull(guard.begin("https://example.com/two"))

        assertEquals(
            BackDecisionGuard.Completion.STALE,
            guard.complete(first, "https://example.com/two"),
        )
        assertEquals(
            BackDecisionGuard.Completion.CURRENT,
            guard.complete(second, "https://example.com/two"),
        )
    }

    @Test
    fun cancelInvalidatesTheOutstandingDecision() {
        val guard = BackDecisionGuard()
        val ticket = requireNotNull(guard.begin(null))

        guard.cancelAll()

        assertEquals(
            BackDecisionGuard.Completion.STALE,
            guard.complete(ticket, null),
        )
        assertNotNull(guard.begin(null))
    }
}
