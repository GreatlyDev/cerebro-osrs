package com.cerebro.companion.state;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;

public class QuestStateCollector
{
    private final List<String> completedQuests;

    public QuestStateCollector()
    {
        this(List.of());
    }

    public QuestStateCollector(List<String> completedQuests)
    {
        this.completedQuests = completedQuests == null ? Collections.emptyList() : List.copyOf(completedQuests);
    }

    public List<String> collectCompletedQuests()
    {
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String quest : completedQuests)
        {
            String candidate = normalize(quest);
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
