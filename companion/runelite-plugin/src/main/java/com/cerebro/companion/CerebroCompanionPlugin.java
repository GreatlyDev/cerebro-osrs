package com.cerebro.companion;

import com.cerebro.companion.api.CerebroModels.LinkExchangeRequest;
import com.cerebro.companion.api.CerebroModels.LinkExchangeResponse;
import com.cerebro.companion.api.CerebroModels.SyncPayload;
import com.cerebro.companion.api.CerebroSyncClient;
import com.google.inject.Provides;

import java.net.http.HttpRequest;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import java.util.function.Function;
import javax.inject.Inject;

import net.runelite.client.config.ConfigManager;
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

    @Inject
    private ConfigManager configManager;

    @Inject
    private CerebroCompanionConfig config;

    public CerebroCompanionPlugin()
    {
        this(UUID.randomUUID().toString(), resolvePluginVersion(), CerebroSyncClient::new, null, null);
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
            (key, value) -> configManager.setConfiguration(CerebroCompanionConfig.GROUP, key, value),
            key -> configManager.unsetConfiguration(CerebroCompanionConfig.GROUP, key)
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
            pluginInstanceId,
            pluginVersion,
            CerebroSyncClient::new,
            Objects.requireNonNull(configWriter, "configWriter must not be null"),
            Objects.requireNonNull(configRemover, "configRemover must not be null")
        );
        this.config = Objects.requireNonNull(config, "config must not be null");
    }

    private CerebroCompanionPlugin(
        String pluginInstanceId,
        String pluginVersion,
        Function<String, CerebroSyncClient> syncClientFactory,
        BiConsumer<String, String> configWriter,
        Consumer<String> configRemover
    )
    {
        this.pluginInstanceId = requireValue("pluginInstanceId", pluginInstanceId);
        this.pluginVersion = requireValue("pluginVersion", pluginVersion);
        this.syncClientFactory = Objects.requireNonNull(syncClientFactory, "syncClientFactory must not be null");
        this.configWriter = configWriter;
        this.configRemover = configRemover;
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
    }

    public HttpRequest buildSyncRequest()
    {
        String syncSecret = normalizeConfigValue(requireConfig().syncSecret());
        if (syncSecret.isEmpty())
        {
            throw new IllegalStateException("A sync secret is required before building a sync request.");
        }

        Map<String, Object> companionState = new LinkedHashMap<>();
        companionState.put("source", "runelite_companion");
        companionState.put("link_token_present", hasPendingLink());

        SyncPayload payload = new SyncPayload(
            pluginInstanceId,
            pluginVersion,
            List.of(),
            Map.of(),
            List.of(),
            List.of(),
            List.of(),
            Map.of(),
            List.of(),
            companionState
        );

        return getSyncClient().buildSyncRequest(syncSecret, payload);
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
