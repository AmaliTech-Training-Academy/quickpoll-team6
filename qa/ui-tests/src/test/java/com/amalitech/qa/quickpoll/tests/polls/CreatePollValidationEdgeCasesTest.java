package com.amalitech.qa.quickpoll.tests.polls;

import com.amalitech.qa.quickpoll.tests.BaseUiTest;
import com.amalitech.qa.quickpoll.ui.pages.HomePage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Edge-case tests around poll creation validation.
 *
 * <p>These assertions are intentionally UI-agnostic: they check for the presence of typical
 * validation signals in body text when a submit is attempted with missing inputs.</p>
 */
@Tag("polls")
@Tag("edge")
public class CreatePollValidationEdgeCasesTest extends BaseUiTest {

    @Test
    @DisplayName("Submitting create poll with empty fields shows validation feedback")
    void submittingEmptyPollShowsValidation() {
        new HomePage(driver).open().goToCreatePoll();

        // attempt to submit without entering required data
        driver.findElements(org.openqa.selenium.By.cssSelector("button[type='submit']")).stream().findFirst()
                .ifPresent(org.openqa.selenium.WebElement::click);

        String body = driver.findElement(org.openqa.selenium.By.tagName("body")).getText().toLowerCase();
        assertTrue(
                body.contains("required") || body.contains("please") || body.contains("invalid") || body.contains("error"),
                () -> "Expected validation feedback after empty submit."
        );
    }
}

