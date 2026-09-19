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
    try {
      const stored = localStorage.getItem(`mock_profile_${user._id}`);
      if (stored) {
        const extra = JSON.parse(stored) as { faculty?: string; department?: string };
        const u = user as unknown as Record<string, unknown>;
        if (extra.faculty && !u.faculty) u.faculty = extra.faculty;
        if (extra.department && !u.department) u.department = extra.department;
      }
    } catch {
      // ignore
    }
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
