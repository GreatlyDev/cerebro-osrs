package com.cerebro.companion.state;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;

public class TravelStateCollector
{
    private final List<String> unlockedTransports;
    private final List<String> activeUnlocks;

    public TravelStateCollector()
    {
        this(List.of(), List.of());
    }

    public TravelStateCollector(List<String> unlockedTransports, List<String> activeUnlocks)
    {
        this.unlockedTransports = unlockedTransports == null
            ? Collections.emptyList()
            : List.copyOf(unlockedTransports);
        this.activeUnlocks = activeUnlocks == null ? Collections.emptyList() : List.copyOf(activeUnlocks);
    }

    public List<String> collectUnlockedTransports()
    {
        return normalizeList(unlockedTransports);
    }

    public List<String> collectActiveUnlocks()
    {
        return normalizeList(activeUnlocks);
    }

    private List<String> normalizeList(List<String> values)
    {
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String value : values)
        {
            String candidate = normalize(value);
            if (!candidate.isEmpty())
            {
                normalized.add(candidate);
            }
        }
        return List.copyOf(normalized);
    }

    private String normalize(String value)
    {
        return value == null ? "" : value.trim();
    }
}
