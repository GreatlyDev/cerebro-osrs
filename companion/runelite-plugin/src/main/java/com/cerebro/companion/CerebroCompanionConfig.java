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
    String LAST_SYNC_STATUS_KEY = "lastSyncStatus";
    String LAST_SYNC_AT_KEY = "lastSyncAt";

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
        name = "Link code",
        description = "Paste the one-time link code issued by Cerebro to connect this RuneLite client"
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
        hidden = true
    )
    default String syncSecret()
    {
        return "";
    }

    @ConfigItem(
        position = 3,
        keyName = LAST_SYNC_STATUS_KEY,
        name = "Last sync status",
        description = "Most recent Cerebro companion link or sync result"
    )
    default String lastSyncStatus()
    {
        return "";
    }

    @ConfigItem(
        position = 4,
        keyName = LAST_SYNC_AT_KEY,
        name = "Last sync time",
        description = "Timestamp for the most recent Cerebro companion link or sync attempt"
    )
    default String lastSyncAt()
    {
        return "";
    }
}
