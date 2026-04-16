package com.cerebro.companion;

import com.cerebro.companion.api.CerebroModels.LinkExchangeRequest;
import com.cerebro.companion.api.CerebroModels.LinkExchangeResponse;
import com.cerebro.companion.api.CerebroModels.SyncPayload;
import com.cerebro.companion.api.CerebroSyncClient;

import java.net.http.HttpRequest;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class CerebroCompanionPlugin
{
    private final CerebroCompanionConfig config;
    private final String pluginInstanceId;
    private final String pluginVersion;

    public CerebroCompanionPlugin()
    {
        this(new CerebroCompanionConfig(), UUID.randomUUID().toString(), "0.1.0");
    }

    public CerebroCompanionPlugin(
        CerebroCompanionConfig config,
        String pluginInstanceId,
        String pluginVersion
    )
    {
        this.config = config;
        this.pluginInstanceId = pluginInstanceId;
        this.pluginVersion = pluginVersion;
    }

    public CerebroCompanionConfig getConfig()
    {
        return config;
    }

    public CerebroSyncClient getSyncClient()
    {
        return new CerebroSyncClient(config.getBaseUrl());
    }

    public void beginLink(String linkToken)
    {
        config.setLinkToken(linkToken);
    }

    public boolean hasPendingLink()
    {
        return config.hasLinkToken();
    }

    public HttpRequest buildLinkExchangeRequest()
    {
        if (!config.hasLinkToken())
        {
            throw new IllegalStateException("A link token is required before exchanging for a sync secret.");
        }

        return getSyncClient().buildExchangeRequest(
            new LinkExchangeRequest(config.getLinkToken(), pluginInstanceId, pluginVersion)
        );
    }

    public void completeLink(LinkExchangeResponse response)
    {
        config.setSyncSecret(response.getSyncSecret());
    }

    public HttpRequest buildSyncRequest()
    {
        if (!config.isLinked())
        {
            throw new IllegalStateException("A sync secret is required before building a sync request.");
        }

        Map<String, Object> companionState = new LinkedHashMap<>();
        companionState.put("source", "runelite_companion");
        companionState.put("link_token_present", config.hasLinkToken());

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

        return getSyncClient().buildSyncRequest(config.getSyncSecret(), payload);
    }
}
