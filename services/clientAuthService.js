// Client-side authentication service
// This handles session management in the browser without server-only dependencies

export const clientAuthService = {
  // Get session from localStorage
  getSession: () => {
    try {
      if (typeof window === 'undefined') return { data: { session: null } };
      
      const sessionData = localStorage.getItem('aws_cognito_session');
      if (!sessionData) return { data: { session: null } };
      
      const session = JSON.parse(sessionData);
      
      // Check if session is expired
      if (session.expires_at && new Date(session.expires_at) < new Date()) {
        localStorage.removeItem('aws_cognito_session');
        return { data: { session: null } };
      }
      
      return { data: { session } };
    } catch (error) {
      console.error('Error getting session:', error);
      return { data: { session: null } };
    }
  },

  // Get user info from API using session token
  getUser: async (accessToken) => {
    try {
      const response = await fetch('/api/auth/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get user');
      }

      const data = await response.json();
      return { data: { user: data.user }, error: null };
    } catch (error) {
      console.error('Error getting user:', error);
      return { data: { user: null }, error: error.message };
    }
  },

  // Save session to localStorage
  setSession: (session) => {
    try {
      if (typeof window === 'undefined') return;
      
      if (session) {
        localStorage.setItem('aws_cognito_session', JSON.stringify(session));
      } else {
        localStorage.removeItem('aws_cognito_session');
      }
    } catch (error) {
      console.error('Error setting session:', error);
    }
  },

  // Clear session
  signOut: () => {
    try {
      if (typeof window === 'undefined') return;
      
      localStorage.removeItem('aws_cognito_session');
      // Redirect to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const { data: { session } } = clientAuthService.getSession();
    return !!session?.access_token;
  }
}; 