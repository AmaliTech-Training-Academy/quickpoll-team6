package com.amalitech.qa.quickpoll.ui.pages;

import com.amalitech.qa.quickpoll.ui.selectors.SmartBy;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

import java.time.Duration;

/**
 * Poll results page.
 */
public final class ResultsPage extends BasePage {

    private static final SmartBy PAGE_ANCHOR = SmartBy.of("Results page anchor",
            By.cssSelector("[data-testid='page-results']"),
            By.xpath("//*[self::h1 or self::h2][contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'result')]")
    );

    private static final By BODY = By.tagName("body");

    public ResultsPage(WebDriver driver) {
        super(driver);
    }

    public ResultsPage waitUntilLoaded() {
        waitForDocumentReady(Duration.ofSeconds(30));
        visible(PAGE_ANCHOR);
        return this;
    }

    public String bodyText() {
        return visible(BODY).getText();
    }
}

