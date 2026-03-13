package com.amalitech.qa.quickpoll.ui.pages;

import com.amalitech.qa.quickpoll.ui.selectors.SmartBy;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

import java.time.Duration;

/**
 * Poll creation page/form.
 *
 * <p>This page object is selector-resilient. If your app has stable hooks like {@code data-testid},
 * these will be used automatically.</p>
 */
public final class CreatePollPage extends BasePage {

    private static final SmartBy PAGE_ANCHOR = SmartBy.of("Create poll page anchor",
            By.cssSelector("[data-testid='page-create-poll']"),
            By.cssSelector("form[data-testid='create-poll-form']"),
            By.xpath("//*[self::h1 or self::h2][contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'create') and " +
                    "contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'poll')]")
    );

    private static final SmartBy QUESTION_INPUT = SmartBy.of("Question input",
            By.cssSelector("[data-testid='poll-question']"),
            By.cssSelector("input[name='question']"),
            By.cssSelector("textarea[name='question']"),
            By.cssSelector("input[placeholder*='Question'], textarea[placeholder*='Question']")
    );

    private static final SmartBy FIRST_OPTION_INPUT = SmartBy.of("First option input",
            By.cssSelector("[data-testid='poll-option-0']"),
            By.cssSelector("input[name^='option'], textarea[name^='option']"),
            By.cssSelector("input[placeholder*='Option'], textarea[placeholder*='Option']")
    );

    private static final SmartBy ADD_OPTION_BUTTON = SmartBy.of("Add option button",
            By.cssSelector("[data-testid='add-option']"),
            By.cssSelector("[aria-label='Add option']"),
            By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'add') and " +
                    "contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'option')]")
    );

    private static final SmartBy SUBMIT_BUTTON = SmartBy.of("Create/Submit poll button",
            By.cssSelector("[data-testid='create-poll-submit']"),
            By.cssSelector("button[type='submit']"),
            By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'create') or " +
                    "contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'submit')]")
    );

    public CreatePollPage(WebDriver driver) {
        super(driver);
    }

    public CreatePollPage waitUntilLoaded() {
        waitForDocumentReady(Duration.ofSeconds(30));
        visible(PAGE_ANCHOR);
        return this;
    }

    public CreatePollPage enterQuestion(String question) {
        type(QUESTION_INPUT, question);
        return this;
    }

    public CreatePollPage enterFirstOption(String option) {
        type(FIRST_OPTION_INPUT, option);
        return this;
    }

    public CreatePollPage addOption(String optionText) {
        click(ADD_OPTION_BUTTON);
        // After adding, many UIs append a new option input; we type into the last matching option.
        driver.findElements(By.cssSelector("input[placeholder*='Option'], textarea[placeholder*='Option'], input[name^='option'], textarea[name^='option']"))
                .stream()
                .reduce((a, b) -> b)
                .ifPresent(el -> {
                    el.clear();
                    el.sendKeys(optionText);
                });
        return this;
    }

    public PollDetailsPage submit() {
        click(SUBMIT_BUTTON);
        return new PollDetailsPage(driver).waitUntilLoaded();
    }
}

