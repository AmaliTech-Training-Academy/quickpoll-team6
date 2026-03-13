package com.amalitech.qa.quickpoll.ui.pages;

import com.amalitech.qa.quickpoll.config.AppConfig;
import com.amalitech.qa.quickpoll.ui.selectors.SmartBy;
import org.openqa.selenium.*;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

/**
 * Base class for all Page Objects.
 *
 * <p>Encapsulates waits and safe interactions to keep tests DRY and resilient.</p>
 */
public abstract class BasePage {

    protected final WebDriver driver;
    protected final WebDriverWait wait;

    protected BasePage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, AppConfig.explicitWait());
    }

    /**
     * Waits for {@code document.readyState === 'complete'}.
     *
     * @param timeout custom timeout
     */
    protected void waitForDocumentReady(Duration timeout) {
        WebDriverWait w = new WebDriverWait(driver, timeout);
        w.until(d -> "complete".equals(((JavascriptExecutor) d).executeScript("return document.readyState")));
    }

    protected WebElement visible(By by) {
        return wait.until(ExpectedConditions.visibilityOfElementLocated(by));
    }

    protected WebElement visible(SmartBy smartBy) {
        return wait.until(d -> smartBy.findFirst(d).orElseThrow(() ->
                new NoSuchElementException("Could not locate element. " + smartBy.describe())));
    }

    protected void click(By by) {
        wait.until(ExpectedConditions.elementToBeClickable(by)).click();
    }

    protected void click(SmartBy smartBy) {
        WebElement el = wait.until(d -> smartBy.findFirst(d).orElseThrow(() ->
                new NoSuchElementException("Could not locate clickable element. " + smartBy.describe())));
        wait.until(ExpectedConditions.elementToBeClickable(el)).click();
    }

    protected void type(By by, String value) {
        WebElement el = visible(by);
        el.clear();
        el.sendKeys(value);
    }

    protected void type(SmartBy smartBy, String value) {
        WebElement el = visible(smartBy);
        el.clear();
        el.sendKeys(value);
    }

    protected boolean isVisible(By by) {
        try {
            return visible(by).isDisplayed();
        } catch (TimeoutException e) {
            return false;
        }
    }
}

