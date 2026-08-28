import type { User } from '../../types/api';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  accessToken: string | null;
}

type AuthListener = (state: Readonly<AuthState>) => void;

class AuthStore {
  private state: AuthState = {
    status: 'loading',
    user: null,
    accessToken: null,
  };

  private readonly listeners = new Set<AuthListener>();

  get snapshot(): Readonly<AuthState> {
    return this.state;
  }

  setAuthenticated(user: User, accessToken: string): void {
    this.state = { status: 'authenticated', user, accessToken };
    this.emit();
  }

  setAnonymous(): void {
    this.state = { status: 'anonymous', user: null, accessToken: null };
    this.emit();
  }

  subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.state);
  }
}

export const authStore = new AuthStore();
