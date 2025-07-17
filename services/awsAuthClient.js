import 'server-only';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GetUserCommand,
  GlobalSignOutCommand,
} from '@aws-sdk/client-cognito-identity-provider';

import { decodeJwt } from 'jose';
import crypto from 'crypto';

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'ap-southeast-1', // Default to ap-southeast-1 based on your Cognito config
  // Only include credentials if they exist (for server-side usage)
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  }),
});

const CLIENT_ID = process.env.COGNITO_APP_CLIENT_ID;
const CLIENT_SECRET = process.env.COGNITO_APP_CLIENT_SECRET;

// Validate required environment variables
if (!CLIENT_ID) {
  console.error('Missing COGNITO_APP_CLIENT_ID environment variable');
}

if (!CLIENT_SECRET) {
  console.error('Missing COGNITO_APP_CLIENT_SECRET environment variable');
}

// Helper function to calculate SECRET_HASH
const calculateSecretHash = (username) => {
  if (!CLIENT_SECRET) {
    return undefined;
  }
  
  const message = username + CLIENT_ID;
  return crypto.createHmac('sha256', CLIENT_SECRET)
    .update(message)
    .digest('base64');
};

export const authClient = {
  // Sign up a new user
  signUp: async (email, password, attributes = {}) => {
    try {
      if (!CLIENT_ID) {
        throw new Error('Cognito client ID is not configured. Please check your environment variables.');
      }

      const command = new SignUpCommand({
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        SecretHash: calculateSecretHash(email),
        UserAttributes: [
          {
            Name: 'email',
            Value: email,
          },
          ...Object.entries(attributes).map(([key, value]) => ({
            Name: key,
            Value: value,
          })),
        ],
      });

      const response = await cognitoClient.send(command);
      return { data: response, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  },

  // Confirm sign up with verification code
  confirmSignUp: async (email, confirmationCode) => {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: CLIENT_ID,
        Username: email,
        ConfirmationCode: confirmationCode,
        SecretHash: calculateSecretHash(email),
      });

      const response = await cognitoClient.send(command);
      return { data: response, error: null };
    } catch (error) {
      console.error('Confirm sign up error:', error);
      return { data: null, error };
    }
  },

  // Sign in user
  signIn: async (email, password) => {
    try {
      const command = new InitiateAuthCommand({
        ClientId: CLIENT_ID,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          SECRET_HASH: calculateSecretHash(email),
        },
      });

      const response = await cognitoClient.send(command);
      
      if (response.AuthenticationResult) {
        const { AccessToken, RefreshToken, IdToken } = response.AuthenticationResult;
        
        // Decode the ID token to get user info
        const userInfo = decodeJwt(IdToken);
        
        return {
          data: {
            session: {
              access_token: AccessToken,
              refresh_token: RefreshToken,
              id_token: IdToken,
            },
            user: {
              id: userInfo.sub,
              email: userInfo.email,
              email_verified: userInfo.email_verified,
              user_metadata: {
                name: userInfo.name,
                family_name: userInfo.family_name,
                given_name: userInfo.given_name,
              }
            }
          },
          error: null
        };
      }

      return { data: null, error: new Error('Authentication failed') };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
  },

  // Sign in user (alternative method using ADMIN flow)
  signInAdmin: async (email, password) => {
    try {
      const { AdminInitiateAuthCommand } = await import('@aws-sdk/client-cognito-identity-provider');
      
      const command = new AdminInitiateAuthCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        ClientId: CLIENT_ID,
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          SECRET_HASH: calculateSecretHash(email),
        },
      });

      const response = await cognitoClient.send(command);
      
      if (response.AuthenticationResult) {
        const { AccessToken, RefreshToken, IdToken } = response.AuthenticationResult;
        
        // Decode the ID token to get user info
        const userInfo = decodeJwt(IdToken);
        
        return {
          data: {
            session: {
              access_token: AccessToken,
              refresh_token: RefreshToken,
              id_token: IdToken,
            },
            user: {
              id: userInfo.sub,
              email: userInfo.email,
              email_verified: userInfo.email_verified,
              user_metadata: {
                name: userInfo.name,
                family_name: userInfo.family_name,
                given_name: userInfo.given_name,
              }
            }
          },
          error: null
        };
      }

      return { data: null, error: new Error('Authentication failed') };
    } catch (error) {
      console.error('Admin sign in error:', error);
      return { data: null, error };
    }
  },

  // Get current user from access token
  getUser: async (accessToken) => {
    try {
      const command = new GetUserCommand({
        AccessToken: accessToken,
      });

      const response = await cognitoClient.send(command);
      
      const userAttributes = {};
      response.UserAttributes.forEach(attr => {
        userAttributes[attr.Name] = attr.Value;
      });

      return {
        data: {
          user: {
            id: userAttributes.sub,
            email: userAttributes.email,
            email_verified: userAttributes.email_verified === 'true',
            user_metadata: {
              name: userAttributes.name,
              family_name: userAttributes.family_name,
              given_name: userAttributes.given_name,
            }
          }
        },
        error: null
      };
    } catch (error) {
      console.error('Get user error:', error);
      return { data: { user: null }, error };
    }
  },

  // Sign out user
  signOut: async (accessToken) => {
    try {
      const command = new GlobalSignOutCommand({
        AccessToken: accessToken,
      });

      await cognitoClient.send(command);
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  },

  // Initiate password reset
  forgotPassword: async (email) => {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: CLIENT_ID,
        Username: email,
        SecretHash: calculateSecretHash(email),
      });

      const response = await cognitoClient.send(command);
      return { data: response, error: null };
    } catch (error) {
      console.error('Forgot password error:', error);
      return { data: null, error };
    }
  },

  // Confirm password reset
  confirmForgotPassword: async (email, confirmationCode, newPassword) => {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: CLIENT_ID,
        Username: email,
        ConfirmationCode: confirmationCode,
        Password: newPassword,
        SecretHash: calculateSecretHash(email),
      });

      const response = await cognitoClient.send(command);
      return { data: response, error: null };
    } catch (error) {
      console.error('Confirm forgot password error:', error);
      return { data: null, error };
    }
  },

  // Resend confirmation code
  resendConfirmationCode: async (email) => {
    try {
      const command = new ResendConfirmationCodeCommand({
        ClientId: CLIENT_ID,
        Username: email,
        SecretHash: calculateSecretHash(email),
      });

      const response = await cognitoClient.send(command);
      return { data: response, error: null };
    } catch (error) {
      console.error('Resend confirmation code error:', error);
      return { data: null, error };
    }
  },

  // Get session from stored tokens (for client-side usage)
  getSession: () => {
    if (typeof window === 'undefined') return { data: { session: null }, error: null };
    
    try {
      const session = JSON.parse(localStorage.getItem('cognito_session') || 'null');
      return { data: { session }, error: null };
    } catch (error) {
      return { data: { session: null }, error };
    }
  },

  // Store session in localStorage (for client-side usage)
  setSession: (session) => {
    if (typeof window === 'undefined') return;
    
    if (session) {
      localStorage.setItem('cognito_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('cognito_session');
    }
  },
};

export default authClient; 