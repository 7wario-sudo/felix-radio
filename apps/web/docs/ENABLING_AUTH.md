# Clerk Authentication Setup Guide

This guide shows how to configure Clerk authentication in the Felix Radio frontend.

## Current State

✅ **Clerk is now integrated** with the following components:
- `middleware.ts` with `clerkMiddleware()` from `@clerk/nextjs/server`
- `app/layout.tsx` wrapped with `<ClerkProvider>`
- `ApiAuthProvider` using Clerk's `useAuth()` hook
- API client configured to use Clerk JWT tokens

## Steps to Enable Authentication

### 1. Create Clerk Application

1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Sign up or sign in to your Clerk account
3. Click "Add application" or select your existing application
4. Choose your preferred authentication methods (Email, Google, etc.)
5. Note your application name

### 2. Get Your API Keys

1. In Clerk Dashboard, go to **API Keys** page: [https://dashboard.clerk.com/last-active?path=api-keys](https://dashboard.clerk.com/last-active?path=api-keys)
2. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
3. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)

### 3. Update Environment Variables

Edit `apps/web/.env.local` and replace the placeholder values:

```bash
# Replace these with your actual Clerk keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
CLERK_SECRET_KEY=sk_test_your_actual_secret_key_here

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8787  # Development
# NEXT_PUBLIC_API_URL=https://your-api.workers.dev  # Production

# Mock Mode - keep commented out to use real API
# NEXT_PUBLIC_USE_MOCK_API=true
```

### 4. Configure Clerk Dashboard

In your Clerk Dashboard, configure the following:

#### Application URLs
- **Home URL**: `http://localhost:3000` (development) or your production URL
- **Sign-in URL**: `/sign-in`
- **Sign-up URL**: `/sign-up`
- **After sign-in URL**: `/`
- **After sign-up URL**: `/`

#### Authentication Methods
Enable your preferred sign-in methods:
- Email (recommended)
- Google OAuth
- GitHub OAuth
- Other providers as needed

### 5. Restart Development Server

```bash
cd apps/web
npm run dev
```

## Testing Authentication

1. **Sign Up**: Visit `/sign-up` to create an account
2. **Sign In**: Visit `/sign-in` to log in
3. **Protected Routes**: All `/dashboard/*` routes require authentication
4. **API Calls**: All API calls will now include the Clerk JWT token

## Troubleshooting

### "Token getter not set" Warning

If you see this warning in the console:
- Ensure ClerkProvider wraps the entire app
- Verify ApiAuthProvider is inside ClerkProvider
- Check that useAuth() is being called

### API 401 Unauthorized

If API calls fail with 401:
- Verify CLERK_SECRET_KEY is set in Workers API (.dev.vars)
- Check that the same Clerk application is used for both frontend and backend
- Ensure the JWT is being included in Authorization header

### Mock Data Still Showing

If you still see mock data:
- Verify `NEXT_PUBLIC_USE_MOCK_API` is not set to 'true' in .env.local
- Restart the development server (environment variables are loaded at startup)
- Check the browser console for "API client configured with Clerk authentication" message

### Invalid Publishable Key Error

If you see "Invalid publishable key" error:
- Ensure you copied the full key from Clerk Dashboard
- Check that the key starts with `pk_test_` (test) or `pk_live_` (production)
- Make sure there are no extra spaces or quotes

## Reverting to Mock Mode (Demo)

To use mock data for testing without Clerk:

```bash
# In apps/web/.env.local, add:
NEXT_PUBLIC_USE_MOCK_API=true

# Restart dev server
npm run dev
```

Note: Even with mock mode enabled, Clerk authentication UI will still appear but API calls will use mock data.

## Architecture

The authentication flow works as follows:

1. **User signs in** → Clerk handles authentication
2. **ApiAuthProvider** → Injects `getToken()` from Clerk into API client
3. **API requests** → API client calls `getToken()` to fetch JWT
4. **Workers API** → Validates JWT using Clerk's verification
5. **Protected data** → Returns user-specific data

All user data is isolated by `user_id` extracted from the JWT token.
