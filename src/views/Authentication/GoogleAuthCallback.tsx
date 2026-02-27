import { useEffect } from 'react';

/**
 * Lightweight callback page for Google OAuth.
 * Google redirects here with the access token in the URL hash.
 * Extracts the token and sends it to the opener window via postMessage.
 */
const GoogleAuthCallback = () => {
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const error = params.get('error');

    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'google-auth-callback',
          access_token: accessToken || null,
          error: error || (!accessToken ? 'No access token received' : null)
        },
        '*'
      );
      window.close();
    }
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Completing sign in...</p>
    </div>
  );
};

export default GoogleAuthCallback;
