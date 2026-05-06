# RuneLite Companion Local Installability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Cerebro RuneLite companion locally installable and testable on Windows so we can prove the full website-to-plugin sync loop end to end.

**Architecture:** Keep the existing companion backend and plugin logic intact, but add the missing last-mile tooling around it: a self-contained Gradle wrapper, a Windows-first launcher, better plugin-side local-test feedback, and a repository-local test guide. The implementation should stay honest to RuneLite's local development model while making it feel almost turnkey for a Windows tester.

**Tech Stack:** Java 11/RuneLite plugin, Gradle wrapper, Windows PowerShell/batch launch scripts, FastAPI backend, React frontend, pytest, JUnit

---

## File Structure

- `companion/runelite-plugin/build.gradle`
  - Add a reproducible local run task and any wrapper-friendly plugin configuration needed for Windows-first local testing.
- `companion/runelite-plugin/settings.gradle`
  - Keep project naming stable for wrapper and launcher flows.
- `companion/runelite-plugin/gradlew`
  - Unix Gradle wrapper entrypoint generated for completeness.
- `companion/runelite-plugin/gradlew.bat`
  - Windows Gradle wrapper entrypoint used by the launcher.
- `companion/runelite-plugin/gradle/wrapper/gradle-wrapper.properties`
  - Pins wrapper distribution version so the plugin becomes self-contained.
- `companion/runelite-plugin/gradle/wrapper/gradle-wrapper.jar`
  - Wrapper bootstrap binary required for local Gradle execution.
- `companion/runelite-plugin/scripts/run-cerebro-companion.ps1`
  - Windows-first launcher that starts the RuneLite dev client with the companion plugin available.
- `companion/runelite-plugin/scripts/run-cerebro-companion.bat`
  - Double-clickable Windows entrypoint that delegates to the PowerShell launcher.
- `companion/runelite-plugin/src/main/java/com/cerebro/companion/CerebroCompanionConfig.java`
  - Add local-test-friendly config surface for visible status and manual actions.
- `companion/runelite-plugin/src/main/java/com/cerebro/companion/CerebroCompanionPlugin.java`
  - Add clearer local-test status handling around link exchange and sync attempts.
- `companion/runelite-plugin/src/main/java/com/cerebro/companion/api/CerebroSyncClient.java`
  - Surface richer local-test error details instead of opaque failures.
- `companion/runelite-plugin/src/test/java/com/cerebro/companion/CerebroCompanionPluginTest.java`
  - Extend plugin tests for local-test feedback and safer sync/link transitions.
- `companion/runelite-plugin/src/test/java/com/cerebro/companion/api/CerebroSyncClientTest.java`
  - Extend API client tests for improved diagnostics and request behavior.
- `frontend/src/components/dashboard/CompanionStatusPanel.tsx`
  - Make the web-side link/session instructions more aligned with the new local testing path.
- `docs/runelite-companion-local-test.md`
  - Repository-local operator guide for Windows setup, local launch, linking, sync verification, and troubleshooting.

### Task 1: Add self-contained Gradle wrapper and local run task

**Files:**
- Modify: `C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin\build.gradle`
- Modify: `C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin\settings.gradle`
- Create: `C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin\gradlew`
- Create: `C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin\gradlew.bat`
- Create: `C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin\gradle\wrapper\gradle-wrapper.properties`
- Create: `C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin\gradle\wrapper\gradle-wrapper.jar`
- Test: `C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin\src\test\java\com\cerebro\companion\CerebroCompanionPluginTest.java`

- [ ] **Step 1: Add a failing plugin launch test note for the missing local run path**

Document the expected local launch command in a test-facing comment block near the existing plugin test setup so the missing capability is explicit before implementation:

```java
// Local-installability contract:
// 1. Windows users can run `gradlew.bat runLocalClient`
// 2. The task launches a RuneLite development client with this plugin on the classpath
// 3. The same wrapper can run `gradlew.bat test` without a separate Gradle install
```

- [ ] **Step 2: Run wrapper command to verify it fails before wrapper creation**

Run: `.\gradlew.bat test`

Expected: PowerShell reports that `gradlew.bat` is missing.

- [ ] **Step 3: Update Gradle build for a local client run task**

