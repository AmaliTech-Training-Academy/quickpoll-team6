package com.amalitech.qa.quickpoll.config;

import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.util.Locale;
import java.util.Objects;
import java.util.Properties;

/**
 * Central configuration for framework execution.
 *
 * <p>Configuration order (highest precedence first):</p>
 * <ul>
 *   <li>JVM system properties (e.g. {@code -DbaseUrl=...})</li>
 *   <li>Environment variables (e.g. {@code BASEURL})</li>
 *   <li>{@code src/test/resources/application.properties}</li>
 * </ul>
 */
public final class AppConfig {

    private static final String DEFAULT_PROPERTIES_FILE = "application.properties";
    private static final Properties FILE_PROPS = loadProps(DEFAULT_PROPERTIES_FILE);

    private AppConfig() {
        // utility
    }

    public static String baseUrl() {
        String url = get("baseUrl", "BASEURL", "http://localhost:8080/");
        if (!url.endsWith("/")) {
            url = url + "/";
        }
        return url;
    }

    public static Browser browser() {
        String raw = get("browser", "BROWSER", "chrome").trim().toLowerCase(Locale.ROOT);
        return Browser.from(raw);
    }

    public static boolean headless() {
        return Boolean.parseBoolean(get("headless", "HEADLESS", "false"));
    }

    public static Duration explicitWait() {
        return Duration.ofSeconds(getLong("explicitWaitSeconds", "EXPLICITWAITSECONDS", 15));
    }

    public static Duration pageLoadTimeout() {
        return Duration.ofSeconds(getLong("pageLoadTimeoutSeconds", "PAGELOADTIMEOUTSECONDS", 60));
    }

    public static Duration scriptTimeout() {
        return Duration.ofSeconds(getLong("scriptTimeoutSeconds", "SCRIPTTIMEOUTSECONDS", 30));
    }

    public static int windowWidth() {
        return (int) getLong("windowWidth", "WINDOWWIDTH", 1366);
    }

    public static int windowHeight() {
        return (int) getLong("windowHeight", "WINDOWHEIGHT", 768);
    }

    public static int fullPageScreenshotScrollTimeoutMs() {
        return (int) getLong("fullPageScreenshotScrollTimeoutMs", "FULLPAGESCREENSHOTSCROLLTIMEOUTMS", 200);
    }

    private static long getLong(String key, String envKey, long defaultValue) {
        String raw = get(key, envKey, null);
        if (raw == null || raw.isBlank()) {
            return defaultValue;
        }
        try {
            return Long.parseLong(raw.trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private static String get(String key, String envKey, String defaultValue) {
        String sys = System.getProperty(key);
        if (sys != null && !sys.isBlank()) {
            return sys;
        }

        String env = System.getenv(envKey);
        if (env != null && !env.isBlank()) {
            return env;
        }

        String fromFile = FILE_PROPS.getProperty(key);
        if (fromFile != null && !fromFile.isBlank()) {
            return fromFile;
        }

        return Objects.requireNonNullElse(defaultValue, "");
    }

    private static Properties loadProps(String classpathFile) {
        Properties p = new Properties();
        try (InputStream is = AppConfig.class.getClassLoader().getResourceAsStream(classpathFile)) {
            if (is != null) {
                p.load(is);
            }
        } catch (IOException ignored) {
            // best-effort; defaults/system/env will be used
        }
        return p;
    }
}

