package com.cerebro.companion;

public class CerebroCompanionConfig
{
    private String baseUrl = "http://127.0.0.1:8000";
    private String linkToken = "";
    private String syncSecret = "";

    public String getBaseUrl()
    {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl)
    {
        this.baseUrl = baseUrl == null ? "http://127.0.0.1:8000" : baseUrl.trim();
    }

    public String getLinkToken()
    {
        return linkToken;
    }

    public void setLinkToken(String linkToken)
    {
        this.linkToken = linkToken == null ? "" : linkToken.trim();
    }

    public String getSyncSecret()
    {
        return syncSecret;
    }

    public void setSyncSecret(String syncSecret)
    {
        this.syncSecret = syncSecret == null ? "" : syncSecret.trim();
    }

    public boolean hasLinkToken()
    {
        return !linkToken.isEmpty();
    }

    public boolean isLinked()
    {
        return !syncSecret.isEmpty();
    }
}