Update `build.gradle` so it keeps the current dependencies, adds an explicit local run task, and remains wrapper-friendly:

```groovy
plugins {
    id 'java'
}

def runeLiteVersion = '1.12.24'

repositories {
    mavenLocal()
    maven {
        url = 'https://repo.runelite.net'
        content {
            includeGroupByRegex('net\\.runelite.*')
        }
    }
    mavenCentral()
}

group = 'com.cerebro.companion'
version = '0.1.0-SNAPSHOT'
description = 'Cerebro RuneLite companion plugin'

java {
    sourceCompatibility = JavaVersion.VERSION_11
    targetCompatibility = JavaVersion.VERSION_11
}

tasks.withType(JavaCompile).configureEach {
    options.encoding = 'UTF-8'
    options.release = 11
}

configurations {
    localClientRuntime {
        extendsFrom compileOnly
    }
}

dependencies {
    compileOnly group: 'net.runelite', name: 'client', version: runeLiteVersion
    localClientRuntime group: 'net.runelite', name: 'client', version: runeLiteVersion

    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.2'
    testImplementation group: 'net.runelite', name: 'client', version: runeLiteVersion
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}

jar {
    manifest {
        attributes(
            'Implementation-Title': project.name,
            'Implementation-Version': project.version
        )
    }
}

tasks.register('runLocalClient', JavaExec) {
    group = 'application'
    description = 'Launches a RuneLite development client with the Cerebro companion on the plugin path.'
    classpath = files(sourceSets.main.runtimeClasspath, configurations.localClientRuntime)
    mainClass = 'net.runelite.client.RuneLite'
    workingDir = project.projectDir
    systemProperty 'runelite.pluginhub.version', 'local-cerebro'
}

test {
    useJUnitPlatform()
}
```

- [ ] **Step 4: Generate and add the Gradle wrapper**

Run the local Gradle binary already proven in this project to generate the wrapper inside the plugin directory:

```powershell
$env:TEMP='C:\Users\great\Documents\Playground\g-tmp'
$env:TMP='C:\Users\great\Documents\Playground\g-tmp'
$env:GRADLE_USER_HOME='C:\Users\great\Documents\Playground\g-home'
$env:GRADLE_OPTS='-Djava.io.tmpdir=C:\Users\great\Documents\Playground\g-tmp'
C:\Users\great\Documents\Playground\cerebro-osrs\.worktrees\cerebro-plugin\.tooling\gradle-9.1.0\bin\gradle.bat wrapper
```

Expected new files:

```text
gradlew
gradlew.bat
gradle/wrapper/gradle-wrapper.properties
gradle/wrapper/gradle-wrapper.jar
```

- [ ] **Step 5: Run the wrapper test command to verify self-contained plugin builds**

Run: `.\gradlew.bat test`

Expected: Plugin JUnit suite passes without requiring a separately installed Gradle executable.

- [ ] **Step 6: Commit**

```bash
git add companion/runelite-plugin/build.gradle companion/runelite-plugin/settings.gradle companion/runelite-plugin/gradlew companion/runelite-plugin/gradlew.bat companion/runelite-plugin/gradle/wrapper
git commit -m "Make the companion plugin self-contained for local runs"
```

### Task 2: Add a Windows-first launcher for the local RuneLite test flow

**Files:**
- Create: `C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin\scripts\run-cerebro-companion.ps1`
- Create: `C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin\scripts\run-cerebro-companion.bat`
- Modify: `C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin\build.gradle`
- Test: `C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin\gradlew.bat`

- [ ] **Step 1: Write the failing launcher smoke-check**

Run: `.\scripts\run-cerebro-companion.bat`

Expected: PowerShell reports the file is missing.

- [ ] **Step 2: Add the PowerShell launcher**

Create `scripts/run-cerebro-companion.ps1`:

```powershell
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$gradle = Join-Path $repoRoot "gradlew.bat"

if (-not (Test-Path $gradle)) {
    throw "Gradle wrapper not found at $gradle"
}

Write-Host ""
Write-Host "Starting the Cerebro RuneLite companion dev client..." -ForegroundColor Cyan
Write-Host "Backend should usually be running at http://127.0.0.1:8000" -ForegroundColor DarkGray
Write-Host ""

Push-Location $repoRoot
try {
    & $gradle runLocalClient
}
finally {
    Pop-Location
}
```

