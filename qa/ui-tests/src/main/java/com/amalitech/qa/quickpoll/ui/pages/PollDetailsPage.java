package com.amalitech.qa.quickpoll.ui.pages;

import com.amalitech.qa.quickpoll.ui.selectors.SmartBy;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

import java.time.Duration;

/**
 * Poll details page, typically where voting occurs.
 */
public final class PollDetailsPage extends BasePage {

    private static final SmartBy PAGE_ANCHOR = SmartBy.of("Poll details page anchor",
            By.cssSelector("[data-testid='page-poll-details']"),
            By.cssSelector("[data-testid='page-vote']"),
            By.xpath("//*[self::h1 or self::h2][string-length(normalize-space(.))>0]")
    );

    private static final SmartBy FIRST_OPTION = SmartBy.of("First vote option",
            By.cssSelector("[data-testid^='vote-option-']"),
            By.cssSelector("input[type='radio'], input[type='checkbox']"),
            By.cssSelector("[role='radio'], [role='checkbox']")
    );

    private static final SmartBy SUBMIT_VOTE = SmartBy.of("Submit vote button",
            By.cssSelector("[data-testid='submit-vote']"),
            By.cssSelector("[data-testid='vote-submit']"),
            By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'vote') or " +
                    "contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'submit')]")
    );

    private static final SmartBy VIEW_RESULTS = SmartBy.of("View results link/button",
            By.cssSelector("[data-testid='view-results']"),
            By.xpath("//a[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'result')]"),
            By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'result')]")
    );

    public PollDetailsPage(WebDriver driver) {
        super(driver);
    }

    public PollDetailsPage waitUntilLoaded() {
        waitForDocumentReady(Duration.ofSeconds(30));
        visible(PAGE_ANCHOR);
        return this;
    }

    public PollDetailsPage selectFirstOption() {
        click(FIRST_OPTION);
        return this;
    }

    public ResultsPage submitVote() {
        click(SUBMIT_VOTE);
        return new ResultsPage(driver).waitUntilLoaded();
    }

    public ResultsPage openResults() {
        click(VIEW_RESULTS);
        return new ResultsPage(driver).waitUntilLoaded();
    }
}

