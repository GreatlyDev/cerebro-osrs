package com.cerebro.companion.state;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

public class UtilityStateCollector
{
    private final Map<String, Object> companionState;

    public UtilityStateCollector()
    {
        this(Map.of());
    }

    public UtilityStateCollector(Map<String, Object> companionState)
    {
        this.companionState = companionState == null ? Collections.emptyMap() : new LinkedHashMap<>(companionState);
    }

    public Map<String, Object> collectCompanionState()
    {
        LinkedHashMap<String, Object> normalized = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : companionState.entrySet())
        {
            String key = normalize(entry.getKey());
            Object value = normalizeValue(entry.getValue());
            if (!key.isEmpty() && value != null)
            {
                normalized.put(key, value);
            }
        }
        return Collections.unmodifiableMap(normalized);
    }

    private Object normalizeValue(Object value)
    {
        if (value instanceof String)
        {
            String normalized = normalize((String) value);
            return normalized.isEmpty() ? null : normalized;
        }
        return value;
    }

    private String normalize(String value)
    {
        return value == null ? "" : value.trim();
    }
}
