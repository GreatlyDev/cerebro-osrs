package com.cerebro.companion;

import com.cerebro.companion.api.CerebroModels.LinkExchangeResponse;
import com.cerebro.companion.api.CerebroModels.LinkExchangeRequest;
import com.cerebro.companion.api.CerebroModels.SyncPayload;
import com.cerebro.companion.api.CerebroSyncClient;
import com.cerebro.companion.state.DiaryStateCollector;
import com.cerebro.companion.state.GearStateCollector;
import com.cerebro.companion.state.PayloadComposer;
import com.cerebro.companion.state.QuestStateCollector;
import com.cerebro.companion.state.TravelStateCollector;
import com.cerebro.companion.state.UtilityStateCollector;
import com.google.inject.Provides;

import java.io.ByteArrayOutputStream;
import java.lang.reflect.AnnotatedElement;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.net.http.HttpRequest;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.io.IOException;

import net.runelite.client.config.Config;
import net.runelite.client.config.ConfigItem;
import net.runelite.client.config.ConfigManager;
import net.runelite.client.events.ConfigChanged;
import net.runelite.client.plugins.Plugin;
import net.runelite.client.plugins.PluginDescriptor;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

class CerebroCompanionPluginTest
{
    // Local-installability contract:
    // 1. Windows users can run `gradlew.bat runLocalClient`
    // 2. The task launches a RuneLite development client with this plugin on the classpath
    // 3. The same wrapper can run `gradlew.bat test` without a separate Gradle install
    @Test
    void linkLifecycleUsesPersistedConfigAndClearsOneTimeToken() throws Exception
    {
        AtomicReference<String> baseUrl = new AtomicReference<>("http://127.0.0.1:8000");
        AtomicReference<String> linkToken = new AtomicReference<>("");
        AtomicReference<String> syncSecret = new AtomicReference<>("");

        CerebroCompanionConfig config = new TestConfig(baseUrl, linkToken, syncSecret);
        CerebroCompanionPlugin plugin = new CerebroCompanionPlugin(
            config,
            "plugin-123",
            "0.1.0",
            (key, value) ->
            {
                if (CerebroCompanionConfig.BASE_URL_KEY.equals(key))
                {
                    baseUrl.set(value);
                }
                if (CerebroCompanionConfig.LINK_TOKEN_KEY.equals(key))
                {
                    linkToken.set(value);
                }
                if (CerebroCompanionConfig.SYNC_SECRET_KEY.equals(key))
                {
                    syncSecret.set(value);
                }
            },
            key ->
            {
                if (CerebroCompanionConfig.LINK_TOKEN_KEY.equals(key))
                {
                    linkToken.set("");
                }
                if (CerebroCompanionConfig.SYNC_SECRET_KEY.equals(key))
                {
                    syncSecret.set("");
                }
            }
        );

        assertTrue(Plugin.class.isAssignableFrom(CerebroCompanionPlugin.class));
        PluginDescriptor descriptor = CerebroCompanionPlugin.class.getAnnotation(PluginDescriptor.class);
        assertNotNull(descriptor);
        assertEquals("Cerebro Companion", descriptor.name());
        assertEquals(CerebroCompanionConfig.GROUP, descriptor.configName());

        plugin.beginLink("token-123");
        assertTrue(plugin.hasPendingLink());
        assertEquals("token-123", linkToken.get());

        HttpRequest exchangeRequest = plugin.buildLinkExchangeRequest();
        assertEquals("http://127.0.0.1:8000/api/companion/link", exchangeRequest.uri().toString());

        plugin.completeLink(new LinkExchangeResponse("secret-456", 7, "Gilganor", "linked"));

        assertFalse(plugin.hasPendingLink());
        assertEquals("", linkToken.get());
        assertEquals("secret-456", syncSecret.get());

        HttpRequest syncRequest = plugin.buildSyncRequest();
        assertEquals("secret-456", syncRequest.headers().firstValue("X-Cerebro-Sync-Secret").orElseThrow());
        String syncPayload = readRequestBody(syncRequest);
        assertTrue(syncPayload.contains("\"link_token_present\":false"));
        assertFalse(syncPayload.contains("\"link_token_present\":true"));
    }

