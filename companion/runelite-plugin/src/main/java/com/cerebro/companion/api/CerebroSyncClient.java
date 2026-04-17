package com.cerebro.companion.api;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.cerebro.companion.api.CerebroModels.LinkExchangeRequest;
import static com.cerebro.companion.api.CerebroModels.LinkExchangeResponse;
import static com.cerebro.companion.api.CerebroModels.SyncPayload;

public class CerebroSyncClient
{
    @FunctionalInterface
    public interface RequestExecutor
    {
        HttpResponse<String> execute(HttpRequest request) throws IOException, InterruptedException;
    }

    private final String baseUrl;
    private final RequestExecutor requestExecutor;

    public CerebroSyncClient(String baseUrl)
    {
        this(baseUrl, request ->
        {
            HttpClient client = HttpClient.newHttpClient();
            return client.send(request, HttpResponse.BodyHandlers.ofString());
        });
    }

    public CerebroSyncClient(String baseUrl, RequestExecutor requestExecutor)
    {
        if (baseUrl == null || baseUrl.trim().isEmpty())
        {
            throw new IllegalArgumentException("baseUrl must not be blank");
        }
        this.baseUrl = stripTrailingSlash(baseUrl.trim());
        this.requestExecutor = Objects.requireNonNull(requestExecutor, "requestExecutor must not be null");
    }

    public HttpRequest buildExchangeRequest(LinkExchangeRequest request)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("link_token", request.getLinkToken());
        payload.put("plugin_instance_id", request.getPluginInstanceId());
        payload.put("plugin_version", request.getPluginVersion());

        return jsonPost("/api/companion/link", payload, Map.of());
    }

    public HttpRequest buildSyncRequest(String syncSecret, SyncPayload payload)
    {
        if (syncSecret == null || syncSecret.trim().isEmpty())
        {
            throw new IllegalArgumentException("syncSecret must not be blank");
        }
        if (payload == null)
        {
            throw new IllegalArgumentException("payload must not be null");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("plugin_instance_id", payload.getPluginInstanceId());
        body.put("plugin_version", payload.getPluginVersion());
        body.put("completed_quests", payload.getCompletedQuests());
        body.put("completed_diaries", payload.getCompletedDiaries());
        body.put("unlocked_transports", payload.getUnlockedTransports());
        body.put("active_unlocks", payload.getActiveUnlocks());
        body.put("owned_gear", payload.getOwnedGear());
        body.put("equipped_gear", payload.getEquippedGear());
        body.put("notable_items", payload.getNotableItems());
        body.put("companion_state", payload.getCompanionState());

        return jsonPost(
            "/api/companion/sync",
            body,
            Map.of("X-Cerebro-Sync-Secret", syncSecret.trim())
        );
    }

    public LinkExchangeResponse exchangeLink(LinkExchangeRequest request)
    {
        HttpRequest httpRequest = buildExchangeRequest(request);
        HttpResponse<String> response = execute(httpRequest, "Cerebro link exchange");
        if (response.statusCode() < 200 || response.statusCode() >= 300)
        {
            throw new IllegalStateException(
                "Cerebro link exchange failed with status " + response.statusCode()
            );
        }

        String body = response.body();
        return new LinkExchangeResponse(
            requireJsonString(body, "sync_secret"),
            requireJsonInt(body, "account_id"),
            requireJsonString(body, "rsn"),
            requireJsonString(body, "status")
        );
    }

    public void sendSyncPayload(String syncSecret, SyncPayload payload)
    {
        HttpRequest request = buildSyncRequest(syncSecret, payload);
        HttpResponse<String> response = execute(request, "Cerebro sync");
        if (response.statusCode() < 200 || response.statusCode() >= 300)
        {
            throw new IllegalStateException("Cerebro sync failed with status " + response.statusCode());
        }
    }

    public HttpRequest sendSyncRequest(String syncSecret, SyncPayload payload)
    {
        HttpRequest request = buildSyncRequest(syncSecret, payload);
        sendSyncPayload(syncSecret, payload);
        return request;
    }

    private HttpResponse<String> execute(HttpRequest request, String action)
    {
        try
        {
            return requestExecutor.execute(request);
        }
        catch (IOException | InterruptedException error)
        {
            if (error instanceof InterruptedException)
            {
                Thread.currentThread().interrupt();
            }
            throw new IllegalStateException(action + " request failed", error);
        }
    }

    private String requireJsonString(String body, String fieldName)
    {
        Pattern pattern = Pattern.compile("\"" + Pattern.quote(fieldName) + "\"\\s*:\\s*\"([^\"]*)\"");
        Matcher matcher = pattern.matcher(body);
        if (!matcher.find())
        {
            throw new IllegalStateException("Cerebro response missing " + fieldName);
        }
        return matcher.group(1);
    }

    private int requireJsonInt(String body, String fieldName)
    {
        Pattern pattern = Pattern.compile("\"" + Pattern.quote(fieldName) + "\"\\s*:\\s*(\\d+)");
        Matcher matcher = pattern.matcher(body);
        if (!matcher.find())
        {
            throw new IllegalStateException("Cerebro response missing " + fieldName);
        }
        return Integer.parseInt(matcher.group(1));
    }

    private HttpRequest jsonPost(String path, Map<String, Object> payload, Map<String, String> headers)
    {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + path))
            .header("Content-Type", "application/json");

        for (Map.Entry<String, String> header : headers.entrySet())
        {
            builder.header(header.getKey(), header.getValue());
        }

        return builder
            .POST(HttpRequest.BodyPublishers.ofString(toJson(payload)))
            .build();
    }

    private String toJson(Object value)
    {
        if (value == null)
        {
            return "null";
        }
        if (value instanceof String)
        {
            return '"' + escapeJson((String) value) + '"';
        }
        if (value instanceof Number || value instanceof Boolean)
        {
            return String.valueOf(value);
        }
        if (value instanceof Map<?, ?>)
        {
            List<String> pairs = new ArrayList<>();
            for (Map.Entry<?, ?> entry : ((Map<?, ?>) value).entrySet())
            {
                pairs.add(
                    toJson(String.valueOf(entry.getKey())) + ":" + toJson(entry.getValue())
                );
            }
            return "{" + String.join(",", pairs) + "}";
        }
        if (value instanceof Iterable<?>)
        {
            List<String> items = new ArrayList<>();
            for (Object item : (Iterable<?>) value)
            {
                items.add(toJson(item));
            }
            return "[" + String.join(",", items) + "]";
        }
        return toJson(String.valueOf(value));
    }

    private String escapeJson(String value)
    {
        return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\r", "\\r")
            .replace("\n", "\\n")
            .replace("\t", "\\t");
    }

    private String stripTrailingSlash(String candidate)
    {
        if (candidate.endsWith("/"))
        {
            return candidate.substring(0, candidate.length() - 1);
        }
        return candidate;
    }
}
