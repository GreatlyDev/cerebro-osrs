package com.cerebro.companion;

import com.cerebro.companion.api.CerebroModels.LinkExchangeResponse;
import com.google.inject.Provides;

import java.io.ByteArrayOutputStream;
import java.lang.reflect.Method;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.net.http.HttpRequest;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import net.runelite.client.config.Config;
import net.runelite.client.config.ConfigManager;
import net.runelite.client.plugins.Plugin;
import net.runelite.client.plugins.PluginDescriptor;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

class CerebroCompanionPluginTest
{
    @Test
    void linkLifecycleUsesPersistedConfigAndClearsOneTimeToken() throws Exception
    {
        AtomicReference<String> baseUrl = new AtomicReference<>("http://127.0.0.1:8000");
        AtomicReference<String> linkToken = new AtomicReference<>("");
        AtomicReference<String> syncSecret = new AtomicReference<>("");

        CerebroCompanionConfig config = new TestConfig(baseUrl, linkToken, syncSecret);
        CerebroCompanionPlugin plugin = new CerebroCompanionPlugin(
            config,
            "plugin-123",
            "0.1.0",
            (key, value) ->
            {
                if (CerebroCompanionConfig.BASE_URL_KEY.equals(key))
                {
                    baseUrl.set(value);
                }
                if (CerebroCompanionConfig.LINK_TOKEN_KEY.equals(key))
                {
                    linkToken.set(value);
                }
                if (CerebroCompanionConfig.SYNC_SECRET_KEY.equals(key))
                {
                    syncSecret.set(value);
                }
            },
            key ->
            {
                if (CerebroCompanionConfig.LINK_TOKEN_KEY.equals(key))
                {
                    linkToken.set("");
                }
                if (CerebroCompanionConfig.SYNC_SECRET_KEY.equals(key))
                {
                    syncSecret.set("");
                }
            }
        );

        assertTrue(Plugin.class.isAssignableFrom(CerebroCompanionPlugin.class));
        PluginDescriptor descriptor = CerebroCompanionPlugin.class.getAnnotation(PluginDescriptor.class);
        assertNotNull(descriptor);
        assertEquals("Cerebro Companion", descriptor.name());
        assertEquals(CerebroCompanionConfig.GROUP, descriptor.configName());

        plugin.beginLink("token-123");
        assertTrue(plugin.hasPendingLink());
        assertEquals("token-123", linkToken.get());

        HttpRequest exchangeRequest = plugin.buildLinkExchangeRequest();
        assertEquals("http://127.0.0.1:8000/api/companion/link", exchangeRequest.uri().toString());

        plugin.completeLink(new LinkExchangeResponse("secret-456", 7, "Gilganor", "linked"));

        assertFalse(plugin.hasPendingLink());
        assertEquals("", linkToken.get());
        assertEquals("secret-456", syncSecret.get());

        HttpRequest syncRequest = plugin.buildSyncRequest();
        assertEquals("secret-456", syncRequest.headers().firstValue("X-Cerebro-Sync-Secret").orElseThrow());
        String syncPayload = readRequestBody(syncRequest);
        assertTrue(syncPayload.contains("\"link_token_present\":false"));
        assertFalse(syncPayload.contains("\"link_token_present\":true"));
    }

    @Test
    void providesRuneLiteConfigThroughConfigManagerMethod() throws Exception
    {
        Method provideConfig = CerebroCompanionPlugin.class.getDeclaredMethod(
            "provideConfig",
            ConfigManager.class
        );

        assertNotNull(provideConfig.getAnnotation(Provides.class));
        assertEquals(CerebroCompanionConfig.class, provideConfig.getReturnType());
        assertTrue(Config.class.isAssignableFrom(provideConfig.getReturnType()));
    }

    private String readRequestBody(HttpRequest request) throws Exception
    {
        HttpRequest.BodyPublisher publisher = request.bodyPublisher().orElseThrow();
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        AtomicReference<Throwable> failure = new AtomicReference<>();
        CountDownLatch complete = new CountDownLatch(1);

        publisher.subscribe(new Flow.Subscriber<>()
        {
            @Override
            public void onSubscribe(Flow.Subscription subscription)
            {
                subscription.request(Long.MAX_VALUE);
            }

            @Override
            public void onNext(ByteBuffer item)
            {
                byte[] bytes = new byte[item.remaining()];
                item.get(bytes);
                output.write(bytes, 0, bytes.length);
            }

            @Override
            public void onError(Throwable throwable)
            {
                failure.set(throwable);
                complete.countDown();
            }

            @Override
            public void onComplete()
            {
                complete.countDown();
            }
        });

        assertTrue(complete.await(1, TimeUnit.SECONDS), "body publisher did not complete");
        if (failure.get() != null)
        {
            fail(failure.get());
        }

        return output.toString(StandardCharsets.UTF_8);
    }

    private static final class TestConfig implements CerebroCompanionConfig
    {
        private final AtomicReference<String> baseUrl;
        private final AtomicReference<String> linkToken;
        private final AtomicReference<String> syncSecret;

        private TestConfig(
            AtomicReference<String> baseUrl,
            AtomicReference<String> linkToken,
            AtomicReference<String> syncSecret
        )
        {
            this.baseUrl = baseUrl;
            this.linkToken = linkToken;
            this.syncSecret = syncSecret;
        }

        @Override
        public String baseUrl()
        {
            return baseUrl.get();
        }

        @Override
        public String linkToken()
        {
            return linkToken.get();
        }

        @Override
        public String syncSecret()
        {
            return syncSecret.get();
        }
    }
}