    @Test
    void providesRuneLiteConfigThroughConfigManagerMethod() throws Exception
    {
        Method provideConfig = CerebroCompanionPlugin.class.getDeclaredMethod(
            "provideConfig",
            ConfigManager.class
        );

        assertNotNull(provideConfig.getAnnotation(Provides.class));
        assertEquals(CerebroCompanionConfig.class, provideConfig.getReturnType());
        assertTrue(Config.class.isAssignableFrom(provideConfig.getReturnType()));
    }

    @Test
    void syncSecretConfigItemStaysHiddenButIsNotMarkedSecret() throws Exception
    {
        Method syncSecretMethod = CerebroCompanionConfig.class.getDeclaredMethod("syncSecret");
        ConfigItem configItem = ((AnnotatedElement) syncSecretMethod).getAnnotation(ConfigItem.class);

        assertNotNull(configItem);
        assertTrue(configItem.hidden());
        assertFalse(configItem.secret());
    }

    @Test
    void syncNowBuildsBroadPayloadAndSendsItThroughSyncClient() throws Exception
    {
        AtomicReference<String> baseUrl = new AtomicReference<>("http://127.0.0.1:8000");
        AtomicReference<String> linkToken = new AtomicReference<>("pending-link");
        AtomicReference<String> syncSecret = new AtomicReference<>("secret-456");

        CerebroCompanionConfig config = new TestConfig(baseUrl, linkToken, syncSecret);
        CapturingSyncClient syncClient = new CapturingSyncClient(baseUrl.get());

        CerebroCompanionPlugin plugin = new CerebroCompanionPlugin(
            config,
            "plugin-123",
            "0.1.0",
            ignored -> syncClient,
            (key, value) ->
            {
            },
            key ->
            {
            },
            new QuestStateCollector(List.of("Dragon Slayer I")),
            new DiaryStateCollector(Map.of("desert", List.of("easy"))),
            new TravelStateCollector(List.of("fairy_ring_zanaris"), List.of("spellbook:lunar")),
            new GearStateCollector(
                List.of("dragon_scimitar"),
                Map.of("weapon", "dragon_scimitar"),
                List.of("seed_box")
            ),
            new UtilityStateCollector(Map.of("account_type", "main")),
            new PayloadComposer()
        );

        HttpRequest sentRequest = plugin.syncNow();

        assertSame(sentRequest, syncClient.getLastRequest());
        assertEquals("secret-456", syncClient.getLastSyncSecret());
        assertEquals("Dragon Slayer I", syncClient.getLastPayload().getCompletedQuests().get(0));
        assertEquals("main", syncClient.getLastPayload().getCompanionState().get("account_type"));

        String syncPayload = readRequestBody(sentRequest);
        assertTrue(syncPayload.contains("\"completed_quests\":[\"Dragon Slayer I\"]"));
        assertTrue(syncPayload.contains("\"completed_diaries\":{\"desert\":[\"easy\"]}"));
        assertTrue(syncPayload.contains("\"unlocked_transports\":[\"fairy_ring_zanaris\"]"));
        assertTrue(syncPayload.contains("\"equipped_gear\":{\"weapon\":\"dragon_scimitar\"}"));
        assertTrue(syncPayload.contains("\"link_token_present\":true"));
    }

    @Test
    void completeLinkStoresSyncSecretAndClearsPendingToken()
    {
        AtomicReference<String> baseUrl = new AtomicReference<>("http://127.0.0.1:8000");
        AtomicReference<String> linkToken = new AtomicReference<>("abc123");
        AtomicReference<String> syncSecret = new AtomicReference<>("");
        Map<String, String> writes = new HashMap<>();
        Set<String> removed = new HashSet<>();

        CerebroCompanionPlugin plugin = new CerebroCompanionPlugin(
            new TestConfig(baseUrl, linkToken, syncSecret),
            "plugin-id",
            "0.1.0",
            writes::put,
            removed::add
        );

        plugin.completeLink(new LinkExchangeResponse("sync-secret", 7, "Gilganor", "linked"));

        assertEquals("sync-secret", writes.get(CerebroCompanionConfig.SYNC_SECRET_KEY));
        assertTrue(removed.contains(CerebroCompanionConfig.LINK_TOKEN_KEY));
        assertEquals("linked", writes.get(CerebroCompanionConfig.LAST_SYNC_STATUS_KEY));
        assertTrue(writes.containsKey(CerebroCompanionConfig.LAST_SYNC_AT_KEY));
    }

