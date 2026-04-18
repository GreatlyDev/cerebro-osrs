package com.cerebro.companion;

import com.cerebro.companion.api.CerebroModels.LinkExchangeRequest;
import com.cerebro.companion.api.CerebroModels.LinkExchangeResponse;
import com.cerebro.companion.api.CerebroModels.SyncPayload;
import com.cerebro.companion.api.CerebroSyncClient;
import com.cerebro.companion.state.DiaryStateCollector;
import com.cerebro.companion.state.GearStateCollector;
import com.cerebro.companion.state.PayloadComposer;
import com.cerebro.companion.state.QuestStateCollector;
import com.cerebro.companion.state.TravelStateCollector;
import com.cerebro.companion.state.UtilityStateCollector;
import com.google.inject.Provides;

import java.net.http.HttpRequest;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import java.util.function.Function;
import javax.inject.Inject;

import net.runelite.client.config.ConfigManager;
import net.runelite.client.eventbus.Subscribe;
import net.runelite.client.events.ConfigChanged;
import net.runelite.client.plugins.Plugin;
import net.runelite.client.plugins.PluginDescriptor;

@PluginDescriptor(
    name = "Cerebro Companion",
    configName = CerebroCompanionConfig.GROUP,
    description = "Syncs private account awareness from RuneLite into Cerebro",
    tags = {"sync", "quests", "diaries", "gear", "teleports"}
)
public class CerebroCompanionPlugin extends Plugin
{
    private final String pluginInstanceId;
    private final String pluginVersion;
    private final Function<String, CerebroSyncClient> syncClientFactory;
    private final BiConsumer<String, String> configWriter;
    private final Consumer<String> configRemover;
    private final QuestStateCollector questStateCollector;
    private final DiaryStateCollector diaryStateCollector;
    private final TravelStateCollector travelStateCollector;
    private final GearStateCollector gearStateCollector;
    private final UtilityStateCollector utilityStateCollector;
    private final PayloadComposer payloadComposer;

    @Inject
    private ConfigManager configManager;

    @Inject
    private CerebroCompanionConfig config;

    public CerebroCompanionPlugin()
    {
        this(
            UUID.randomUUID().toString(),
            resolvePluginVersion(),
            CerebroSyncClient::new,
            null,
            null,
            new QuestStateCollector(),
            new DiaryStateCollector(),
            new TravelStateCollector(),
            new GearStateCollector(),
            new UtilityStateCollector(),
            new PayloadComposer()
        );
    }

    CerebroCompanionPlugin(
        ConfigManager configManager,
        CerebroCompanionConfig config,
        String pluginInstanceId,
        String pluginVersion
    )
    {
        this(
            config,
            pluginInstanceId,
            pluginVersion,
            CerebroSyncClient::new,
            (key, value) -> configManager.setConfiguration(CerebroCompanionConfig.GROUP, key, value),
            key -> configManager.unsetConfiguration(CerebroCompanionConfig.GROUP, key),
            new QuestStateCollector(),
            new DiaryStateCollector(),
            new TravelStateCollector(),
            new GearStateCollector(),
            new UtilityStateCollector(),
            new PayloadComposer()
        );
        this.configManager = Objects.requireNonNull(configManager, "configManager must not be null");
    }

    CerebroCompanionPlugin(
        CerebroCompanionConfig config,
        String pluginInstanceId,
        String pluginVersion,
        BiConsumer<String, String> configWriter,
        Consumer<String> configRemover
    )
    {
        this(
            config,
            pluginInstanceId,
            pluginVersion,
            CerebroSyncClient::new,
            configWriter,
            configRemover,
            new QuestStateCollector(),
            new DiaryStateCollector(),
            new TravelStateCollector(),
            new GearStateCollector(),
            new UtilityStateCollector(),
            new PayloadComposer()
        );
    }

