// Token refresh utility for Google Calendar
// This function can be called from both client and server
export async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    // For client-side calls, ALWAYS use the API route since client secret can't be exposed
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/refresh-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[TokenRefresh] Failed to refresh token via API route:', {
            status: response.status,
            error: errorText
          });
          return null;
        }

        const data = await response.json();
        return data.access_token;
      } catch (error) {
        console.error('[TokenRefresh] Error calling refresh API route:', error);
        return null;
      }
    }

    // Server-side: can use client secret directly
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('[TokenRefresh] Missing Google OAuth credentials on server');
      return null;
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('[TokenRefresh] Failed to refresh token on server');
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('[TokenRefresh] Error refreshing token:', error);
    return null;
  }
}

