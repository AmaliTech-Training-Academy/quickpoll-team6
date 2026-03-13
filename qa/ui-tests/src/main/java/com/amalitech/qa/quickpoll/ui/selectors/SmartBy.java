package com.amalitech.qa.quickpoll.ui.selectors;

import org.openqa.selenium.By;
import org.openqa.selenium.SearchContext;
import org.openqa.selenium.WebElement;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Composite selector that tries multiple strategies in order.
 *
 * <p>This enables tests to prefer stable hooks (data-testid/aria-label) while retaining safe
 * text-based fallbacks for evolving UIs.</p>
 */
public final class SmartBy {

    private final String name;
    private final List<By> candidates;

    private SmartBy(String name, List<By> candidates) {
        this.name = name;
        this.candidates = List.copyOf(candidates);
    }

    public static SmartBy of(String name, By... bys) {
        return new SmartBy(name, Arrays.asList(bys));
    }

    public Optional<WebElement> findFirst(SearchContext ctx) {
        for (By by : candidates) {
            List<WebElement> els = ctx.findElements(by);
            if (!els.isEmpty()) {
                return Optional.of(els.get(0));
            }
        }
        return Optional.empty();
    }

    public String describe() {
        List<String> parts = new ArrayList<>();
        for (By by : candidates) {
            parts.add(by.toString());
        }
        return "SmartBy{name='" + name + "', candidates=" + parts + "}";
    }
}

