package com.amalitech.qa.quickpoll.driver;

import org.openqa.selenium.WebDriver;

/**
 * Thread-safe storage for {@link WebDriver}.
 *
 * <p>This supports future parallel execution without changing page object code.</p>
 */
public final class DriverManager {

    private static final ThreadLocal<WebDriver> DRIVER = new ThreadLocal<>();

    private DriverManager() {
        // utility
    }

    /**
     * @return current thread driver
     * @throws IllegalStateException if not initialized
     */
    public static WebDriver get() {
        WebDriver d = DRIVER.get();
        if (d == null) {
            throw new IllegalStateException("WebDriver not initialized for current thread.");
        }
        return d;
    }

    /**
     * Sets driver for current thread.
     *
     * @param driver driver
     */
    public static void set(WebDriver driver) {
        DRIVER.set(driver);
    }

    /**
     * Clears current thread driver reference.
     */
    public static void clear() {
        DRIVER.remove();
    }
}
