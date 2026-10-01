const crypto = require("crypto");

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};

  if (params.error) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/html; charset=UTF-8" },
      body: `<h1>TikTok authorization error</h1><p>${params.error}</p>`
    };
  }

  if (!params.code) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/html; charset=UTF-8" },
      body: "<h1>TikTok OAuth callback</h1><p>Authorization code was not provided.</p>"
    };
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  const redirectUri =
    "https://imaginative-paprenjak-69aeb4.netlify.app/.netlify/functions/tiktok-callback";

  if (!clientKey || !clientSecret) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/html; charset=UTF-8" },
      body: "<h1>Server configuration error</h1><p>TikTok credentials are not configured.</p>"
    };
  }

  try {
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

    if (!response.ok || data.error) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "text/html; charset=UTF-8" },
        body: `
          <h1>TikTok token exchange error</h1>
          <p>${data.error || "unknown_error"}</p>
          <p>${data.error_description || data.error_description || "Token exchange failed."}</p>
        `
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html; charset=UTF-8" },
      body: `
        <h1>Авторизация TikTok успешна</h1>
        <p>OAuth code успешно обменян на токены.</p>
        <p>Open ID получен: ${data.open_id ? "да" : "нет"}</p>
        <p>Access token получен: ${data.access_token ? "да" : "нет"}</p>
        <p>Refresh token получен: ${data.refresh_token ? "да" : "нет"}</p>
        <p>Токены не отображаются на этой странице.</p>
      `
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/html; charset=UTF-8" },
      body: `<h1>Server error</h1><p>${error.message}</p>`
    };
  }
};
