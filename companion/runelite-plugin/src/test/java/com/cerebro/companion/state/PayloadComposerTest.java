package com.cerebro.companion.state;

import com.cerebro.companion.api.CerebroModels.SyncPayload;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PayloadComposerTest
{
    @Test
    void composeIncludesBroadAccountStateAcrossCollectors()
    {
        LinkedHashMap<String, List<String>> diaries = new LinkedHashMap<>();
        diaries.put("desert", List.of("easy", "hard", "easy", " "));
        diaries.put("varrock", List.of("medium"));

        LinkedHashMap<String, String> equippedGear = new LinkedHashMap<>();
        equippedGear.put("weapon", "abyssal_whip");
        equippedGear.put("cape", "fire_cape");
        equippedGear.put("ring", " ");

        LinkedHashMap<String, Object> companionState = new LinkedHashMap<>();
        companionState.put("account_type", "main");
        companionState.put("bank_tabs", 9);
        companionState.put("notes_enabled", true);
        companionState.put("empty_value", " ");
        companionState.put("source", "fake_source");
        companionState.put("link_token_present", false);

        PayloadComposer composer = new PayloadComposer(
            new QuestStateCollector(List.of("Dragon Slayer I", "", "Recipe for Disaster", "Dragon Slayer I ")),
            new DiaryStateCollector(diaries),
            new TravelStateCollector(
                List.of("spirit_tree_gnome", "fairy_ring_zanaris", "spirit_tree_gnome"),
                List.of("spellbook:lunar", "", "tool_leprechaun_access")
            ),
            new GearStateCollector(
                List.of("dragon_scimitar", "fire_cape", "dragon_scimitar"),
                equippedGear,
                List.of("graceful_set", "", "seed_box")
            ),
            new UtilityStateCollector(companionState)
        );

        SyncPayload payload = composer.compose("plugin-123", "0.1.0", true);

        assertEquals(List.of("Dragon Slayer I", "Recipe for Disaster"), payload.getCompletedQuests());
        assertEquals(List.of("easy", "hard"), payload.getCompletedDiaries().get("desert"));
        assertEquals(List.of("medium"), payload.getCompletedDiaries().get("varrock"));
        assertEquals(List.of("spirit_tree_gnome", "fairy_ring_zanaris"), payload.getUnlockedTransports());
        assertEquals(List.of("spellbook:lunar", "tool_leprechaun_access"), payload.getActiveUnlocks());
        assertEquals(List.of("dragon_scimitar", "fire_cape"), payload.getOwnedGear());
        assertEquals("abyssal_whip", payload.getEquippedGear().get("weapon"));
        assertEquals("fire_cape", payload.getEquippedGear().get("cape"));
        assertEquals(List.of("graceful_set", "seed_box"), payload.getNotableItems());
        assertEquals("runelite_companion", payload.getCompanionState().get("source"));
        assertEquals(true, payload.getCompanionState().get("link_token_present"));
        assertEquals("main", payload.getCompanionState().get("account_type"));
        assertEquals(9, payload.getCompanionState().get("bank_tabs"));
        assertEquals(true, payload.getCompanionState().get("notes_enabled"));
        assertTrue(payload.getCompanionState().containsKey("account_type"));
    }
}
