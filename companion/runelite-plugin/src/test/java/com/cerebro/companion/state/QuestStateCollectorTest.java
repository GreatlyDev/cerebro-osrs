package com.cerebro.companion.state;

import java.lang.reflect.Proxy;
import java.util.List;

import net.runelite.api.Client;
import net.runelite.api.Quest;
import net.runelite.api.QuestState;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class QuestStateCollectorTest
{
    @Test
    void collectsFinishedQuestNamesFromRuneLiteQuestState()
    {
        Client client = (Client) Proxy.newProxyInstance(
            Client.class.getClassLoader(),
            new Class<?>[]{Client.class},
            (proxy, method, args) ->
            {
                throw new UnsupportedOperationException("Client methods should not be invoked directly in this test.");
            }
        );
        Quest[] sampleQuests = {Quest.values()[0], Quest.values()[1], Quest.values()[2]};
        QuestStateCollector collector = new QuestStateCollector(
            client,
            sampleQuests,
            (quest, ignoredClient) ->
            {
                if (quest == sampleQuests[0] || quest == sampleQuests[2])
                {
                    return QuestState.FINISHED;
                }
                return QuestState.NOT_STARTED;
            }
        );

        assertEquals(
            List.of(sampleQuests[0].getName(), sampleQuests[2].getName()),
            collector.collectCompletedQuests()
        );
    }

    @Test
    void placeholderCollectorReportsThatItNeedsRealRuneLiteState()
    {
        QuestStateCollector collector = new QuestStateCollector();

        assertTrue(collector.isPlaceholderCollector());
        assertEquals(List.of(), collector.collectCompletedQuests());
    }

    @Test
    void seededCollectorStillSupportsDeterministicTestData()
    {
        QuestStateCollector collector = new QuestStateCollector(List.of("Dragon Slayer I", "Dragon Slayer I", " "));

        assertFalse(collector.isPlaceholderCollector());
        assertEquals(List.of("Dragon Slayer I"), collector.collectCompletedQuests());
    }
}
