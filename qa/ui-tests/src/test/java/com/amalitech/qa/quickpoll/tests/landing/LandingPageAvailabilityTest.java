package com.amalitech.qa.quickpoll.tests.landing;

import com.amalitech.qa.quickpoll.config.AppConfig;
import com.amalitech.qa.quickpoll.tests.BaseUiTest;
import com.amalitech.qa.quickpoll.ui.pages.HomePage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * Landing page availability checks.
 */
@Tag("landing")
@Tag("smoke")
public class LandingPageAvailabilityTest extends BaseUiTest {

    @Test
    @DisplayName("Landing page loads and does not show common server error markers")
    void landingLoads() {
        HomePage home = new HomePage(driver).open();
        assertFalse(home.looksLikeServerErrorPage(),
                () -> "Landing page looks like server error. baseUrl=" + AppConfig.baseUrl());
    }
}

