package com.amalitech.qa.quickpoll.tests;

import com.amalitech.qa.quickpoll.driver.DriverManager;
import com.amalitech.qa.quickpoll.driver.WebDriverFactory;
import com.amalitech.qa.quickpoll.extensions.FailureEvidenceExtension;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;

/**
 * Base UI test class that manages driver lifecycle.
 */
@ExtendWith(FailureEvidenceExtension.class)
public abstract class BaseUiTest {

    protected WebDriver driver;
    protected final Logger log = LoggerFactory.getLogger(getClass());

    @BeforeEach
    void setUp() {
        driver = WebDriverFactory.create();
        DriverManager.set(driver);
        driver.manage().timeouts().pageLoadTimeout(Duration.ofSeconds(60));
    }

    @AfterEach
    void tearDown() {
        try {
            if (driver != null) {
                driver.quit();
            }
        } finally {
            DriverManager.clear();
        }
    }

    protected void quickHealthCheck() {
        new WebDriverWait(driver, Duration.ofSeconds(10))
                .until(d -> {
                    try {
                        return ((org.openqa.selenium.JavascriptExecutor) d)
                                .executeScript("return document.readyState") != null;
                    } catch (RuntimeException e) {
                        return true;
                    }
                });
    }
}

