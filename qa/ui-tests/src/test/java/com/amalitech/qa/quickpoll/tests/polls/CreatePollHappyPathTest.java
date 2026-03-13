package com.amalitech.qa.quickpoll.tests.polls;

import com.amalitech.qa.quickpoll.tests.BaseUiTest;
import com.amalitech.qa.quickpoll.ui.pages.CreatePollPage;
import com.amalitech.qa.quickpoll.ui.pages.HomePage;
import com.amalitech.qa.quickpoll.ui.pages.PollDetailsPage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * End-to-end poll creation happy path.
 */
@Tag("polls")
@Tag("e2e")
public class CreatePollHappyPathTest extends BaseUiTest {

    @Test
    @DisplayName("Create poll with 3 options succeeds")
    void createPollWithThreeOptions() {
        String suffix = String.valueOf(Instant.now().toEpochMilli());
        String question = "E2E Poll Question " + suffix;

        CreatePollPage create = new HomePage(driver).open().goToCreatePoll();
        PollDetailsPage details = create
                .enterQuestion(question)
                .enterFirstOption("Option A")
                .addOption("Option B")
                .addOption("Option C")
                .submit();

        assertNotNull(details);
    }
}

