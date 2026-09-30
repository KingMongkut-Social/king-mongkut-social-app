// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '../src/core/auth/auth-store';
import type { RouteContext } from '../src/core/router/router';
import { groupsPage } from '../src/modules/groups/groups-page';
import { moderationPage } from '../src/modules/reports/moderation-page';
import { universitiesPage } from '../src/modules/universities/universities-page';
import type { User } from '../src/types/api';

const mocks = vi.hoisted(() => ({
  universities: vi.fn(),
  groups: vi.fn(),
  reports: vi.fn(),
}));

vi.mock('../src/modules/universities/universities-api', () => ({
  universitiesApi: { list: mocks.universities },
}));
vi.mock('../src/modules/groups/groups-api', () => ({
  groupsApi: { list: mocks.groups, create: vi.fn(), invitations: vi.fn().mockResolvedValue([]), respondInvitation: vi.fn() },
}));
vi.mock('../src/modules/reports/reports-api', () => ({
  reportsApi: { list: mocks.reports, moderate: vi.fn() },
}));

function context(path = '/groups'): RouteContext {
  const url = new URL(path, 'http://localhost:3000');
  return { url, query: url.searchParams, params: {} };
}

const admin: User = {
  _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  name: 'Admin',
  email: 'admin@kmitl.ac.th',
  role: 'admin',
  university: 'KMITL',
  needsProfileCompletion: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  authStore.setAnonymous();
  mocks.universities.mockResolvedValue([
    { code: 'KMITL', shortName: 'KMITL', name: 'Ladkrabang', memberCount: 10, postCount: 4 },
    { code: 'KMUTT', shortName: 'KMUTT', name: 'Thonburi', memberCount: 8, postCount: 3 },
    { code: 'KMUTNB', shortName: 'KMUTNB', name: 'North Bangkok', memberCount: 7, postCount: 2 },
  ]);
  mocks.groups.mockResolvedValue({
    items: [{
      id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      name: 'AI & Machine Learning',
      description: 'เรียนรู้ AI ร่วมกัน',
      coverUrl: null,
      privacy: 'public',
      university: 'KMITL',
      memberCount: 24,
      membershipRole: null,
      joined: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    }],
    page: 1, limit: 20, total: 1, pages: 1,
  });
  mocks.reports.mockResolvedValue([{
    _id: 'cccccccccccccccccccccccc',
    reporter: { _id: 'dddddddddddddddddddddddd', name: 'Reporter', university: 'KMUTT' },
    targetType: 'post',
    targetId: 'eeeeeeeeeeeeeeeeeeeeeeee',
    reason: 'spam',
    details: 'Repeated promotion',
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
  }]);
});

afterEach(() => {
  authStore.setAnonymous();
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe('platform completion pages', () => {
  it('renders all three university communities with real navigation links', async () => {
    const view = await universitiesPage();
    expect(mocks.universities).toHaveBeenCalledOnce();
    expect(view.element.querySelectorAll('.university-card')).toHaveLength(3);
    expect(view.element.querySelector<HTMLAnchorElement>('.university-card')?.getAttribute('href')).toBe('/universities/KMITL');
  });

  it('renders community groups from the API', async () => {
    const view = await groupsPage(context());
    expect(mocks.groups).toHaveBeenCalledWith('', 1);
    expect(view.element.querySelector('.group-card')?.textContent).toContain('AI & Machine Learning');
    expect(view.element.querySelector<HTMLAnchorElement>('.group-card')?.getAttribute('href'))
      .toBe('/groups/bbbbbbbbbbbbbbbbbbbbbbbb');
  });

  it('protects moderation in the UI and renders the queue for admins', async () => {
    const denied = await moderationPage();
    expect(denied.element.textContent).toContain('ผู้ดูแลระบบเท่านั้น');

    authStore.setAuthenticated(admin, 'admin-token');
    const view = await moderationPage();
    expect(mocks.reports).toHaveBeenCalledOnce();
    expect(view.element.querySelector('.moderation-card')?.textContent).toContain('Spam');
    expect(view.element.querySelector('.moderation-card')?.textContent).toContain('Repeated promotion');
  });
});
