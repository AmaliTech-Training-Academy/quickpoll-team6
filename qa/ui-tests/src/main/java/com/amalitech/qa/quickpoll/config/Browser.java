package com.amalitech.qa.quickpoll.config;

/**
 * Supported browsers for UI tests.
 */
public enum Browser {
    CHROME,
    FIREFOX,
    EDGE;

    /**
     * Maps common string values to enum.
     *
     * @param raw browser value such as "chrome", "firefox", or "edge"
     * @return matching {@link Browser}
     */
    public static Browser from(String raw) {
        if (raw == null) {
            return CHROME;
        }
        switch (raw.trim().toLowerCase()) {
            case "firefox":
            case "ff":
                return FIREFOX;
            case "edge":
            case "msedge":
                return EDGE;
            case "chrome":
            default:
                return CHROME;
        }
    }
}

