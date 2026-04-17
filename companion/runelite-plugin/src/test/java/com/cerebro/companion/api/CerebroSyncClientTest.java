package com.cerebro.companion.api;

import java.net.http.HttpRequest;
import java.net.http.HttpHeaders;
import java.net.http.HttpResponse;
import java.net.URI;
import java.util.Optional;
import javax.net.ssl.SSLSession;

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

    @Test
    void exchangeLinkParsesBackendResponse()
    {
        CerebroSyncClient client = new CerebroSyncClient(
            "http://127.0.0.1:8000",
            request -> new FakeHttpResponse(
                request,
                200,
                "{\"sync_secret\":\"secret-123\",\"account_id\":7,\"rsn\":\"Gilganor\",\"status\":\"linked\"}"
            )
        );

        var response = client.exchangeLink(new LinkExchangeRequest("token-123", "plugin-instance", "0.1.0"));

        assertEquals("secret-123", response.getSyncSecret());
        assertEquals(7, response.getAccountId());
        assertEquals("Gilganor", response.getRsn());
        assertEquals("linked", response.getStatus());
    }

    @Test
    void sendSyncPayloadRejectsNonOkResponse()
    {
        CerebroSyncClient client = new CerebroSyncClient(
            "http://127.0.0.1:8000",
            request -> new FakeHttpResponse(request, 500, "{\"detail\":\"boom\"}")
        );
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

        IllegalStateException error = assertThrows(
            IllegalStateException.class,
            () -> client.sendSyncPayload("sync-secret", payload)
        );

        assertEquals("Cerebro sync failed with status 500", error.getMessage());
    }

    private static final class FakeHttpResponse implements HttpResponse<String>
    {
        private final HttpRequest request;
        private final int status;
        private final String body;

        private FakeHttpResponse(HttpRequest request, int status, String body)
        {
            this.request = request;
            this.status = status;
            this.body = body;
        }

        @Override
        public int statusCode()
        {
            return status;
        }

        @Override
        public HttpRequest request()
        {
            return request;
        }

        @Override
        public Optional<HttpResponse<String>> previousResponse()
        {
            return Optional.empty();
        }

        @Override
        public HttpHeaders headers()
        {
            return HttpHeaders.of(java.util.Map.of(), (a, b) -> true);
        }

        @Override
        public String body()
        {
            return body;
        }

        @Override
        public Optional<SSLSession> sslSession()
        {
            return Optional.empty();
        }

        @Override
        public URI uri()
        {
            return request.uri();
        }

        @Override
        public java.net.http.HttpClient.Version version()
        {
            return java.net.http.HttpClient.Version.HTTP_1_1;
        }
    }
}