    @Test
    void processingVisibleLinkCodeExchangesAndSyncs()
    {
        AtomicReference<String> baseUrl = new AtomicReference<>("http://127.0.0.1:8000");
        AtomicReference<String> linkToken = new AtomicReference<>("link-code-123");
        AtomicReference<String> syncSecret = new AtomicReference<>("");
        Map<String, String> writes = new HashMap<>();
        Set<String> removed = new HashSet<>();
        java.util.List<String> statusWrites = new java.util.ArrayList<>();

        RecordingSyncClient syncClient = new RecordingSyncClient(baseUrl.get());
        CerebroCompanionPlugin plugin = new CerebroCompanionPlugin(
            new TestConfig(baseUrl, linkToken, syncSecret),
            "plugin-id",
            "0.1.0",
            ignored -> syncClient,
            (key, value) ->
            {
                writes.put(key, value);
                if (CerebroCompanionConfig.LAST_SYNC_STATUS_KEY.equals(key))
                {
                    statusWrites.add(value);
                }
                if (CerebroCompanionConfig.SYNC_SECRET_KEY.equals(key))
                {
                    syncSecret.set(value);
                }
            },
            key ->
            {
                removed.add(key);
                if (CerebroCompanionConfig.LINK_TOKEN_KEY.equals(key))
                {
                    linkToken.set("");
                }
            },
            new QuestStateCollector(),
            new DiaryStateCollector(),
            new TravelStateCollector(),
            new GearStateCollector(),
            new UtilityStateCollector(),
            new PayloadComposer()
        );

        plugin.processPendingLink();

        assertTrue(syncClient.exchangeCalled);
        assertTrue(syncClient.syncCalled);
        assertTrue(statusWrites.contains("linked"));
        assertTrue(statusWrites.contains("syncing"));
        assertEquals("synced", writes.get(CerebroCompanionConfig.LAST_SYNC_STATUS_KEY));
        assertEquals("sync-secret", writes.get(CerebroCompanionConfig.SYNC_SECRET_KEY));
        assertTrue(removed.contains(CerebroCompanionConfig.LINK_TOKEN_KEY));
    }

    @Test
    void configChangeOnLinkCodeTriggersProcessing()
    {
        AtomicReference<String> baseUrl = new AtomicReference<>("http://127.0.0.1:8000");
        AtomicReference<String> linkToken = new AtomicReference<>("link-code-123");
        AtomicReference<String> syncSecret = new AtomicReference<>("");
        Map<String, String> writes = new HashMap<>();
        Set<String> removed = new HashSet<>();

        RecordingSyncClient syncClient = new RecordingSyncClient(baseUrl.get());
        CerebroCompanionPlugin plugin = new CerebroCompanionPlugin(
            new TestConfig(baseUrl, linkToken, syncSecret),
            "plugin-id",
            "0.1.0",
            ignored -> syncClient,
            (key, value) ->
            {
                writes.put(key, value);
                if (CerebroCompanionConfig.SYNC_SECRET_KEY.equals(key))
                {
                    syncSecret.set(value);
                }
            },
            key ->
            {
                removed.add(key);
                if (CerebroCompanionConfig.LINK_TOKEN_KEY.equals(key))
                {
                    linkToken.set("");
                }
            },
            new QuestStateCollector(),
            new DiaryStateCollector(),
            new TravelStateCollector(),
            new GearStateCollector(),
            new UtilityStateCollector(),
            new PayloadComposer()
        );

        ConfigChanged event = new ConfigChanged();
        event.setGroup(CerebroCompanionConfig.GROUP);
        event.setKey(CerebroCompanionConfig.LINK_TOKEN_KEY);

        plugin.onConfigChanged(event);

        assertFalse(syncClient.exchangeCalled);
    }

