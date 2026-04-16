package com.cerebro.companion.state;

import com.cerebro.companion.api.CerebroModels.SyncPayload;

import java.util.LinkedHashMap;
import java.util.Map;

public class PayloadComposer
{
    private final QuestStateCollector questStateCollector;
    private final DiaryStateCollector diaryStateCollector;
    private final TravelStateCollector travelStateCollector;
    private final GearStateCollector gearStateCollector;
    private final UtilityStateCollector utilityStateCollector;

    public PayloadComposer()
    {
        this(
            new QuestStateCollector(),
            new DiaryStateCollector(),
            new TravelStateCollector(),
            new GearStateCollector(),
            new UtilityStateCollector()
        );
    }

    public PayloadComposer(
        QuestStateCollector questStateCollector,
        DiaryStateCollector diaryStateCollector,
        TravelStateCollector travelStateCollector,
        GearStateCollector gearStateCollector,
        UtilityStateCollector utilityStateCollector
    )
    {
        this.questStateCollector = questStateCollector;
        this.diaryStateCollector = diaryStateCollector;
        this.travelStateCollector = travelStateCollector;
        this.gearStateCollector = gearStateCollector;
        this.utilityStateCollector = utilityStateCollector;
    }

    public SyncPayload compose(String pluginInstanceId, String pluginVersion, boolean linkTokenPresent)
    {
        return compose(
            pluginInstanceId,
            pluginVersion,
            linkTokenPresent,
            questStateCollector,
            diaryStateCollector,
            travelStateCollector,
            gearStateCollector,
            utilityStateCollector
        );
    }

    public SyncPayload compose(
        String pluginInstanceId,
        String pluginVersion,
        boolean linkTokenPresent,
        QuestStateCollector questCollector,
        DiaryStateCollector diaryCollector,
        TravelStateCollector travelCollector,
        GearStateCollector gearCollector,
        UtilityStateCollector utilityCollector
    )
    {
        LinkedHashMap<String, Object> companionState = new LinkedHashMap<>();
        companionState.putAll(utilityCollector.collectCompanionState());
        companionState.put("source", "runelite_companion");
        companionState.put("link_token_present", linkTokenPresent);

        return new SyncPayload(
            pluginInstanceId,
            pluginVersion,
            questCollector.collectCompletedQuests(),
            diaryCollector.collectCompletedDiaries(),
            travelCollector.collectUnlockedTransports(),
            travelCollector.collectActiveUnlocks(),
            gearCollector.collectOwnedGear(),
            gearCollector.collectEquippedGear(),
            gearCollector.collectNotableItems(),
            companionState
        );
    }
}
