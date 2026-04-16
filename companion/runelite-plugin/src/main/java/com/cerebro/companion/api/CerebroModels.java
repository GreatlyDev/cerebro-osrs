package com.cerebro.companion.api;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public final class CerebroModels
{
    private CerebroModels()
    {
    }

    public static final class LinkExchangeRequest
    {
        private final String linkToken;
        private final String pluginInstanceId;
        private final String pluginVersion;

        public LinkExchangeRequest(String linkToken, String pluginInstanceId, String pluginVersion)
        {
            this.linkToken = requireValue("linkToken", linkToken);
            this.pluginInstanceId = requireValue("pluginInstanceId", pluginInstanceId);
            this.pluginVersion = requireValue("pluginVersion", pluginVersion);
        }

        public String getLinkToken()
        {
            return linkToken;
        }

        public String getPluginInstanceId()
        {
            return pluginInstanceId;
        }

        public String getPluginVersion()
        {
            return pluginVersion;
        }
    }

    public static final class LinkExchangeResponse
    {
        private final String syncSecret;
        private final int accountId;
        private final String rsn;
        private final String status;

        public LinkExchangeResponse(String syncSecret, int accountId, String rsn, String status)
        {
            this.syncSecret = requireValue("syncSecret", syncSecret);
            this.accountId = accountId;
            this.rsn = requireValue("rsn", rsn);
            this.status = requireValue("status", status);
        }

        public String getSyncSecret()
        {
            return syncSecret;
        }

        public int getAccountId()
        {
            return accountId;
        }

        public String getRsn()
        {
            return rsn;
        }

        public String getStatus()
        {
            return status;
        }
    }

    public static final class SyncPayload
    {
        private final String pluginInstanceId;
        private final String pluginVersion;
        private final List<String> completedQuests;
        private final Map<String, List<String>> completedDiaries;
        private final List<String> unlockedTransports;
        private final List<String> activeUnlocks;
        private final List<String> ownedGear;
        private final Map<String, String> equippedGear;
        private final List<String> notableItems;
        private final Map<String, Object> companionState;

        public SyncPayload(
            String pluginInstanceId,
            String pluginVersion,
            List<String> completedQuests,
            Map<String, List<String>> completedDiaries,
            List<String> unlockedTransports,
            List<String> activeUnlocks,
            List<String> ownedGear,
            Map<String, String> equippedGear,
            List<String> notableItems,
            Map<String, Object> companionState
        )
        {
            this.pluginInstanceId = requireValue("pluginInstanceId", pluginInstanceId);
            this.pluginVersion = requireValue("pluginVersion", pluginVersion);
            this.completedQuests = immutableList(completedQuests);
            this.completedDiaries = immutableNestedMap(completedDiaries);
            this.unlockedTransports = immutableList(unlockedTransports);
            this.activeUnlocks = immutableList(activeUnlocks);
            this.ownedGear = immutableList(ownedGear);
            this.equippedGear = immutableStringMap(equippedGear);
            this.notableItems = immutableList(notableItems);
            this.companionState = companionState == null ? Collections.emptyMap() : Collections.unmodifiableMap(companionState);
        }

        public String getPluginInstanceId()
        {
            return pluginInstanceId;
        }

        public String getPluginVersion()
        {
            return pluginVersion;
        }

        public List<String> getCompletedQuests()
        {
            return completedQuests;
        }

        public Map<String, List<String>> getCompletedDiaries()
        {
            return completedDiaries;
        }

        public List<String> getUnlockedTransports()
        {
            return unlockedTransports;
        }

        public List<String> getActiveUnlocks()
        {
            return activeUnlocks;
        }

        public List<String> getOwnedGear()
        {
            return ownedGear;
        }

        public Map<String, String> getEquippedGear()
        {
            return equippedGear;
        }

        public List<String> getNotableItems()
        {
            return notableItems;
        }

        public Map<String, Object> getCompanionState()
        {
            return companionState;
        }
    }

    private static String requireValue(String name, String value)
    {
        Objects.requireNonNull(value, name + " must not be null");
        String normalized = value.trim();
        if (normalized.isEmpty())
        {
            throw new IllegalArgumentException(name + " must not be blank");
        }
        return normalized;
    }

    private static List<String> immutableList(List<String> values)
    {
        return values == null ? Collections.emptyList() : List.copyOf(values);
    }

    private static Map<String, String> immutableStringMap(Map<String, String> values)
    {
        return values == null ? Collections.emptyMap() : Map.copyOf(values);
    }

    private static Map<String, List<String>> immutableNestedMap(Map<String, List<String>> values)
    {
        if (values == null)
        {
            return Collections.emptyMap();
        }

        java.util.LinkedHashMap<String, List<String>> normalized = new java.util.LinkedHashMap<>();
        for (Map.Entry<String, List<String>> entry : values.entrySet())
        {
            normalized.put(entry.getKey(), immutableList(entry.getValue()));
        }
        return Collections.unmodifiableMap(normalized);
    }
}