    @Test
    void applyLinkCodeConfigActionProcessesVisibleLinkCode()
    {
        AtomicReference<String> baseUrl = new AtomicReference<>("http://127.0.0.1:8000");
        AtomicReference<String> linkToken = new AtomicReference<>("link-code-123");
        AtomicReference<String> syncSecret = new AtomicReference<>("");
        Map<String, String> writes = new HashMap<>();
        Set<String> removed = new HashSet<>();

        RecordingSyncClient syncClient = new RecordingSyncClient(baseUrl.get());
        CerebroCompanionPlugin plugin = new CerebroCompanionPlugin(
            new TestConfig(baseUrl, linkToken, syncSecret),
            "plugin-id",
            "0.1.0",
            ignored -> syncClient,
            (key, value) ->
            {
                writes.put(key, value);
                if (CerebroCompanionConfig.SYNC_SECRET_KEY.equals(key))
                {
                    syncSecret.set(value);
                }
            },
            key ->
            {
                removed.add(key);
                if (CerebroCompanionConfig.LINK_TOKEN_KEY.equals(key))
                {
                    linkToken.set("");
                }
            },
            new QuestStateCollector(),
            new DiaryStateCollector(),
            new TravelStateCollector(),
            new GearStateCollector(),
            new UtilityStateCollector(),
            new PayloadComposer()
        );

        ConfigChanged event = new ConfigChanged();
        event.setGroup(CerebroCompanionConfig.GROUP);
        event.setKey(CerebroCompanionConfig.APPLY_LINK_CODE_KEY);
        event.setNewValue("true");

        plugin.onConfigChanged(event);

        assertTrue(removed.contains(CerebroCompanionConfig.APPLY_LINK_CODE_KEY));
        assertTrue(syncClient.exchangeCalled);
        assertTrue(syncClient.syncCalled);
        assertEquals("sync-secret", writes.get(CerebroCompanionConfig.SYNC_SECRET_KEY));
    }

    @Test
    void syncNowConfigActionRunsFreshSyncWhenLinked()
    {
        AtomicReference<String> baseUrl = new AtomicReference<>("http://127.0.0.1:8000");
        AtomicReference<String> linkToken = new AtomicReference<>("");
        AtomicReference<String> syncSecret = new AtomicReference<>("sync-secret");
        Set<String> removed = new HashSet<>();

        RecordingSyncClient syncClient = new RecordingSyncClient(baseUrl.get());
        CerebroCompanionPlugin plugin = new CerebroCompanionPlugin(
            new TestConfig(baseUrl, linkToken, syncSecret),
            "plugin-id",
            "0.1.0",
            ignored -> syncClient,
            (key, value) -> {},
            removed::add,
            new QuestStateCollector(),
            new DiaryStateCollector(),
            new TravelStateCollector(),
            new GearStateCollector(),
            new UtilityStateCollector(),
            new PayloadComposer()
        );

        ConfigChanged event = new ConfigChanged();
        event.setGroup(CerebroCompanionConfig.GROUP);
        event.setKey(CerebroCompanionConfig.SYNC_NOW_KEY);
        event.setNewValue("true");

        plugin.onConfigChanged(event);

        assertTrue(removed.contains(CerebroCompanionConfig.SYNC_NOW_KEY));
        assertTrue(syncClient.syncCalled);
    }

