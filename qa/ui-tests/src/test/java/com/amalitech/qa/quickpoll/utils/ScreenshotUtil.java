package com.amalitech.qa.quickpoll.utils;

import com.amalitech.qa.quickpoll.config.AppConfig;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebDriverException;
import ru.yandex.qatools.ashot.AShot;
import ru.yandex.qatools.ashot.Screenshot;
import ru.yandex.qatools.ashot.shooting.ShootingStrategies;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Screenshot utility.
 */
public final class ScreenshotUtil {

    private ScreenshotUtil() {
        // utility
    }

    /**
     * Attempts to capture a full-page screenshot (scroll + stitch) as PNG bytes.
     *
     * @param driver WebDriver
     * @return png bytes or empty array if capture fails
     */
    public static byte[] fullPagePng(WebDriver driver) {
        try {
            Screenshot shot = new AShot()
                    .shootingStrategy(ShootingStrategies.viewportPasting(AppConfig.fullPageScreenshotScrollTimeoutMs()))
                    .takeScreenshot(driver);
            return toPngBytes(shot.getImage());
        } catch (RuntimeException e) {
            // AShot throws unchecked exceptions for some driver/browser combos; keep tests stable.
            return new byte[0];
        }
    }

    private static byte[] toPngBytes(BufferedImage image) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", baos);
            return baos.toByteArray();
        } catch (IOException | WebDriverException e) {
            return new byte[0];
        }
    }
}
