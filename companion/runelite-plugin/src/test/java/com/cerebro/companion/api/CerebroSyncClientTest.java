package com.cerebro.companion.api;

import java.net.http.HttpRequest;

import org.junit.jupiter.api.Test;

import com.cerebro.companion.api.CerebroModels.LinkExchangeRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
}