    @Test
    void clearLocalLinkConfigActionClearsSavedLinkWithoutUsingRuneLiteReset()
    {
        AtomicReference<String> baseUrl = new AtomicReference<>("http://127.0.0.1:8000");
        AtomicReference<String> linkToken = new AtomicReference<>("stale-code");
        AtomicReference<String> syncSecret = new AtomicReference<>("sync-secret");
        Map<String, String> writes = new HashMap<>();
        Set<String> removed = new HashSet<>();

        CerebroCompanionPlugin plugin = new CerebroCompanionPlugin(
            new TestConfig(baseUrl, linkToken, syncSecret),
            "plugin-id",
            "0.1.0",
            ignored -> new RecordingSyncClient(baseUrl.get()),
            (key, value) -> writes.put(key, value),
            key ->
            {
                removed.add(key);
                if (CerebroCompanionConfig.LINK_TOKEN_KEY.equals(key))
                {
                    linkToken.set("");
                }
                if (CerebroCompanionConfig.SYNC_SECRET_KEY.equals(key))
                {
                    syncSecret.set("");
                }
            },
            new QuestStateCollector(),
            new DiaryStateCollector(),
            new TravelStateCollector(),
            new GearStateCollector(),
            new UtilityStateCollector(),
            new PayloadComposer()
        );

        ConfigChanged event = new ConfigChanged();
        event.setGroup(CerebroCompanionConfig.GROUP);
        event.setKey(CerebroCompanionConfig.DISCONNECT_KEY);
        event.setNewValue("true");

        plugin.onConfigChanged(event);

        assertTrue(removed.contains(CerebroCompanionConfig.DISCONNECT_KEY));
        assertTrue(removed.contains(CerebroCompanionConfig.LINK_TOKEN_KEY));
        assertTrue(removed.contains(CerebroCompanionConfig.SYNC_SECRET_KEY));
        assertEquals("", linkToken.get());
        assertEquals("", syncSecret.get());
        assertEquals(
            "local link cleared. Generate a fresh Cerebro link code to connect this RuneLite client again.",
            writes.get(CerebroCompanionConfig.LAST_SYNC_STATUS_KEY)
        );
    }

    @Test
    void startupWithStoredSyncSecretTriggersFreshSync() throws Exception
    {
        AtomicReference<String> baseUrl = new AtomicReference<>("http://127.0.0.1:8000");
        AtomicReference<String> linkToken = new AtomicReference<>("");
        AtomicReference<String> syncSecret = new AtomicReference<>("sync-secret");
        java.util.List<String> statusWrites = new java.util.ArrayList<>();

        RecordingSyncClient syncClient = new RecordingSyncClient(baseUrl.get());
        CerebroCompanionPlugin plugin = new CerebroCompanionPlugin(
            new TestConfig(baseUrl, linkToken, syncSecret),
            "plugin-id",
            "0.1.0",
            ignored -> syncClient,
            (key, value) ->
            {
                if (CerebroCompanionConfig.LAST_SYNC_STATUS_KEY.equals(key))
                {
                    statusWrites.add(value);
                }
            },
            key -> {},
            new QuestStateCollector(),
            new DiaryStateCollector(),
            new TravelStateCollector(),
            new GearStateCollector(),
            new UtilityStateCollector(),
            new PayloadComposer()
        );

        plugin.startUp();

        assertFalse(syncClient.exchangeCalled);
        assertTrue(syncClient.syncCalled);
        assertTrue(statusWrites.contains("syncing"));
    }

    @Test
    void startupWithStoredSyncSecretQueuesFreshSyncOnClientThread() throws Exception
    {
        AtomicReference<String> baseUrl = new AtomicReference<>("http://127.0.0.1:8000");
        AtomicReference<String> linkToken = new AtomicReference<>("");
        AtomicReference<String> syncSecret = new AtomicReference<>("sync-secret");
        AtomicReference<Runnable> queuedSync = new AtomicReference<>();

        RecordingSyncClient syncClient = new RecordingSyncClient(baseUrl.get());
        CerebroCompanionPlugin plugin = new CerebroCompanionPlugin(
            new TestConfig(baseUrl, linkToken, syncSecret),
            "plugin-id",
            "0.1.0",
            ignored -> syncClient,
            (key, value) -> {},
            key -> {},
            new QuestStateCollector(List.of("Cook's Assistant")),
            new DiaryStateCollector(),
            new TravelStateCollector(),
            new GearStateCollector(),
            new UtilityStateCollector(),
            new PayloadComposer(),
            queuedSync::set
        );

        plugin.startUp();

        assertFalse(syncClient.syncCalled);
        assertNotNull(queuedSync.get());

        queuedSync.get().run();

        assertTrue(syncClient.syncCalled);
    }

