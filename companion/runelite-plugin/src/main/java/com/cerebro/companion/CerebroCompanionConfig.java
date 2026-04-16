package com.cerebro.companion;

import net.runelite.client.config.Config;
import net.runelite.client.config.ConfigGroup;
import net.runelite.client.config.ConfigItem;

@ConfigGroup(CerebroCompanionConfig.GROUP)
public interface CerebroCompanionConfig extends Config
{
    String GROUP = "cerebrocompanion";
    String DEFAULT_BASE_URL = "http://127.0.0.1:8000";
    String BASE_URL_KEY = "baseUrl";
    String LINK_TOKEN_KEY = "linkToken";
    String SYNC_SECRET_KEY = "syncSecret";

    @ConfigItem(
        position = 0,
        keyName = BASE_URL_KEY,
        name = "Cerebro base URL",
        description = "Base URL for the Cerebro companion API"
    )
    default String baseUrl()
    {
        return DEFAULT_BASE_URL;
    }

    @ConfigItem(
        position = 1,
        keyName = LINK_TOKEN_KEY,
        name = "Pending link token",
        description = "One-time link token issued by Cerebro",
        hidden = true
    )
    default String linkToken()
    {
        return "";
    }

    @ConfigItem(
        position = 2,
        keyName = SYNC_SECRET_KEY,
        name = "Sync secret",
        description = "Scoped sync secret used for Cerebro sync requests",
        hidden = true,
        secret = true
    )
    default String syncSecret()
    {
        return "";
    }
}
