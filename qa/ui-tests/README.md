## QuickPoll UI Tests (Selenium + JUnit 5 + Allure)

### Requirements
- Java 11+
- Maven 3.9+
- Chrome/Firefox/Edge installed

### Configure
Defaults live in `src/test/resources/application.properties`.

Common overrides:
- `-DbaseUrl=http://...`
- `-Dbrowser=chrome|firefox|edge`
- `-Dheadless=true|false`

### Run tests

```bash
mvn -f qa/ui-tests/pom.xml test
```

Run with a different browser profile:

```bash
mvn -f qa/ui-tests/pom.xml test -Pfirefox
```

### Project layout
- `src/main/java/.../ui/pages`: Page Objects (POM)
- `src/test/java/.../tests/landing`: landing/smoke tests
- `src/test/java/.../tests/polls`: poll creation + validation tests
- `src/test/java/.../tests/voting`: vote + results tests

### Selector stability (recommended)
To keep tests stable, prefer adding `data-testid` attributes in the UI. The framework will try:
- `data-testid` first
- then `aria-label`/semantic selectors
- then safe text fallbacks

### Allure report

```bash
mvn -f qa/ui-tests/pom.xml test allure:report
```

Or serve locally (requires Allure installed on your machine):

```bash
allure serve qa/ui-tests/target/allure-results
```

