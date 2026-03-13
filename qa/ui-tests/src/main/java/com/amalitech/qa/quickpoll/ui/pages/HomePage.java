package com.amalitech.qa.quickpoll.ui.pages;

import com.amalitech.qa.quickpoll.config.AppConfig;
import com.amalitech.qa.quickpoll.ui.selectors.SmartBy;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

import java.time.Duration;
import java.util.List;

/**
 * Landing/home page.
 */
public final class HomePage extends BasePage {

    private static final By BODY = By.tagName("body");
    private static final By INTERACTIVE = By.cssSelector(
            "a[href], button, input, select, textarea, [role='button'], [role='link']"
    );

    // Heuristic navigation CTAs (prefer testids if present)
    private static final SmartBy CREATE_POLL_CTA = SmartBy.of("Create poll CTA",
            By.cssSelector("[data-testid='create-poll']"),
            By.cssSelector("[data-testid='createPoll']"),
            By.cssSelector("[aria-label='Create poll']"),
            By.xpath("//a[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'create') and " +
                    "contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'poll')]"),
            By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'create') and " +
                    "contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'poll')]")
    );

    public HomePage(WebDriver driver) {
        super(driver);
    }

    public HomePage open() {
        driver.get(AppConfig.baseUrl());
        waitForDocumentReady(Duration.ofSeconds(30));
        visible(BODY);
        return this;
    }

    public String title() {
        return driver.getTitle();
    }

    public String bodyText() {
        return visible(BODY).getText();
    }

    public int interactiveElementCount() {
        List<?> els = driver.findElements(INTERACTIVE);
        return els.size();
    }

    public boolean looksLikeServerErrorPage() {
        String combined = (title() + "\n" + bodyText()).toLowerCase();
        return combined.contains("whitelabel error page")
                || combined.contains("internal server error")
                || combined.contains("bad gateway")
                || combined.contains("service unavailable")
                || combined.contains("nginx")
                || combined.contains("error 5")
                || combined.contains("exception");
    }

    /**
     * Navigates to poll creation if the UI exposes such an action.
     *
     * @return {@link CreatePollPage}
     */
    public CreatePollPage goToCreatePoll() {
        click(CREATE_POLL_CTA);
        return new CreatePollPage(driver).waitUntilLoaded();
    }
}

