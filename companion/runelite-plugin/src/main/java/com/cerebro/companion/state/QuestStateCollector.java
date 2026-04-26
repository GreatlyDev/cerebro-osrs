package com.cerebro.companion.state;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.function.BiFunction;

import net.runelite.api.Client;
import net.runelite.api.Quest;
import net.runelite.api.QuestState;

public class QuestStateCollector
{
    private final List<String> completedQuests;
    private final Client client;
    private final Quest[] questCatalog;
    private final BiFunction<Quest, Client, QuestState> questStateReader;

    public QuestStateCollector()
    {
        this(List.of());
    }

    public QuestStateCollector(List<String> completedQuests)
    {
        this.completedQuests = completedQuests == null ? Collections.emptyList() : List.copyOf(completedQuests);
        this.client = null;
        this.questCatalog = new Quest[0];
        this.questStateReader = null;
    }

    public QuestStateCollector(Client client)
    {
        this(
            Objects.requireNonNull(client, "client must not be null"),
            Quest.values(),
            Quest::getState
        );
    }

    QuestStateCollector(
        Client client,
        Quest[] questCatalog,
        BiFunction<Quest, Client, QuestState> questStateReader
    )
    {
        this.completedQuests = Collections.emptyList();
        this.client = Objects.requireNonNull(client, "client must not be null");
        this.questCatalog = questCatalog == null ? new Quest[0] : questCatalog.clone();
        this.questStateReader = Objects.requireNonNull(questStateReader, "questStateReader must not be null");
    }

    public List<String> collectCompletedQuests()
    {
        if (client != null)
        {
            LinkedHashSet<String> normalized = new LinkedHashSet<>();
            for (Quest quest : questCatalog)
            {
                if (quest == null)
                {
                    continue;
                }

                QuestState state = questStateReader.apply(quest, client);
                if (state == QuestState.FINISHED)
                {
                    String candidate = normalize(quest.getName());
                    if (!candidate.isEmpty())
                    {
                        normalized.add(candidate);
                    }
                }
            }
            return List.copyOf(normalized);
        }

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

    public boolean isPlaceholderCollector()
    {
        return client == null && completedQuests.isEmpty();
    }

    private String normalize(String value)
    {
        return value == null ? "" : value.trim();
    }
}
