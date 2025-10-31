# Auth0 Post-Login Redirect Fix

## Problem Summary

After successful Auth0 authentication, users were being redirected to the landing page (`/`) instead of their role-based destination (`/admin` for admins, `/dashboard` for regular users).

## Root Cause

The issue was caused by a **session scope mismatch** between the Auth0 OIDC session and the Express session middleware.

### Detailed Explanation

1. **Session Parameter in `afterCallback`**: The `session` parameter in the `afterCallback` function (provided by `express-openid-connect`) is the **OIDC-specific session**, not the Express session (`req.session`).

2. **Storage Location**: When we set `session.pendingRedirect = redirectTo` in `afterCallback`, it was storing the value in the OIDC session context, not in the Express session.

3. **Retrieval Location**: The `handleLandingRedirect` middleware was checking `req.session.pendingRedirect`, which is the **Express session**, not the OIDC session.

4. **Result**: The redirect flag was never found because it was stored in one session object and retrieved from a different session object.

## The Fix

### Changes Made to `/mnt/c/Users/Br1/Desktop/centinel/src/config/auth0.js`

#### 1. Store Redirect in Express Session (Lines 121-139)

**Before:**
```javascript
// This stored in OIDC session (wrong)
session.pendingRedirect = redirectTo;
session.userId = user._id.toString();
session.dbRole = user.role;

logger.info(`Pending redirect set for user ${email}: ${redirectTo}`);

return session;
```

**After:**
```javascript
// Store in Express session via req.session (correct)
if (req.session) {
  req.session.pendingRedirect = redirectTo;
  req.session.userId = user._id.toString();
  req.session.dbRole = user.role;

  // Force session save to ensure data persists
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) {
        logger.error('Error saving session in afterCallback:', err);
        reject(err);
      } else {
        logger.info(`Pending redirect stored and saved in Express session for user ${email}: ${redirectTo}`);
        resolve(session);
      }
    });
  });
} else {
  logger.error('Express session not available in afterCallback');
  return session;
}
```

**Key Changes:**
- Use `req.session` instead of `session` parameter
- Explicitly call `req.session.save()` to ensure persistence
- Return a Promise that resolves with the OIDC session after Express session is saved
- Add error handling for session save failures

#### 2. Enhanced Redirect Middleware (Lines 246-279)

**Before:**
```javascript
export const handleLandingRedirect = async (req, res, next) => {
  if (req.path !== '/') {
    return next();
  }

  if (req.oidc && req.oidc.isAuthenticated && req.oidc.isAuthenticated()) {
    if (req.session.pendingRedirect) {
      const redirectTo = req.session.pendingRedirect;
      delete req.session.pendingRedirect;

      logger.info(`Redirecting user from landing to: ${redirectTo}`);
      return res.redirect(redirectTo);
    }
  }

  next();
};
```

**After:**
```javascript
export const handleLandingRedirect = async (req, res, next) => {
  if (req.path !== '/') {
    return next();
  }

  // Debug logging to verify middleware is being called
  if (req.session?.pendingRedirect) {
    logger.info(`handleLandingRedirect - Detected pendingRedirect: ${req.session.pendingRedirect}, isAuthenticated: ${req.oidc?.isAuthenticated()}`);
  }

  if (req.oidc && req.oidc.isAuthenticated && req.oidc.isAuthenticated()) {
    if (req.session && req.session.pendingRedirect) {
      const redirectTo = req.session.pendingRedirect;
      delete req.session.pendingRedirect;

      // Save session to ensure the deletion persists
      req.session.save((err) => {
        if (err) {
          logger.error('Error saving session after clearing pendingRedirect:', err);
        }
        logger.info(`Redirecting authenticated user from landing to: ${redirectTo}`);
        return res.redirect(redirectTo);
      });

      // Don't call next() here - we're handling the response
      return;
    }
  }

  next();
};
```

**Key Changes:**
- Add logging when `pendingRedirect` is detected
- Explicitly save session after deleting the redirect flag
- Add explicit `return` after redirect to prevent calling `next()`
- Better error handling and logging

## Testing the Fix

### Manual Testing Steps

