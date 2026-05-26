import { createClient } from '@base44/sdk';

const appBaseUrl = import.meta.env.VITE_BASE44_APP_BASE_URL || 'http://127.0.0.1:3000';

export const base44 = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID,
  serverUrl: '',
  appBaseUrl,
});

export const db = base44;
export default base44;
globalThis.__B44_DB__ = base44;