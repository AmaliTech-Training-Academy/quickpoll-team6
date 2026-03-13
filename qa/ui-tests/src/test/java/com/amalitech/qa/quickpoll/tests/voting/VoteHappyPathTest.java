package com.amalitech.qa.quickpoll.tests.voting;

import com.amalitech.qa.quickpoll.tests.BaseUiTest;
import com.amalitech.qa.quickpoll.ui.pages.CreatePollPage;
import com.amalitech.qa.quickpoll.ui.pages.HomePage;
import com.amalitech.qa.quickpoll.ui.pages.PollDetailsPage;
import com.amalitech.qa.quickpoll.ui.pages.ResultsPage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * End-to-end voting happy path.
 */
@Tag("voting")
@Tag("e2e")
public class VoteHappyPathTest extends BaseUiTest {

    @Test
    @DisplayName("Create poll -> vote -> results page loads")
    void createThenVoteShowsResults() {
        String suffix = String.valueOf(Instant.now().toEpochMilli());
        String question = "E2E Vote Poll " + suffix;

        CreatePollPage create = new HomePage(driver).open().goToCreatePoll();
        PollDetailsPage poll = create
                .enterQuestion(question)
                .enterFirstOption("Yes")
                .addOption("No")
                .submit();

        ResultsPage results = poll.selectFirstOption().submitVote();
        assertNotNull(results);
    }
}