1. **Clear your browser cookies** to ensure a fresh session
2. **Navigate to** `http://localhost:3000/`
3. **Click "Login"** - you'll be redirected to Auth0
4. **Enter credentials** and authenticate
5. **Expected behavior**:
   - Admin users (ADMIN_EMAIL in .env) should land on `/admin`
   - Regular users should land on `/dashboard`
   - Landing page should NOT appear after login

### Log Output to Verify

After login, you should see these logs in sequence:

```
info: Auth0 callback - User logged in: user@example.com
info: User updated: user@example.com
info: Pending redirect stored and saved in Express session for user user@example.com: /dashboard
info: handleLandingRedirect - Detected pendingRedirect: /dashboard, isAuthenticated: true
info: Redirecting authenticated user from landing to: /dashboard
```

### Test Script

A test script is provided at `/mnt/c/Users/Br1/Desktop/centinel/test-auth-redirect.js` to verify session persistence independently:

```bash
node test-auth-redirect.js
```

Then visit:
1. `http://localhost:3001/test-set-redirect` - Sets the redirect in session
2. `http://localhost:3001/test-read-redirect` - Reads the redirect from session

If successful, the redirect should be read correctly.

## Why the Original Approach Failed

### Understanding Session Contexts

`express-openid-connect` maintains its own session context separate from Express session:

```
┌─────────────────────────────────────────────┐
│ Request Object (req)                        │
├─────────────────────────────────────────────┤
│                                             │
│  req.session (Express Session)              │
│  ├── cookie settings                        │
│  ├── user-defined data                      │
│  └── pendingRedirect ← We store here now    │
│                                             │
│  req.oidc (Auth0 OIDC Context)              │
│  ├── user                                   │
│  ├── isAuthenticated()                      │
│  ├── id_token                               │
│  └── [internal session] ← Wrong place       │
│                                             │
└─────────────────────────────────────────────┘
```

The `session` parameter in `afterCallback` maps to the internal OIDC session, not `req.session`. Changes to that parameter don't persist in the Express session middleware.

## Additional Notes

### Session Persistence

The fix explicitly calls `req.session.save()` in two places:

1. **In `afterCallback`**: To ensure `pendingRedirect` is written to the session store before Auth0 redirects
2. **In `handleLandingRedirect`**: To ensure the deletion of `pendingRedirect` is persisted

This is critical because:
- Session middleware uses lazy saving (saves at end of request)
- The Auth0 callback flow may redirect before the automatic save occurs
- Explicit saves guarantee the data is persisted immediately

### Error Handling

If session save fails in `afterCallback`, the function now rejects the Promise. This will cause Auth0 to fall back to default behavior (redirect to `/` without custom redirect), which is better than silently failing.

### Backward Compatibility

The fix maintains backward compatibility:
- Session-based auth (legacy) still works via `getAuthenticatedUser()`
- All middleware exports remain unchanged
- No changes required to route handlers

## Files Modified

1. `/mnt/c/Users/Br1/Desktop/centinel/src/config/auth0.js`
   - Modified `afterCallback` to use `req.session` instead of `session` parameter
   - Enhanced `handleLandingRedirect` with better logging and session handling

## Files Created

1. `/mnt/c/Users/Br1/Desktop/centinel/test-auth-redirect.js`
   - Test script to verify session persistence independently

2. `/mnt/c/Users/Br1/Desktop/centinel/AUTH0_REDIRECT_FIX.md`
   - This documentation file

## Next Steps

1. Test the fix by logging in with both admin and regular user accounts
2. Monitor logs to verify the redirect flow works correctly
3. If issues persist, run the test script to verify session middleware configuration
4. Consider adding unit tests for the redirect logic

## Troubleshooting

If redirects still don't work after this fix, check:

1. **Session Store**: Ensure session middleware is properly configured in `server.js`
2. **Cookie Settings**: Verify cookies are being set (check browser dev tools)
3. **Session Secret**: Confirm `SESSION_SECRET` is set in `.env`
4. **Middleware Order**: Ensure session middleware runs before auth0Middleware
5. **Logs**: Check for "Express session not available in afterCallback" errors
