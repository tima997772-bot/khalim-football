const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};

  // TikTok returned an authorization error
  if (params.error) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "text/html; charset=UTF-8"
      },
      body: `<h1>TikTok authorization error</h1><p>${params.error}</p>`
    };
  }

  // Authorization code is required
  if (!params.code) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "text/html; charset=UTF-8"
      },
      body:
        "<h1>TikTok OAuth callback</h1><p>Authorization code was not provided.</p>"
    };
  }

  // Read OAuth state from cookie
  const cookies = event.headers.cookie || event.headers.Cookie || "";

  const stateCookie = cookies
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("tiktok_oauth_state="));

  const savedState = stateCookie
    ? decodeURIComponent(
        stateCookie.substring("tiktok_oauth_state=".length)
      )
    : null;

  // Protect against forged OAuth callbacks
  if (!params.state || !savedState || params.state !== savedState) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "text/html; charset=UTF-8"
      },
      body: "<h1>OAuth security error</h1><p>Invalid OAuth state.</p>"
    };
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  const redirectUri =
    "https://imaginative-paprenjak-69aeb4.netlify.app/.netlify/functions/tiktok-callback";

  // Check TikTok credentials
  if (!clientKey || !clientSecret) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "text/html; charset=UTF-8"
      },
      body:
        "<h1>Server configuration error</h1><p>TikTok credentials are not configured.</p>"
    };
  }

  try {
    // Exchange TikTok authorization code for tokens
    const body = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code: params.code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    });

    const response = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cache-Control": "no-cache"
        },
        body: body.toString()
      }
    );

    const data = await response.json();

    // TikTok token exchange failed
    if (!response.ok || data.error) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "text/html; charset=UTF-8"
        },
        body: `
          <h1>TikTok token exchange error</h1>
          <p>${data.error || "unknown_error"}</p>
          <p>${data.error_description || "Token exchange failed."}</p>
        `
      };
    }

    // Open Netlify Blobs store using the current Netlify site
    // and the server-side Netlify Personal Access Token.
    const store = getStore("tiktok-tokens", {
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });

    // Store TikTok credentials securely on the server.
    await store.setJSON(`user-${data.open_id}`, {
      open_id: data.open_id,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      refresh_expires_in: data.refresh_expires_in,
      scope: data.scope,
      saved_at: new Date().toISOString()
    });

    // Delete the temporary OAuth state cookie.
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Set-Cookie":
          "tiktok_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
      },
      body: `
        <h1>Авторизация TikTok успешна</h1>
        <p>Аккаунт успешно подключён.</p>
        <p>Open ID сохранён: да</p>
        <p>Токены сохранены на сервере: да</p>
        <p>Токены не отображаются на этой странице.</p>
      `
    };
  } catch (error) {
    console.error("Token storage error:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "text/html; charset=UTF-8"
      },
      body: `
        <h1>Server error</h1>
        <p>Token storage failed.</p>
        <p>${error.message || "Unknown error"}</p>
      `
    };
  }
};