    CerebroCompanionPlugin(
        CerebroCompanionConfig config,
        String pluginInstanceId,
        String pluginVersion,
        Function<String, CerebroSyncClient> syncClientFactory,
        BiConsumer<String, String> configWriter,
        Consumer<String> configRemover,
        QuestStateCollector questStateCollector,
        DiaryStateCollector diaryStateCollector,
        TravelStateCollector travelStateCollector,
        GearStateCollector gearStateCollector,
        UtilityStateCollector utilityStateCollector,
        PayloadComposer payloadComposer
    )
    {
        this(
            pluginInstanceId,
            pluginVersion,
            syncClientFactory,
            Objects.requireNonNull(configWriter, "configWriter must not be null"),
            Objects.requireNonNull(configRemover, "configRemover must not be null"),
            questStateCollector,
            diaryStateCollector,
            travelStateCollector,
            gearStateCollector,
            utilityStateCollector,
            payloadComposer
        );
        this.config = Objects.requireNonNull(config, "config must not be null");
    }

    private CerebroCompanionPlugin(
        String pluginInstanceId,
        String pluginVersion,
        Function<String, CerebroSyncClient> syncClientFactory,
        BiConsumer<String, String> configWriter,
        Consumer<String> configRemover,
        QuestStateCollector questStateCollector,
        DiaryStateCollector diaryStateCollector,
        TravelStateCollector travelStateCollector,
        GearStateCollector gearStateCollector,
        UtilityStateCollector utilityStateCollector,
        PayloadComposer payloadComposer
    )
    {
        this.pluginInstanceId = requireValue("pluginInstanceId", pluginInstanceId);
        this.pluginVersion = requireValue("pluginVersion", pluginVersion);
        this.syncClientFactory = Objects.requireNonNull(syncClientFactory, "syncClientFactory must not be null");
        this.configWriter = configWriter;
        this.configRemover = configRemover;
        this.questStateCollector = Objects.requireNonNull(questStateCollector, "questStateCollector must not be null");
        this.diaryStateCollector = Objects.requireNonNull(diaryStateCollector, "diaryStateCollector must not be null");
        this.travelStateCollector = Objects.requireNonNull(travelStateCollector, "travelStateCollector must not be null");
        this.gearStateCollector = Objects.requireNonNull(gearStateCollector, "gearStateCollector must not be null");
        this.utilityStateCollector = Objects.requireNonNull(utilityStateCollector, "utilityStateCollector must not be null");
        this.payloadComposer = Objects.requireNonNull(payloadComposer, "payloadComposer must not be null");
    }

    public CerebroCompanionConfig getConfig()
    {
        return requireConfig();
    }

    @Provides
    CerebroCompanionConfig provideConfig(ConfigManager configManager)
    {
        return configManager.getConfig(CerebroCompanionConfig.class);
    }

    public CerebroSyncClient getSyncClient()
    {
        return syncClientFactory.apply(normalizeBaseUrl(requireConfig().baseUrl()));
    }

    @Override
    protected void startUp()
    {
        if (hasPendingLink())
        {
            processPendingLink();
            return;
        }

        if (hasSyncSecret())
        {
            try
            {
                syncNow();
            }
            catch (RuntimeException error)
            {
                recordSyncStatus("sync failed: " + summarize(error));
            }
        }
    }

    public void beginLink(String linkToken)
    {
        setConfigValue(CerebroCompanionConfig.LINK_TOKEN_KEY, requireValue("linkToken", linkToken));
    }

    public boolean hasPendingLink()
    {
        return !normalizeConfigValue(requireConfig().linkToken()).isEmpty();
    }

