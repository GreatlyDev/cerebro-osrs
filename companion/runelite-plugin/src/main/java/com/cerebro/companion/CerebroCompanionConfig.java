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
    String APPLY_LINK_CODE_KEY = "applyLinkCode";
    String SYNC_NOW_KEY = "syncNow";
    String DISCONNECT_KEY = "disconnect";
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
        description = "Paste the one-time link code issued by Cerebro, then click Apply link code"
    )
    default String linkToken()
    {
        return "";
    }

    @ConfigItem(
        position = 2,
        keyName = APPLY_LINK_CODE_KEY,
        name = "Apply link code",
        description = "Click after pasting a fresh Cerebro link code"
    )
    default boolean applyLinkCode()
    {
        return false;
    }

    @ConfigItem(
        position = 3,
        keyName = SYNC_NOW_KEY,
        name = "Sync now",
        description = "Runs a fresh Cerebro sync using the saved companion link"
    )
    default boolean syncNow()
    {
        return false;
    }

    @ConfigItem(
        position = 4,
        keyName = DISCONNECT_KEY,
        name = "Clear local link",
        description = "Clears this RuneLite client's saved Cerebro link. The website may still show the last successful sync."
    )
    default boolean disconnect()
    {
        return false;
    }

    @ConfigItem(
        position = 5,
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
        position = 6,
        keyName = LAST_SYNC_STATUS_KEY,
        name = "Last sync status",
        description = "Most recent Cerebro companion link or sync result"
    )
    default String lastSyncStatus()
    {
        return "";
    }

    @ConfigItem(
        position = 7,
        keyName = LAST_SYNC_AT_KEY,
        name = "Last sync time",
        description = "Timestamp for the most recent Cerebro companion link or sync attempt"
    )
    default String lastSyncAt()
    {
        return "";
    }
}