    @Test
    void processingVisibleLinkCodeQueuesFirstSyncOnClientThread()
    {
        AtomicReference<String> baseUrl = new AtomicReference<>("http://127.0.0.1:8000");
        AtomicReference<String> linkToken = new AtomicReference<>("link-code-123");
        AtomicReference<String> syncSecret = new AtomicReference<>("");
        AtomicReference<Runnable> queuedSync = new AtomicReference<>();

        RecordingSyncClient syncClient = new RecordingSyncClient(baseUrl.get());
        CerebroCompanionPlugin plugin = new CerebroCompanionPlugin(
            new TestConfig(baseUrl, linkToken, syncSecret),
            "plugin-id",
            "0.1.0",
            ignored -> syncClient,
            (key, value) ->
            {
                if (CerebroCompanionConfig.SYNC_SECRET_KEY.equals(key))
                {
                    syncSecret.set(value);
                }
            },
            key ->
            {
                if (CerebroCompanionConfig.LINK_TOKEN_KEY.equals(key))
                {
                    linkToken.set("");
                }
            },
            new QuestStateCollector(List.of("Cook's Assistant")),
            new DiaryStateCollector(),
            new TravelStateCollector(),
            new GearStateCollector(),
            new UtilityStateCollector(),
            new PayloadComposer(),
            queuedSync::set
        );

        plugin.processPendingLink();

        assertTrue(syncClient.exchangeCalled);
        assertFalse(syncClient.syncCalled);
        assertNotNull(queuedSync.get());

        queuedSync.get().run();

        assertTrue(syncClient.syncCalled);
    }

    @Test
    void failedPendingLinkShowsReadablePluginStatus()
    {
        AtomicReference<String> baseUrl = new AtomicReference<>("http://127.0.0.1:8000");
        AtomicReference<String> linkToken = new AtomicReference<>("expired-link");
        AtomicReference<String> syncSecret = new AtomicReference<>("");
        Map<String, String> writes = new HashMap<>();

        FailingSyncClient syncClient = new FailingSyncClient(
            baseUrl.get(),
            "Cerebro link exchange failed with status 400: Link token is invalid or expired."
        );
        CerebroCompanionPlugin plugin = new CerebroCompanionPlugin(
            new TestConfig(baseUrl, linkToken, syncSecret),
            "plugin-id",
            "0.1.0",
            ignored -> syncClient,
            writes::put,
            key -> {},
            new QuestStateCollector(),
            new DiaryStateCollector(),
            new TravelStateCollector(),
            new GearStateCollector(),
            new UtilityStateCollector(),
            new PayloadComposer()
        );

        plugin.processPendingLink();

        assertEquals(
            "link failed: Cerebro link exchange failed with status 400: Link token is invalid or expired. Generate a fresh link code on the site and paste it here.",
            writes.get(CerebroCompanionConfig.LAST_SYNC_STATUS_KEY)
        );
    }

    @Test
    void terminalLinkFailureClearsStaleLinkCodeForRetry()
    {
        AtomicReference<String> baseUrl = new AtomicReference<>("http://127.0.0.1:8000");
        AtomicReference<String> linkToken = new AtomicReference<>("expired-link");
        AtomicReference<String> syncSecret = new AtomicReference<>("");
        Map<String, String> writes = new HashMap<>();
        Set<String> removed = new HashSet<>();

        FailingSyncClient syncClient = new FailingSyncClient(
            baseUrl.get(),
            "Cerebro link exchange failed with status 404: Link token is invalid or expired."
        );
        CerebroCompanionPlugin plugin = new CerebroCompanionPlugin(
            new TestConfig(baseUrl, linkToken, syncSecret),
            "plugin-id",
            "0.1.0",
            ignored -> syncClient,
            writes::put,
            key ->
            {
                removed.add(key);
                if (CerebroCompanionConfig.LINK_TOKEN_KEY.equals(key))
                {
                    linkToken.set("");
                }
            },
            new QuestStateCollector(),
            new DiaryStateCollector(),
            new TravelStateCollector(),
            new GearStateCollector(),
            new UtilityStateCollector(),
            new PayloadComposer()
        );

        plugin.processPendingLink();

        assertTrue(removed.contains(CerebroCompanionConfig.LINK_TOKEN_KEY));
        assertEquals("", linkToken.get());
        assertEquals(
            "link failed: Cerebro link exchange failed with status 404: Link token is invalid or expired. Generate a fresh link code on the site and paste it here.",
            writes.get(CerebroCompanionConfig.LAST_SYNC_STATUS_KEY)
        );
    }

