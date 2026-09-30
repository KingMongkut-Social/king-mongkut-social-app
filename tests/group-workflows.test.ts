// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '../src/core/auth/auth-store';
import type { RouteContext } from '../src/core/router/router';
import { groupPage } from '../src/modules/groups/group-page';
import { groupsPage } from '../src/modules/groups/groups-page';
import type { User } from '../src/types/api';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  posts: vi.fn(),
  members: vi.fn(),
  join: vi.fn(),
  leave: vi.fn(),
  createPost: vi.fn(),
  deletePost: vi.fn(),
  deleteGroup: vi.fn(),
  addMember: vi.fn(),
  setMemberRole: vi.fn(),
  removeMember: vi.fn(),
  list: vi.fn(),
  createGroup: vi.fn(),
  search: vi.fn(),
  report: vi.fn(),
}));

vi.mock('../src/modules/groups/groups-api', () => ({
  groupsApi: {
    get: mocks.get,
    posts: mocks.posts,
    members: mocks.members,
    join: mocks.join,
    leave: mocks.leave,
    createPost: mocks.createPost,
    deletePost: mocks.deletePost,
    delete: mocks.deleteGroup,
    addMember: mocks.addMember,
    setMemberRole: mocks.setMemberRole,
    removeMember: mocks.removeMember,
    list: mocks.list,
    create: mocks.createGroup,
  },
}));
vi.mock('../src/modules/search/search-api', () => ({
  searchApi: { search: mocks.search },
}));
vi.mock('../src/modules/reports/report-dialog', () => ({
  openReportDialog: mocks.report,
}));

const owner: User = {
  _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  name: 'Alice',
  email: 'alice@kmitl.ac.th',
  role: 'user',
  university: 'KMITL',
  faculty: 'Engineering',
  department: 'Computer',
  needsProfileCompletion: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function context(path: string): RouteContext {
  const url = new URL(path, 'http://localhost:3000');
  const id = url.pathname.startsWith('/groups/') ? url.pathname.split('/')[2] : undefined;
  return { url, query: url.searchParams, params: id ? { id } : {} };
}

const group = {
  id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  name: 'Private Research Lab',
  description: 'Lab discussion',
  coverUrl: null,
  privacy: 'private' as const,
  university: 'KMITL' as const,
  memberCount: 2,
  membershipRole: 'owner' as const,
  joined: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const bob = {
  id: 'm1',
  role: 'member' as const,
  user: {
    _id: 'cccccccccccccccccccccccc',
    name: 'Bob',
    university: 'KMUTT',
  },
  joinedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  authStore.setAuthenticated(owner, 'token');
  document.body.replaceChildren(Object.assign(document.createElement('div'), { id: 'toast-root' }));
  mocks.get.mockResolvedValue(group);
  mocks.posts.mockResolvedValue([{
    id: 'dddddddddddddddddddddddd',
    groupId: group.id,
    content: 'Group post',
    author: bob.user,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }]);
  mocks.members.mockResolvedValue([
    {
      id: 'owner-membership',
      role: 'owner',
      user: { _id: owner._id, name: owner.name, university: owner.university },
      joinedAt: '2026-01-01T00:00:00.000Z',
    },
    bob,
  ]);
  mocks.list.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0, pages: 1 });
  mocks.search.mockResolvedValue({
    users: [{
      id: 'eeeeeeeeeeeeeeeeeeeeeeee',
      name: 'Carol',
      username: null,
      avatarUrl: null,
      university: 'KMUTNB',
    }],
    posts: [],
    groups: [],
    universities: [],
  });
  mocks.createGroup.mockResolvedValue(group);
  mocks.deletePost.mockResolvedValue(undefined);
  mocks.deleteGroup.mockResolvedValue(undefined);
  mocks.addMember.mockResolvedValue(undefined);
  mocks.setMemberRole.mockResolvedValue(undefined);
  mocks.removeMember.mockResolvedValue(undefined);
});

afterEach(() => {
  authStore.setAnonymous();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('community group UI workflows', () => {
  it('deletes and reports a real group post using the normalized post id', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const view = await groupPage(context(`/groups/${group.id}`));
    const post = view.element.querySelector('.group-post')!;
    const buttons = [...post.querySelectorAll<HTMLButtonElement>('button')];

    buttons.find((button) => button.textContent === 'รายงาน')?.click();
    expect(mocks.report).toHaveBeenCalledWith({
      targetType: 'group_post',
      targetId: 'dddddddddddddddddddddddd',
      title: 'รายงานโพสต์ในกลุ่ม',
    });

    buttons.find((button) => button.textContent === 'ลบ')?.click();
    await vi.waitFor(() => expect(mocks.deletePost).toHaveBeenCalledWith(group.id, 'dddddddddddddddddddddddd'));
  });

  it('lets the owner add a searched member and transfer ownership from the members tab', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Carol');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const view = await groupPage(context(`/groups/${group.id}?tab=members`));

    const addButton = [...view.element.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent === '+ เพิ่มสมาชิก')!;
    addButton.click();
    await vi.waitFor(() => expect(mocks.search).toHaveBeenCalledWith('Carol'));
    await vi.waitFor(() => expect(mocks.addMember).toHaveBeenCalledWith(group.id, 'eeeeeeeeeeeeeeeeeeeeeeee'));

    const select = view.element.querySelector<HTMLSelectElement>('.group-member-row select')!;
    select.value = 'owner';
    select.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(mocks.setMemberRole)
      .toHaveBeenCalledWith(group.id, bob.user._id, 'owner'));
  });

  it('creates a private community group from the groups page when requested', async () => {
    vi.spyOn(window, 'prompt')
      .mockReturnValueOnce('Private AI Lab')
      .mockReturnValueOnce('Research together');
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const view = await groupsPage(context('/groups'));
    const create = [...view.element.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent === '+ สร้างกลุ่ม')!;
    create.click();

    await vi.waitFor(() => expect(mocks.createGroup).toHaveBeenCalledWith({
      name: 'Private AI Lab',
      description: 'Research together',
      privacy: 'private',
      university: 'KMITL',
    }));
  });
});
