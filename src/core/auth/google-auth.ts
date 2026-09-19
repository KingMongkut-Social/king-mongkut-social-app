import { env } from '../../config/env';
import type { University } from '../../types/api';

interface GoogleCodeResponse {
  code?: string;
  error?: string;
  error_description?: string;
}

interface GoogleCodeClient {
  requestCode(): void;
}

interface GoogleCodeClientConfig {
  client_id: string;
  scope: string;
  ux_mode: 'popup';
  select_account: boolean;
  hd?: string;
  callback: (response: GoogleCodeResponse) => void;
  error_callback: (error: unknown) => void;
}

interface GoogleOAuthApi {
  initCodeClient(config: GoogleCodeClientConfig): GoogleCodeClient;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: GoogleOAuthApi;
      };
    };
  }
}

const domains: Record<University, string> = {
  KMITL: 'kmitl.ac.th',
  KMUTT: 'mail.kmutt.ac.th',
  KMUTNB: 'email.kmutnb.ac.th',
};

let scriptPromise: Promise<void> | null = null;

function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
    const script = existing ?? document.createElement('script');

    const done = (): void => {
      if (window.google?.accounts.oauth2) resolve();
      else reject(new Error('Google Identity Services did not initialize.'));
    };
    const failed = (): void => reject(new Error('Could not load Google Identity Services.'));

    script.addEventListener('load', done, { once: true });
    script.addEventListener('error', failed, { once: true });

    if (!existing) {
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = 'true';
      document.head.append(script);
    }
  });

  return scriptPromise;
}

export async function requestGoogleCode(university: University): Promise<string> {
  if (!env.googleClientId) {
    throw new Error('Google login is not configured. Set VITE_GOOGLE_CLIENT_ID first.');
  }

  await loadGoogleIdentity();
  const oauth2 = window.google?.accounts.oauth2;
  if (!oauth2) throw new Error('Google Identity Services is unavailable.');

  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initCodeClient({
      client_id: env.googleClientId,
      scope: 'openid email profile',
      ux_mode: 'popup',
      select_account: true,
      hd: domains[university],
      callback: (response) => {
        if (response.code) {
          resolve(response.code);
          return;
        }
        reject(new Error(response.error_description ?? response.error ?? 'Google sign-in failed.'));
      },
      error_callback: () => reject(new Error('Google sign-in popup was closed or blocked.')),
    });

    client.requestCode();
  });
}
