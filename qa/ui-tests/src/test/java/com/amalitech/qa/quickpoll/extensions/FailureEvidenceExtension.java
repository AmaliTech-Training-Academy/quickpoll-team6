package com.amalitech.qa.quickpoll.extensions;

import com.amalitech.qa.quickpoll.driver.DriverManager;
import com.amalitech.qa.quickpoll.utils.AllureAttachments;
import com.amalitech.qa.quickpoll.utils.ScreenshotUtil;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.TestWatcher;
import org.openqa.selenium.WebDriver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Optional;

/**
 * JUnit 5 extension that captures failure evidence for Allure:
 * <ul>
 *   <li>Full-page screenshot</li>
 *   <li>Page source</li>
 * </ul>
 */
public final class FailureEvidenceExtension implements TestWatcher {

    private static final Logger log = LoggerFactory.getLogger(FailureEvidenceExtension.class);

    @Override
    public void testFailed(ExtensionContext context, Throwable cause) {
        Optional<WebDriver> maybeDriver = safeDriver();
        if (maybeDriver.isEmpty()) {
            return;
        }

        WebDriver driver = maybeDriver.get();
        try {
            byte[] png = ScreenshotUtil.fullPagePng(driver);
            if (png.length > 0) {
                AllureAttachments.png(png);
            } else {
                log.warn("Failed to capture full-page screenshot (empty).");
            }
        } catch (RuntimeException e) {
            log.warn("Failed to attach screenshot to Allure.", e);
        }

        try {
            AllureAttachments.pageSource(driver.getPageSource());
        } catch (RuntimeException e) {
            log.warn("Failed to attach page source to Allure.", e);
        }
    }

    private Optional<WebDriver> safeDriver() {
        try {
            return Optional.of(DriverManager.get());
        } catch (RuntimeException e) {
            return Optional.empty();
        }
    }
}

