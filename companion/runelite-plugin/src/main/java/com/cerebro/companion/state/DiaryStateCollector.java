package com.cerebro.companion.state;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

public class DiaryStateCollector
{
    private final Map<String, List<String>> completedDiaries;

    public DiaryStateCollector()
    {
        this(Map.of());
    }

    public DiaryStateCollector(Map<String, List<String>> completedDiaries)
    {
        this.completedDiaries = completedDiaries == null
            ? Collections.emptyMap()
            : new LinkedHashMap<>(completedDiaries);
    }

    public Map<String, List<String>> collectCompletedDiaries()
    {
        LinkedHashMap<String, List<String>> normalized = new LinkedHashMap<>();
        for (Map.Entry<String, List<String>> entry : completedDiaries.entrySet())
        {
            String region = normalize(entry.getKey());
            if (region.isEmpty())
            {
                continue;
            }

            LinkedHashSet<String> tiers = new LinkedHashSet<>();
            for (String tier : entry.getValue() == null ? List.<String>of() : entry.getValue())
            {
                String normalizedTier = normalize(tier);
                if (!normalizedTier.isEmpty())
                {
                    tiers.add(normalizedTier);
                }
            }

            if (!tiers.isEmpty())
            {
                normalized.put(region, List.copyOf(tiers));
            }
        }
        return Collections.unmodifiableMap(normalized);
    }

    private String normalize(String value)
    {
        return value == null ? "" : value.trim();
    }
}