    @Test
    void transientLinkFailureKeepsCodeInPlaceForRetry()
    {
        AtomicReference<String> baseUrl = new AtomicReference<>("http://127.0.0.1:8000");
        AtomicReference<String> linkToken = new AtomicReference<>("retry-link");
        AtomicReference<String> syncSecret = new AtomicReference<>("");
        Map<String, String> writes = new HashMap<>();
        Set<String> removed = new HashSet<>();

        FailingSyncClient syncClient = new FailingSyncClient(
            baseUrl.get(),
            "Cerebro link exchange request failed"
        );
        CerebroCompanionPlugin plugin = new CerebroCompanionPlugin(
            new TestConfig(baseUrl, linkToken, syncSecret),
            "plugin-id",
            "0.1.0",
            ignored -> syncClient,
            writes::put,
            removed::add,
            new QuestStateCollector(),
            new DiaryStateCollector(),
            new TravelStateCollector(),
            new GearStateCollector(),
            new UtilityStateCollector(),
            new PayloadComposer()
        );

        plugin.processPendingLink();

        assertFalse(removed.contains(CerebroCompanionConfig.LINK_TOKEN_KEY));
        assertEquals("retry-link", linkToken.get());
        assertEquals(
            "link failed: Cerebro link exchange request failed",
            writes.get(CerebroCompanionConfig.LAST_SYNC_STATUS_KEY)
        );
    }

    @Test
    void staleReconnectCodeDoesNotOverwriteExistingLinkedState()
    {
        AtomicReference<String> baseUrl = new AtomicReference<>("http://127.0.0.1:8000");
        AtomicReference<String> linkToken = new AtomicReference<>("expired-link");
        AtomicReference<String> syncSecret = new AtomicReference<>("saved-secret");
        Map<String, String> writes = new HashMap<>();
        Set<String> removed = new HashSet<>();

        FailingSyncClient syncClient = new FailingSyncClient(
            baseUrl.get(),
            "Cerebro link exchange failed with status 404: Link token is invalid or expired."
        );
        CerebroCompanionPlugin plugin = new CerebroCompanionPlugin(
            new TestConfig(baseUrl, linkToken, syncSecret),
            "plugin-id",
            "0.1.0",
            ignored -> syncClient,
            writes::put,
            key ->
            {
                removed.add(key);
                if (CerebroCompanionConfig.LINK_TOKEN_KEY.equals(key))
                {
                    linkToken.set("");
                }
            },
            new QuestStateCollector(),
            new DiaryStateCollector(),
            new TravelStateCollector(),
            new GearStateCollector(),
            new UtilityStateCollector(),
            new PayloadComposer()
        );

        plugin.processPendingLink();

        assertTrue(removed.contains(CerebroCompanionConfig.LINK_TOKEN_KEY));
        assertEquals("saved-secret", syncSecret.get());
        assertEquals(
            "reconnect failed: Cerebro link exchange failed with status 404: Link token is invalid or expired. The saved companion link is still available. Generate a fresh reconnect code on the site if you need to relink this client.",
            writes.get(CerebroCompanionConfig.LAST_SYNC_STATUS_KEY)
        );
    }

    @Test
    void localRunBuildIsWiredThroughThePluginHarness() throws Exception
    {
        Path buildFile = Path.of("build.gradle");
        String build = Files.readString(buildFile);

        assertTrue(build.contains("def pluginMainClass = 'com.cerebro.companion.CerebroCompanionPluginHarness'"));
        assertTrue(build.contains("classpath = sourceSets.test.runtimeClasspath"));
        assertTrue(build.contains("mainClass = pluginMainClass"));
        assertTrue(build.contains("args '--developer-mode', '--debug'"));
        assertTrue(build.contains("jvmArgs '-ea'"));
        assertEquals(CerebroCompanionPlugin.class, CerebroCompanionPluginHarness.targetPlugin());
    }

