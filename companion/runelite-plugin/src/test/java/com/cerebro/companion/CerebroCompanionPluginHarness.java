package com.cerebro.companion;

import net.runelite.client.RuneLite;
import net.runelite.client.externalplugins.ExternalPluginManager;
import net.runelite.client.plugins.Plugin;

public final class CerebroCompanionPluginHarness
{
    private CerebroCompanionPluginHarness()
    {
    }

    static Class<? extends Plugin> targetPlugin()
    {
        return CerebroCompanionPlugin.class;
    }

    public static void main(String[] args) throws Exception
    {
        ExternalPluginManager.loadBuiltin(targetPlugin());
        RuneLite.main(args);
    }
}
