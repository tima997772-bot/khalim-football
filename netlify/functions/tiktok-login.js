exports.handler = async () => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;

  const redirectUri =
    "https://imaginative-paprenjak-69aeb4.netlify.app/.netlify/functions/tiktok-callback";

  const scope = "user.info.basic";

  const state = crypto.randomUUID();

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
      Location: `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
    }
  };
};