    public HttpRequest buildLinkExchangeRequest()
    {
        String linkToken = normalizeConfigValue(requireConfig().linkToken());
        if (linkToken.isEmpty())
        {
            throw new IllegalStateException("A link token is required before exchanging for a sync secret.");
        }

        return getSyncClient().buildExchangeRequest(
            new LinkExchangeRequest(linkToken, pluginInstanceId, pluginVersion)
        );
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

    public HttpRequest buildSyncRequest()
    {
        return getSyncClient().buildSyncRequest(requireSyncSecret(), composePayload());
    }

    public HttpRequest syncNow()
    {
        recordSyncStatus("syncing");
        HttpRequest request = getSyncClient().sendSyncRequest(requireSyncSecret(), composePayload());
        recordSyncStatus("synced");
        return request;
    }

    public void processPendingLink()
    {
        if (!hasPendingLink())
        {
            return;
        }

        try
        {
            LinkExchangeResponse response = getSyncClient().exchangeLink(
                new LinkExchangeRequest(
                    normalizeConfigValue(requireConfig().linkToken()),
                    pluginInstanceId,
                    pluginVersion
                )
            );
            completeLink(response);
            syncNow();
        }
        catch (RuntimeException error)
        {
            recordSyncStatus("link failed: " + summarize(error));
        }
    }

    @Subscribe
    public void onConfigChanged(ConfigChanged event)
    {
        if (event == null)
        {
            return;
        }

        if (!CerebroCompanionConfig.GROUP.equals(event.getGroup()))
        {
            return;
        }

        if (!CerebroCompanionConfig.LINK_TOKEN_KEY.equals(event.getKey()))
        {
            return;
        }

        if (!hasPendingLink())
        {
            return;
        }

        processPendingLink();
    }

    public void recordSyncStatus(String status)
    {
        setConfigValue(
            CerebroCompanionConfig.LAST_SYNC_STATUS_KEY,
            requireValue("status", status)
        );
        setConfigValue(CerebroCompanionConfig.LAST_SYNC_AT_KEY, Instant.now().toString());
    }

    private CerebroCompanionConfig requireConfig()
    {
        if (config == null)
        {
            throw new IllegalStateException("CerebroCompanionConfig has not been injected.");
        }
        return config;
    }

    private ConfigManager requireConfigManager()
    {
        if (configManager == null)
        {
            throw new IllegalStateException("ConfigManager has not been injected.");
        }
        return configManager;
    }

    private void setConfigValue(String key, String value)
    {
        if (configWriter != null)
        {
            configWriter.accept(key, value);
            return;
        }

        requireConfigManager().setConfiguration(CerebroCompanionConfig.GROUP, key, value);
    }

    private void clearConfigValue(String key)
    {
        if (configRemover != null)
        {
            configRemover.accept(key);
            return;
        }

        requireConfigManager().unsetConfiguration(CerebroCompanionConfig.GROUP, key);
    }

    private SyncPayload composePayload()
    {
        return payloadComposer.compose(
            pluginInstanceId,
            pluginVersion,
            hasPendingLink(),
            questStateCollector,
            diaryStateCollector,
            travelStateCollector,
            gearStateCollector,
            utilityStateCollector
        );
    }

    private String requireSyncSecret()
    {
        String syncSecret = normalizeConfigValue(requireConfig().syncSecret());
        if (syncSecret.isEmpty())
        {
            throw new IllegalStateException("A sync secret is required before building a sync request.");
        }
        return syncSecret;
    }

    private boolean hasSyncSecret()
    {
        return !normalizeConfigValue(requireConfig().syncSecret()).isEmpty();
    }

    private static String requireValue(String name, String value)
    {
        String normalized = normalizeConfigValue(value);
        if (normalized.isEmpty())
        {
            throw new IllegalArgumentException(name + " must not be blank");
        }
        return normalized;
    }

    private static String normalizeBaseUrl(String candidate)
    {
        String normalized = normalizeConfigValue(candidate);
        return normalized.isEmpty() ? CerebroCompanionConfig.DEFAULT_BASE_URL : normalized;
    }

    private static String normalizeConfigValue(String value)
    {
        return value == null ? "" : value.trim();
    }

    private static String summarize(RuntimeException error)
    {
        String message = error.getMessage();
        if (message == null || message.trim().isEmpty())
        {
            return error.getClass().getSimpleName();
        }
        return message.trim();
    }

    private static String resolvePluginVersion()
    {
        Package pluginPackage = CerebroCompanionPlugin.class.getPackage();
        if (pluginPackage != null)
        {
            String implementationVersion = pluginPackage.getImplementationVersion();
            if (implementationVersion != null && !implementationVersion.trim().isEmpty())
            {
                return implementationVersion.trim();
            }
        }
        return "0.1.0";
    }
}