- [ ] **Step 3: Add the batch launcher**

Create `scripts/run-cerebro-companion.bat`:

```bat
@echo off
setlocal
set SCRIPT_DIR=%~dp0
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%run-cerebro-companion.ps1"
endlocal
```

- [ ] **Step 4: Add a more predictable dev-client run task name if needed**

If the build still uses only `runLocalClient`, keep the naming stable and ensure the launcher calls exactly that task:

```groovy
tasks.named('runLocalClient') {
    description = 'Launches the local RuneLite development client for the Cerebro companion.'
}
```

- [ ] **Step 5: Run the launcher to verify it reaches the wrapper task**

Run: `.\scripts\run-cerebro-companion.bat`

Expected: The wrapper starts and attempts to launch the RuneLite development client instead of failing immediately on missing scripts.

- [ ] **Step 6: Commit**

```bash
git add companion/runelite-plugin/scripts companion/runelite-plugin/build.gradle
git commit -m "Add a Windows launcher for the companion dev client"
```

### Task 3: Improve plugin-side local-test feedback for link and sync

**Files:**
- Modify: `C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin\src\main\java\com\cerebro\companion\CerebroCompanionConfig.java`
- Modify: `C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin\src\main\java\com\cerebro\companion\CerebroCompanionPlugin.java`
- Modify: `C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin\src\main\java\com\cerebro\companion\api\CerebroSyncClient.java`
- Modify: `C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin\src\test\java\com\cerebro\companion\CerebroCompanionPluginTest.java`
- Modify: `C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin\src\test\java\com\cerebro\companion\api\CerebroSyncClientTest.java`

- [ ] **Step 1: Add failing tests for clearer local-test state**

Extend plugin tests with explicit expectations for local-test status memory:

```java
@Test
void completeLinkStoresSyncSecretAndClearsPendingToken()
{
    FakeConfig config = new FakeConfig("http://127.0.0.1:8000", "abc123", "");
    Map<String, String> writes = new HashMap<>();
    Set<String> removed = new HashSet<>();
    CerebroCompanionPlugin plugin = new CerebroCompanionPlugin(
        config,
        "plugin-id",
        "0.1.0",
        writes::put,
        removed::add
    );

    plugin.completeLink(new LinkExchangeResponse("sync-secret"));

    assertEquals("sync-secret", writes.get(CerebroCompanionConfig.SYNC_SECRET_KEY));
    assertTrue(removed.contains(CerebroCompanionConfig.LINK_TOKEN_KEY));
}
```

Add API client tests for richer error context:

```java
@Test
void constructorRejectsBlankBaseUrl()
{
    IllegalArgumentException error = assertThrows(
        IllegalArgumentException.class,
        () -> new CerebroSyncClient(" ")
    );

    assertEquals("baseUrl must not be blank", error.getMessage());
}
```

- [ ] **Step 2: Run plugin tests to verify the new expectations fail before implementation**

Run: `.\gradlew.bat test --tests com.cerebro.companion.CerebroCompanionPluginTest --tests com.cerebro.companion.api.CerebroSyncClientTest`

Expected: One or more tests fail because the new status/diagnostic expectations are not fully represented yet.

- [ ] **Step 3: Add visible local-test config affordances**

Update `CerebroCompanionConfig.java` with visible, non-secret local-test helper fields:

```java
@ConfigItem(
    position = 3,
    keyName = "lastSyncStatus",
    name = "Last sync status",
    description = "Local test feedback for the most recent Cerebro sync attempt",
    hidden = true
)
default String lastSyncStatus()
{
    return "";
}

@ConfigItem(
    position = 4,
    keyName = "lastSyncAt",
    name = "Last sync time",
    description = "Local test feedback for the most recent Cerebro sync attempt",
    hidden = true
)
default String lastSyncAt()
{
    return "";
}
```

- [ ] **Step 4: Record clearer link and sync status in the plugin**

Update `CerebroCompanionPlugin.java` so local runs keep better state:

