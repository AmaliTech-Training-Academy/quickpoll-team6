package com.amalitech.qa.quickpoll.driver;

import com.amalitech.qa.quickpoll.config.AppConfig;
import com.amalitech.qa.quickpoll.config.Browser;
import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.edge.EdgeDriver;
import org.openqa.selenium.edge.EdgeOptions;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.firefox.FirefoxOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;

/**
 * Factory for building a configured {@link WebDriver} instance.
 */
public final class WebDriverFactory {

    private static final Logger log = LoggerFactory.getLogger(WebDriverFactory.class);

    private WebDriverFactory() {
        // utility
    }

    /**
     * Creates a new {@link WebDriver} based on configuration.
     *
     * @return configured driver
     */
    public static WebDriver create() {
        Browser browser = AppConfig.browser();
        boolean headless = AppConfig.headless();

        log.info("Creating WebDriver. browser={}, headless={}", browser, headless);

        WebDriver driver;
        switch (browser) {
            case FIREFOX:
                WebDriverManager.firefoxdriver().setup();
                FirefoxOptions ff = new FirefoxOptions();
                if (headless) {
                    ff.addArguments("-headless");
                }
                driver = new FirefoxDriver(ff);
                break;
            case EDGE:
                WebDriverManager.edgedriver().setup();
                EdgeOptions edge = new EdgeOptions();
                if (headless) {
                    edge.addArguments("--headless=new");
                }
                driver = new EdgeDriver(edge);
                break;
            case CHROME:
            default:
                WebDriverManager.chromedriver().setup();
                ChromeOptions chrome = new ChromeOptions();
                chrome.addArguments("--remote-allow-origins=*");
                if (headless) {
                    chrome.addArguments("--headless=new");
                }
                driver = new ChromeDriver(chrome);
        }

        driver.manage().timeouts().pageLoadTimeout(AppConfig.pageLoadTimeout());
        driver.manage().timeouts().scriptTimeout(AppConfig.scriptTimeout());
        driver.manage().timeouts().implicitlyWait(Duration.ZERO);
        driver.manage().window().setSize(new org.openqa.selenium.Dimension(AppConfig.windowWidth(), AppConfig.windowHeight()));

        return driver;
    }
}
