// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectionsPage } from '../src/modules/friends/connections-page';
import {
  cancelFriendRequest, listFriends, listFriendRequests, listSuggestedFriends,
  respondFriendRequest, searchFriends, sendFriendRequest,
} from '../src/modules/friends/friends-api';

vi.mock('../src/core/realtime/socket', () => ({
  realtime: { onFriendUpdated: () => () => undefined },
}));
vi.mock('../src/modules/friends/friends-api', () => ({
  listFriends: vi.fn(),
  listFriendRequests: vi.fn(),
  listSuggestedFriends: vi.fn(),
  cancelFriendRequest: vi.fn(),
  respondFriendRequest: vi.fn(),
  searchFriends: vi.fn(),
  sendFriendRequest: vi.fn(),
}));

const alice = { id: 'alice', name: 'Alice', university: 'KMITL' as const };
const bob = { id: 'bob', name: 'Bob', university: 'KMUTT' as const };

beforeEach(() => {
  vi.mocked(searchFriends).mockResolvedValue([]);
  vi.mocked(listFriends).mockResolvedValue([]);
  vi.mocked(listFriendRequests).mockResolvedValue({ incoming: [], outgoing: [] });
  vi.mocked(listSuggestedFriends).mockResolvedValue([]);
  vi.mocked(cancelFriendRequest).mockResolvedValue(undefined);
  vi.mocked(respondFriendRequest).mockResolvedValue(undefined);
  vi.mocked(sendFriendRequest).mockResolvedValue(undefined);
});

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe('connections page', () => {
  it('starts on all friends and shows the actual empty state without sample cards', async () => {
    const page = connectionsPage();
    document.body.append(page.element);
    await vi.waitFor(() => expect(page.element.textContent).toContain('ยังไม่มีเพื่อนที่ตอบรับแล้ว'));
    expect(page.element.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe('เพื่อนทั้งหมด');
    expect(page.element.querySelectorAll('.student-card')).toHaveLength(0);
    expect(page.element.textContent).not.toContain('Supinya');
    page.dispose?.();
  });

  it('accepts a real incoming request and offers a chat link after refresh', async () => {
    vi.mocked(listFriendRequests)
      .mockResolvedValueOnce({ incoming: [{ id: 'request-1', requester: bob, recipient: alice, createdAt: '' }], outgoing: [] })
      .mockResolvedValue({ incoming: [], outgoing: [] });
    vi.mocked(listFriends)
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ ...bob, friendshipId: 'request-1' }]);

    const page = connectionsPage();
    document.body.append(page.element);
    page.element.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]!.click();
    await vi.waitFor(() => expect(page.element.querySelector('.student-card')?.textContent).toContain('Bob'));
    page.element.querySelector<HTMLButtonElement>('.btn-accept-request')!.click();
    await vi.waitFor(() => expect(respondFriendRequest).toHaveBeenCalledWith('request-1', 'accept'));
    page.element.querySelectorAll<HTMLButtonElement>('[role="tab"]')[0]!.click();
    await vi.waitFor(() => expect(page.element.querySelector('.student-card')?.textContent).toContain('Bob'));
    expect(page.element.querySelector<HTMLAnchorElement>('.student-card a[href^="/chat"]')?.getAttribute('href'))
      .toBe('/chat?userId=bob');
    page.dispose?.();
  });

  it('shows outgoing requests separately and cancels one through the API', async () => {
    vi.mocked(listFriendRequests)
      .mockResolvedValueOnce({ incoming: [], outgoing: [{ id: 'request-2', requester: alice, recipient: bob, createdAt: '' }] })
      .mockResolvedValue({ incoming: [], outgoing: [] });
    const page = connectionsPage();
    document.body.append(page.element);
    page.element.querySelectorAll<HTMLButtonElement>('[role="tab"]')[2]!.click();
    await vi.waitFor(() => expect(page.element.querySelector('.student-card')?.textContent).toContain('Bob'));
    page.element.querySelector<HTMLButtonElement>('.btn-reject-icon')!.click();
    await vi.waitFor(() => expect(cancelFriendRequest).toHaveBeenCalledWith('request-2'));
    await vi.waitFor(() => expect(page.element.textContent).toContain('ยังไม่มีคำขอที่ส่ง'));
    page.dispose?.();
  });

  it('uses suggestions for the fourth tab and sends a request from its card', async () => {
    vi.mocked(listSuggestedFriends).mockResolvedValueOnce([{ ...bob, relationshipStatus: 'none', requestId: null, mutualFriendCount: 2 }]);
    const page = connectionsPage();
    document.body.append(page.element);
    page.element.querySelectorAll<HTMLButtonElement>('[role="tab"]')[3]!.click();
    await vi.waitFor(() => expect(page.element.querySelector('.student-card')?.textContent).toContain('มีเพื่อนร่วมกัน 2 คน'));
    expect(listSuggestedFriends).toHaveBeenCalledOnce();
    page.element.querySelector<HTMLButtonElement>('.btn-add-friend')!.click();
    await vi.waitFor(() => expect(sendFriendRequest).toHaveBeenCalledWith('bob'));
    page.dispose?.();
  });
});
