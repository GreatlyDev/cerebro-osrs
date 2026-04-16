package com.cerebro.companion.state;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

public class GearStateCollector
{
    private final List<String> ownedGear;
    private final Map<String, String> equippedGear;
    private final List<String> notableItems;

    public GearStateCollector()
    {
        this(List.of(), Map.of(), List.of());
    }

    public GearStateCollector(
        List<String> ownedGear,
        Map<String, String> equippedGear,
        List<String> notableItems
    )
    {
        this.ownedGear = ownedGear == null ? Collections.emptyList() : List.copyOf(ownedGear);
        this.equippedGear = equippedGear == null ? Collections.emptyMap() : new LinkedHashMap<>(equippedGear);
        this.notableItems = notableItems == null ? Collections.emptyList() : List.copyOf(notableItems);
    }

    public List<String> collectOwnedGear()
    {
        return normalizeList(ownedGear);
    }

    public Map<String, String> collectEquippedGear()
    {
        LinkedHashMap<String, String> normalized = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : equippedGear.entrySet())
        {
            String slot = normalize(entry.getKey());
            String item = normalize(entry.getValue());
            if (!slot.isEmpty() && !item.isEmpty())
            {
                normalized.put(slot, item);
            }
        }
        return Collections.unmodifiableMap(normalized);
    }

    public List<String> collectNotableItems()
    {
        return normalizeList(notableItems);
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
