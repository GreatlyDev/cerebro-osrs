package com.cerebro.companion.api;

import java.net.http.HttpRequest;

import org.junit.jupiter.api.Test;

import com.cerebro.companion.api.CerebroModels.LinkExchangeRequest;
import com.cerebro.companion.api.CerebroModels.SyncPayload;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CerebroSyncClientTest
{
    @Test
    void buildLinkRequestTargetsCompanionLinkEndpoint()
    {
        CerebroSyncClient client = new CerebroSyncClient("http://127.0.0.1:8000");
        HttpRequest request = client.buildExchangeRequest(
            new LinkExchangeRequest("token-123", "plugin-instance", "0.1.0")
        );

        assertEquals("http://127.0.0.1:8000/api/companion/link", request.uri().toString());
        assertEquals("POST", request.method());
        assertEquals("application/json", request.headers().firstValue("Content-Type").orElseThrow());
    }

    @Test
    void constructorRejectsBlankBaseUrl()
    {
        IllegalArgumentException error = assertThrows(
            IllegalArgumentException.class,
            () -> new CerebroSyncClient(" ")
        );

        assertEquals("baseUrl must not be blank", error.getMessage());
    }

    @Test
    void buildSyncRequestRejectsNullPayload()
    {
        CerebroSyncClient client = new CerebroSyncClient("http://127.0.0.1:8000");

        IllegalArgumentException error = assertThrows(
            IllegalArgumentException.class,
            () -> client.buildSyncRequest("sync-secret", null)
        );

        assertEquals("payload must not be null", error.getMessage());
    }

    @Test
    void buildSyncRequestTargetsCompanionSyncEndpoint()
    {
        CerebroSyncClient client = new CerebroSyncClient("http://127.0.0.1:8000");
        SyncPayload payload = new SyncPayload(
            "plugin-instance",
            "0.1.0",
            java.util.List.of(),
            java.util.Map.of(),
            java.util.List.of(),
            java.util.List.of(),
            java.util.List.of(),
            java.util.Map.of(),
            java.util.List.of(),
            java.util.Map.of("source", "runelite")
        );

        HttpRequest request = client.buildSyncRequest("sync-secret", payload);

        assertEquals("http://127.0.0.1:8000/api/companion/sync", request.uri().toString());
        assertEquals("sync-secret", request.headers().firstValue("X-Cerebro-Sync-Secret").orElseThrow());
    }
}