```java
private static final String LAST_SYNC_STATUS_KEY = "lastSyncStatus";
private static final String LAST_SYNC_AT_KEY = "lastSyncAt";

public void recordSyncStatus(String status)
{
    setConfigValue(LAST_SYNC_STATUS_KEY, requireValue("status", status));
    setConfigValue(LAST_SYNC_AT_KEY, Instant.now().toString());
}

public void completeLink(LinkExchangeResponse response)
{
    Objects.requireNonNull(response, "response must not be null");
    setConfigValue(
        CerebroCompanionConfig.SYNC_SECRET_KEY,
        requireValue("syncSecret", response.getSyncSecret())
    );
    clearConfigValue(CerebroCompanionConfig.LINK_TOKEN_KEY);
    recordSyncStatus("linked");
}
```

Wrap sync sends with explicit local-test statuses:

```java
public HttpRequest syncNow()
{
    HttpRequest request = getSyncClient().sendSyncRequest(requireSyncSecret(), composePayload());
    recordSyncStatus("sync-request-built");
    return request;
}
```

- [ ] **Step 5: Keep API diagnostics readable**

Update `CerebroSyncClient.java` so local callers get explicit request intent in thrown validation errors and helper methods remain deterministic:

```java
public HttpRequest buildSyncRequest(String syncSecret, SyncPayload payload)
{
    if (syncSecret == null || syncSecret.trim().isEmpty())
    {
        throw new IllegalArgumentException("syncSecret must not be blank");
    }
    if (payload == null)
    {
        throw new IllegalArgumentException("payload must not be null");
    }
    ...
}
```

- [ ] **Step 6: Run plugin tests to verify the feedback layer passes**

Run: `.\gradlew.bat test --tests com.cerebro.companion.CerebroCompanionPluginTest --tests com.cerebro.companion.api.CerebroSyncClientTest`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add companion/runelite-plugin/src/main/java/com/cerebro/companion/CerebroCompanionConfig.java companion/runelite-plugin/src/main/java/com/cerebro/companion/CerebroCompanionPlugin.java companion/runelite-plugin/src/main/java/com/cerebro/companion/api/CerebroSyncClient.java companion/runelite-plugin/src/test/java/com/cerebro/companion/CerebroCompanionPluginTest.java companion/runelite-plugin/src/test/java/com/cerebro/companion/api/CerebroSyncClientTest.java
git commit -m "Make the companion easier to verify locally"
```

### Task 4: Align the website companion panel with the new local test flow

**Files:**
- Modify: `C:\Users\great\Documents\Playground\cerebro-osrs\frontend\src\components\dashboard\CompanionStatusPanel.tsx`
- Test: `C:\Users\great\Documents\Playground\cerebro-osrs\frontend\src\components\dashboard\CompanionStatusPanel.tsx`

- [ ] **Step 1: Write the failing UI expectation**

Define the new local-test copy requirement inline before changing the component:

```tsx
// Local test flow requirement:
// After generating a plugin link code, the UI should point the tester at
// companion/runelite-plugin/scripts/run-cerebro-companion.bat
// so the website and plugin setup feel like one coherent flow.
```

- [ ] **Step 2: Run the frontend build to verify current copy is still the old generic version**

Run: `npm.cmd run build`

Expected: PASS, but the component still lacks the Windows-first local test instructions.

- [ ] **Step 3: Add explicit local-test guidance to the companion panel**

Update the link-token help block to point directly at the launcher and the expected next steps:

```tsx
<p className="mt-3 text-xs leading-6 text-osrs-text-soft">
  Enter this in the RuneLite companion plugin
  {expiresAt ? ` before ${formatTimestamp(expiresAt)}` : ""}.
</p>
<p className="mt-2 text-xs leading-6 text-osrs-text-soft">
  For local Windows testing, start the companion from
  <code className="mx-1 font-mono text-[0.72rem]">
    companion\\runelite-plugin\\scripts\\run-cerebro-companion.bat
  </code>
  after your backend is running.