    private String readRequestBody(HttpRequest request) throws Exception
    {
        HttpRequest.BodyPublisher publisher = request.bodyPublisher().orElseThrow();
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        AtomicReference<Throwable> failure = new AtomicReference<>();
        CountDownLatch complete = new CountDownLatch(1);

        publisher.subscribe(new Flow.Subscriber<>()
        {
            @Override
            public void onSubscribe(Flow.Subscription subscription)
            {
                subscription.request(Long.MAX_VALUE);
            }

            @Override
            public void onNext(ByteBuffer item)
            {
                byte[] bytes = new byte[item.remaining()];
                item.get(bytes);
                output.write(bytes, 0, bytes.length);
            }

            @Override
            public void onError(Throwable throwable)
            {
                failure.set(throwable);
                complete.countDown();
            }

            @Override
            public void onComplete()
            {
                complete.countDown();
            }
        });

        assertTrue(complete.await(1, TimeUnit.SECONDS), "body publisher did not complete");
        if (failure.get() != null)
        {
            fail(failure.get());
        }

        return output.toString(StandardCharsets.UTF_8);
    }

    private static final class TestConfig implements CerebroCompanionConfig
    {
        private final AtomicReference<String> baseUrl;
        private final AtomicReference<String> linkToken;
        private final AtomicReference<String> syncSecret;

        private TestConfig(
            AtomicReference<String> baseUrl,
            AtomicReference<String> linkToken,
            AtomicReference<String> syncSecret
        )
        {
            this.baseUrl = baseUrl;
            this.linkToken = linkToken;
            this.syncSecret = syncSecret;
        }

        @Override
        public String baseUrl()
        {
            return baseUrl.get();
        }

        @Override
        public String linkToken()
        {
            return linkToken.get();
        }

        @Override
        public String syncSecret()
        {
            return syncSecret.get();
        }

        @Override
        public String lastSyncStatus()
        {
            return "";
        }

        @Override
        public String lastSyncAt()
        {
            return "";
        }
    }

    private static final class CapturingSyncClient extends CerebroSyncClient
    {
        private HttpRequest lastRequest;
        private SyncPayload lastPayload;
        private String lastSyncSecret;

        private CapturingSyncClient(String baseUrl)
        {
            super(baseUrl);
        }

        @Override
        public HttpRequest sendSyncRequest(String syncSecret, SyncPayload payload)
        {
            this.lastSyncSecret = syncSecret;
            this.lastPayload = payload;
            this.lastRequest = super.buildSyncRequest(syncSecret, payload);
            return lastRequest;
        }

        private HttpRequest getLastRequest()
        {
            return lastRequest;
        }

        private SyncPayload getLastPayload()
        {
            return lastPayload;
        }

        private String getLastSyncSecret()
        {
            return lastSyncSecret;
        }
    }

    private static final class RecordingSyncClient extends CerebroSyncClient
    {
        private boolean exchangeCalled;
        private boolean syncCalled;

        private RecordingSyncClient(String baseUrl)
        {
            super(baseUrl, request -> {
                throw new IOException("not used in test");
            });
        }

        @Override
        public LinkExchangeResponse exchangeLink(LinkExchangeRequest request)
        {
            exchangeCalled = true;
            return new LinkExchangeResponse("sync-secret", 7, "Gilganor", "linked");
        }

        @Override
        public void sendSyncPayload(String syncSecret, SyncPayload payload)
        {
            syncCalled = true;
        }
    }

    private static final class FailingSyncClient extends CerebroSyncClient
    {
        private final String failureMessage;

        private FailingSyncClient(String baseUrl, String failureMessage)
        {
            super(baseUrl, request -> {
                throw new IOException("not used in test");
            });
            this.failureMessage = failureMessage;
        }

        @Override
        public LinkExchangeResponse exchangeLink(LinkExchangeRequest request)
        {
            throw new IllegalStateException(failureMessage);
        }
    }
}
