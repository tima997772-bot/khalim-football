const crypto = require("crypto");

exports.handler = async () => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;

  const redirectUri =
    "https://imaginative-paprenjak-69aeb4.netlify.app/.netlify/functions/tiktok-callback";

  const scope =
    "user.info.basic,user.info.stats,video.list,video.upload,video.publish";

  if (!clientKey) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "text/html; charset=UTF-8"
      },
      body: "<h1>Server configuration error</h1><p>TikTok Client Key is not configured.</p>"
    };
  }

  const state = crypto.randomBytes(32).toString("hex");

  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: "code",
    scope,
    redirect_uri: redirectUri,
    state
  });

  return {
    statusCode: 302,
    headers: {
      Location:
        `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`,
      "Set-Cookie":
        `tiktok_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
    }
  };
};
