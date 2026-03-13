package com.amalitech.qa.quickpoll.utils;

import io.qameta.allure.Attachment;

/**
 * Allure attachment helpers.
 */
public final class AllureAttachments {

    private AllureAttachments() {
        // utility
    }

    @Attachment(value = "Full page screenshot", type = "image/png")
    public static byte[] png(byte[] bytes) {
        return bytes;
    }

    @Attachment(value = "Page source", type = "text/html")
    public static String pageSource(String html) {
        return html;
    }
}