</p>
```

- [ ] **Step 4: Rebuild the frontend**

Run: `npm.cmd run build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/CompanionStatusPanel.tsx
git commit -m "Guide local companion testing from the dashboard"
```

### Task 5: Write the Windows local test guide

**Files:**
- Create: `C:\Users\great\Documents\Playground\cerebro-osrs\docs\runelite-companion-local-test.md`

- [ ] **Step 1: Create the guide with the full Windows local flow**

Write `docs/runelite-companion-local-test.md`:

```markdown
# RuneLite Companion Local Test Guide

## What this is

This guide walks through the Windows-first local test flow for the Cerebro RuneLite companion.

## Prerequisites

- Docker Desktop running
- Cerebro repo checked out locally
- Java available on Windows

## Start Cerebro

From the repo root:

```powershell
docker compose up -d postgres redis backend
cd frontend
npm.cmd run dev
```

Open:

- http://127.0.0.1:5173
- optional health check: http://127.0.0.1:8000/health

## Generate a plugin link code

1. Sign in to Cerebro.
2. Select your RSN.
3. Open the RuneLite companion panel.
4. Click `Create plugin link code`.
5. Keep the link code visible.

## Launch the local companion client

From:

```text
companion\runelite-plugin\scripts\run-cerebro-companion.bat
```

Double-click the batch file or run it from PowerShell.

## Link the plugin

1. Open the Cerebro Companion plugin config.
2. Confirm the base URL is `http://127.0.0.1:8000`.
3. Paste the link token from the website.
4. Trigger the link exchange.

## Verify sync

- Trigger `Sync now` if needed.
- Confirm the website shows the account as linked.
- Confirm the companion last-sync timestamp updates.
- Ask Cerebro a question that depends on quests, diaries, teleports, or notable gear.

## Troubleshooting

- If link fails, confirm the backend is running on port 8000.
- If sync fails, confirm the base URL is correct.
- If the code expires, generate a new plugin link code in the site.
- If the client does not launch, re-run the launcher from PowerShell to read the error output.
```

- [ ] **Step 2: Review the guide for repository-specific accuracy**

Check that every path and command matches the actual repo:

```text
companion\runelite-plugin\scripts\run-cerebro-companion.bat
frontend
http://127.0.0.1:8000
http://127.0.0.1:5173
```

- [ ] **Step 3: Commit**

```bash
git add docs/runelite-companion-local-test.md
git commit -m "Document the local companion test flow"
```

### Task 6: Run the full local verification sweep

**Files:**
- Modify: none unless verification reveals a defect
- Test: backend companion suite, frontend build, plugin JUnit suite, local launcher flow

- [ ] **Step 1: Run backend verification**

Run:

```powershell
docker compose exec backend uv run pytest tests/test_companion.py tests/test_chat.py tests/test_accounts.py -q
```

Expected: PASS

- [ ] **Step 2: Run frontend verification**

Run:

```powershell
cd frontend
npm.cmd run build
```

Expected: PASS

- [ ] **Step 3: Run plugin verification through the wrapper**

Run:

```powershell
cd companion\runelite-plugin
.\gradlew.bat test
```

Expected: PASS

- [ ] **Step 4: Run the launcher smoke test**

Run:

```powershell
cd companion\runelite-plugin
.\scripts\run-cerebro-companion.bat
```

Expected: The RuneLite development client launch begins instead of failing on missing tooling.

- [ ] **Step 5: If verification reveals defects, fix them before claiming completion**

Use the smallest possible change set. Re-run the exact failing command before moving on.

- [ ] **Step 6: Commit final verification-safe cleanup if needed**

```bash
git add companion/runelite-plugin frontend/src/components/dashboard/CompanionStatusPanel.tsx docs/runelite-companion-local-test.md
git commit -m "Finish the local companion installability path"
```

## Self-Review

- Spec coverage:
  - Goal covered by Tasks 1, 2, and 6.
  - Tooling and launcher covered by Tasks 1 and 2.
  - Plugin local-test usability covered by Task 3.
  - Website-side guidance covered by Task 4.
  - Documentation covered by Task 5.
  - End-to-end verification covered by Task 6.
- Placeholder scan:
  - No TODO/TBD markers remain.
  - Commands, file paths, and expected outcomes are explicit.
- Type consistency:
  - Config/status names introduced in Task 3 are used consistently.
  - Launcher and guide paths match each other and the planned file structure.
