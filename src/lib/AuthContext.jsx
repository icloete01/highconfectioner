import React, { createContext, useState, useContext, useEffect } from 'react';
import { getAccessToken } from '@base44/sdk';
import { db } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

const AuthContext = createContext();

function getStoredToken() {
  return (
    appParams.token ||
    getAccessToken() ||
    (typeof window !== 'undefined' && localStorage.getItem('base44_access_token')) ||
    null
  );
}

function fetchWithTimeout(url, options = {}, ms = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(id)
  );
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const token = getStoredToken();
      if (token) db.auth.setToken(token, false);
      const currentUser = await db.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      console.error('User auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      if (error.status === 401 || error.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const checkAppState = async () => {
    setIsLoadingPublicSettings(true);
    setAuthError(null);

    try {
      const token = getStoredToken();
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-App-Id': appParams.appId,
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetchWithTimeout(
        `/api/apps/public/prod/public-settings/by-id/${appParams.appId}`,
        { headers }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.message || 'Failed to load app');
        err.status = res.status;
        err.data = data;
        throw err;
      }

      setAppPublicSettings(await res.json());

      if (token) {
        await checkUserAuth();
      } else {
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    } catch (appError) {
      console.error('App state check failed:', appError);
      setAuthError({
        type: 'unknown',
        message: appError.message || 'Failed to load app',
      });
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } finally {
      setIsLoadingPublicSettings(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) db.auth.logout(window.location.href);
    else db.auth.logout();
  };

  const navigateToLogin = () => {
    db.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};