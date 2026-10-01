import { authStore } from '../../core/auth/auth-store';
import { realtime } from '../../core/realtime/socket';
import type { PageView, RouteContext } from '../../core/router/router';
import { createAvatar } from '../../core/ui/avatar';
import { clear, el } from '../../core/ui/dom';
import { reactIcon } from '../../core/ui/react-icon';
import { errorMessage } from '../../core/ui/error-message';
import { createEmptyState } from '../../core/ui/feedback';
import { toast } from '../../core/ui/toast';
import { formatRelativeTime } from '../../core/utils/format';
import { listFriends, type AcceptedFriend } from '../friends/friends-api';
import { chatImageUrl, chatsApi, type Chat, type ChatMessage } from './chats-api';


function chatTitle(chat: Chat, selfId: string): string {
  if (chat.type === 'group') return chat.name || 'กลุ่มสนทนา';
  return chat.members.find((member) => member.id !== selfId)?.name || 'แชทส่วนตัว';
}

function messageTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function sameImages(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function formatChatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'วันนี้';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'เมื่อวาน';
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(date);
}

export function chatPage(context: RouteContext): PageView {
  const selfId = authStore.snapshot.user?._id ?? '';
  const root = el('section', { className: 'chat-page' });
  root.append(el('h1', { className: 'chat-page__title chat-page-title', text: 'ข้อความ' }));
  const workspace = el('div', { className: 'chat-workspace' });
  const sidebar = el('aside', { className: 'chat-sidebar' });
  const sidebarHeader = el('div', { className: 'chat-sidebar__header' });
  const heading = el('h2', { text: 'ข้อความ' });
  const groupButton = el('button', { className: 'chat-create-group', attrs: { type: 'button', 'aria-label': 'สร้างกลุ่มสนทนา', title: 'สร้างกลุ่มสนทนา' } });
  groupButton.append(reactIcon('plus'));
  const conversationSearch = el('input', {
    className: 'chat-conversation-search chat-search-input',
    attrs: { type: 'search', placeholder: 'ค้นหาการสนทนา', 'aria-label': 'ค้นหาการสนทนา' },
  });
  sidebarHeader.append(heading, groupButton, conversationSearch);
  const chatList = el('div', { className: 'chat-list' });
  const listStatus = el('div', { className: 'chat-list__status', attrs: { role: 'status' } });
  sidebar.append(sidebarHeader, listStatus, chatList);

  const panel = el('div', { className: 'chat-panel' });
  const panelHeader = el('div', { className: 'chat-panel__header' });
  const backButton = el('button', {
    className: 'chat-back-button',
    attrs: { type: 'button', 'aria-label': 'กลับไปหน้ารายการแชท', title: 'กลับไปหน้ารายการแชท' },
  });
  backButton.append(reactIcon('arrow-left', { size: 20 }));
  backButton.addEventListener('click', () => {
    if (selectedId && typingTimer) {
      window.clearTimeout(typingTimer);
      realtime.sendTyping(selectedId, false);
    }
    selectedId = null;
    window.history.replaceState(null, '', '/chat');
    workspace.classList.remove('chat-workspace--thread-open');
    document.body.classList.remove('is-chat-thread-open');
    renderChats();
    renderHeader();
    renderTypingIndicator();
  });
  const panelAvatar = el('span', { className: 'chat-panel__avatar', attrs: { 'aria-hidden': 'true' } });
  const panelIdentity = el('div', { className: 'chat-panel__identity' });
  const panelTitle = el('h2', { text: 'เลือกบทสนทนา' });
  const panelSubtitle = el('span', { className: 'chat-panel__subtitle' });
  panelIdentity.append(panelTitle, panelSubtitle);
  const connection = el('span', { className: 'chat-connection', text: 'กำลังเชื่อมต่อ…', attrs: { role: 'status' } });
  panelHeader.append(backButton, panelAvatar, panelIdentity, connection);
  const messageArea = el('div', { className: 'chat-messages', attrs: { role: 'log', 'aria-live': 'polite', 'aria-label': 'ข้อความ' } });
  const loadOlderButton = el('button', { className: 'chat-load-older', text: 'โหลดข้อความก่อนหน้า', attrs: { type: 'button' } });
  const emptyPanel = createEmptyState({
    iconName: 'comments',
    title: 'เริ่มบทสนทนา',
    description: 'เลือกแชทจากรายการ ค้นหาเพื่อนที่คุณรู้จัก หรือสร้างกลุ่มสนทนาสำหรับทีมและชุมชนของคุณ',
    actionText: 'ค้นหาเพื่อน',
    actionHref: '/connections?tab=suggestions',
    secondaryActionText: 'สร้างกลุ่มสนทนา',
    onSecondaryAction: () => groupButton.click(),
  });
  emptyPanel.classList.add('chat-empty');
  const typingIndicator = el('div', { className: 'chat-typing-indicator', attrs: { 'aria-live': 'polite' } });
  typingIndicator.hidden = true;
  const composer = el('form', { className: 'chat-composer' });
  const imagePreview = el('div', { className: 'chat-composer__image-preview', attrs: { 'aria-live': 'polite' } });
  const imageInput = el('input', {
    className: 'chat-composer__file-input',
    attrs: {
      type: 'file',
      accept: 'image/jpeg,image/png,image/gif,image/webp,image/avif',
      multiple: 'true',
      'aria-label': 'เลือกรูปภาพเพื่อส่ง',
    },
  });
  const composerRow = el('div', { className: 'chat-composer__row' });
  const imageButton = el('button', {
    className: 'chat-composer__media-button',
    attrs: { type: 'button', 'aria-label': 'เพิ่มรูปภาพ', title: 'เพิ่มรูปภาพ' },
  });
  imageButton.append(reactIcon('image', { size: 20 }));
  const messageInput = el('textarea', {
    className: 'chat-composer__input',
    attrs: { rows: '1', maxlength: '4000', placeholder: 'พิมพ์ข้อความ...', 'aria-label': 'พิมพ์ข้อความ' },
  });
  const sendButton = el('button', { className: 'button button--primary chat-composer__send', text: 'ส่ง', attrs: { type: 'submit' } });
  composerRow.append(imageButton, messageInput, sendButton);
  composer.append(imagePreview, imageInput, composerRow);
  panel.append(panelHeader, loadOlderButton, messageArea, emptyPanel, typingIndicator, composer);
  workspace.append(sidebar, panel);
  root.append(workspace);

  let chats: Chat[] = [];

  let selectedId: string | null = null;
  let messages: ChatMessage[] = [];
  let hasOlder = false;
  let messagesLoading = false;
  let listLoading = true;
  let listError = '';
  let disposed = false;
  let messageVersion = 0;
  let wasConnected = false;
  let pendingSubmission: { chatId: string; content: string; images: string[]; startedAt: number } | null = null;
  let pendingImages: Array<{ file: File; previewUrl: string }> = [];
  const onlineByUserId = new Map<string, boolean>();
  let typingTimer: number | undefined;
  let viewportFrame = 0;
  const typingUsersByChat = new Map<string, Set<string>>();
  const typingExpireTimers = new Map<string, number>();

  function scrollThreadToBottom(): void {
    requestAnimationFrame(() => {
      messageArea.scrollTop = messageArea.scrollHeight;
    });
  }

  function syncChatVisualViewport(): void {
    if (viewportFrame) cancelAnimationFrame(viewportFrame);
    viewportFrame = requestAnimationFrame(() => {
      viewportFrame = 0;
      const mobileThreadOpen = Boolean(selectedId) && window.innerWidth <= 1023;
      if (!mobileThreadOpen) {
        root.style.removeProperty('--chat-visible-height');
        document.body.style.removeProperty('--chat-visible-height');
        root.classList.remove('chat-page--keyboard-open');
        return;
      }

      const viewport = window.visualViewport;
      const visibleHeight = Math.max(320, Math.round(viewport?.height ?? window.innerHeight));
      root.style.setProperty('--chat-visible-height', `${visibleHeight}px`);
      document.body.style.setProperty('--chat-visible-height', `${visibleHeight}px`);

      const layoutHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);
      const keyboardHeight = Math.max(0, layoutHeight - visibleHeight - Math.max(0, viewport?.offsetTop ?? 0));
      const keyboardOpen = keyboardHeight > 120;
      root.classList.toggle('chat-page--keyboard-open', keyboardOpen);

      if (keyboardOpen && document.activeElement === messageInput) {
        scrollThreadToBottom();
      }
    });
  }

  const handleViewportChange = (): void => {
    syncChatVisualViewport();
  };
  window.visualViewport?.addEventListener('resize', handleViewportChange);
  window.visualViewport?.addEventListener('scroll', handleViewportChange);
  window.addEventListener('resize', handleViewportChange);

  function renderTypingIndicator(): void {
    if (!selectedId) {
      typingIndicator.hidden = true;
      return;
    }
    const typingUsers = typingUsersByChat.get(selectedId);
    const chat = chats.find((item) => item.id === selectedId);
    if (!typingUsers || typingUsers.size === 0 || !chat) {
      typingIndicator.hidden = true;
      return;
    }
    const names = [...typingUsers]
      .filter((uid) => uid !== selfId)
      .map((uid) => chat.members.find((m) => m.id === uid)?.name || 'สมาชิก');

    if (names.length === 0) {
      typingIndicator.hidden = true;
      return;
    }

    clear(typingIndicator);
    let text = '';
    if (names.length === 1) {
      text = `${names[0]} กำลังพิมพ์`;
    } else if (names.length === 2) {
      text = `${names[0]} และ ${names[1]} กำลังพิมพ์`;
    } else {
      text = `${names[0]} และอีก ${names.length - 1} คนกำลังพิมพ์`;
    }

    const textEl = el('span', { text });
    const dots = el('span', { className: 'chat-typing-indicator__dots' },
      el('span', { className: 'chat-typing-indicator__dot' }),
      el('span', { className: 'chat-typing-indicator__dot' }),
      el('span', { className: 'chat-typing-indicator__dot' }),
    );
    typingIndicator.append(textEl, dots);
    typingIndicator.hidden = false;
  }

  function sortedChats(): Chat[] {
    return [...chats].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  function mergeChat(chat: Chat): void {
    const index = chats.findIndex((item) => item.id === chat.id);
    if (index >= 0) {
      const previous = chats[index];
      if (previous && new Date(previous.updatedAt).getTime() <= new Date(chat.updatedAt).getTime()) chats[index] = chat;
    } else chats.push(chat);
    renderChats();
    renderHeader();
  }

  function renderChats(): void {
    clear(chatList);
    listStatus.textContent = listLoading ? 'กำลังโหลดแชท…' : listError;
    if (listError) {
      const retry = el('button', { className: 'button button--secondary button--small', text: 'ลองอีกครั้ง', attrs: { type: 'button' } });
      retry.addEventListener('click', () => void refreshChats());
      chatList.append(retry);
      return;
    }
    if (!listLoading && chats.length === 0) {
      chatList.append(el('p', { className: 'chat-list__empty', text: 'ยังไม่มีบทสนทนา เพิ่มเพื่อนหรือสร้างกลุ่มเพื่อเริ่มแชท' }));
    }
    const term = conversationSearch.value.trim().toLocaleLowerCase('th-TH');
    const matching = sortedChats().filter((chat) => !term ||
      chatTitle(chat, selfId).toLocaleLowerCase('th-TH').includes(term) ||
      chat.lastMessage?.content.toLocaleLowerCase('th-TH').includes(term));
    if (!listLoading && chats.length > 0 && matching.length === 0) {
      chatList.append(el('p', { className: 'chat-list__empty', text: 'ไม่พบการสนทนาที่ค้นหา' }));
    }
    for (const chat of matching) {
      const title = chatTitle(chat, selfId);
      const button = el('button', {
        className: `chat-list__item ${chat.id === selectedId ? 'chat-list__item--active' : ''}`,
        attrs: { type: 'button', 'aria-current': String(chat.id === selectedId) },
      });
      const peer = chat.type === 'direct' ? chat.members.find((member) => member.id !== selfId) : null;
      const avatar = chat.type === 'group'
        ? el('span', { className: 'chat-list__avatar' }, reactIcon('users'))
        : createAvatar({
          url: peer?.avatarUrl,
          name: peer?.name,
          size: 44,
          isOnline: peer ? onlineByUserId.get(peer.id) : undefined,
        });
      const body = el('span', { className: 'chat-list__body' });
      const titleLine = el('span', { className: 'chat-list__title', text: title });
      const previewText = chat.lastMessage?.content
        || (chat.lastMessage?.images?.length ? (chat.lastMessage.images.length > 1 ? `ส่งรูปภาพ ${chat.lastMessage.images.length} รูป` : 'ส่งรูปภาพ') : '')
        || (chat.type === 'group' ? `${chat.members.length} สมาชิก` : 'เริ่มบทสนทนา');
      const preview = el('span', { className: 'chat-list__preview', text: previewText });
      body.append(titleLine, preview);
      button.append(avatar, body);
      if (chat.lastMessage) button.append(el('span', { className: 'chat-list__time', text: formatRelativeTime(chat.lastMessage.createdAt) }));
      button.addEventListener('click', () => void selectChat(chat.id));
      chatList.append(button);
    }
  }

  function renderHeader(): void {
    const chat = chats.find((item) => item.id === selectedId);
    workspace.classList.toggle('chat-workspace--thread-open', Boolean(selectedId));
    document.body.classList.toggle('is-chat-thread-open', Boolean(selectedId));
    syncChatVisualViewport();
    panelTitle.textContent = chat ? chatTitle(chat, selfId) : 'เลือกบทสนทนา';
    clear(panelAvatar);
    panelAvatar.hidden = !chat;
    if (chat?.type === 'group') {
      panelAvatar.replaceChildren(reactIcon('users'));
      panelSubtitle.classList.remove('chat-panel__subtitle--online');
      panelSubtitle.textContent = `${chat.members.length} สมาชิก`;
    } else if (chat) {
      const peer = chat.members.find((member) => member.id !== selfId);
      const online = peer ? onlineByUserId.get(peer.id) : undefined;
      panelAvatar.append(createAvatar({
        url: peer?.avatarUrl,
        name: peer?.name,
        size: 38,
        isOnline: online,
      }));
      panelSubtitle.classList.toggle('chat-panel__subtitle--online', online === true);
      panelSubtitle.textContent = [online === true ? 'ออนไลน์' : online === false ? 'ออฟไลน์' : '', peer?.university].filter(Boolean).join(' · ');
    } else {
      panelSubtitle.textContent = '';
      panelSubtitle.classList.remove('chat-panel__subtitle--online');
    }
    emptyPanel.hidden = Boolean(chat);
    composer.hidden = !chat;
    loadOlderButton.hidden = !chat || !hasOlder || messagesLoading;
    messageArea.hidden = !chat;
    renderTypingIndicator();
  }


  conversationSearch.addEventListener('input', renderChats);

  async function refreshPresence(): Promise<void> {
    try {
      const friends = await listFriends();
      if (disposed) return;
      for (const friend of friends) {
        if (typeof friend.isOnline === 'boolean') onlineByUserId.set(friend.id, friend.isOnline);
      }
      renderChats();
      renderHeader();
    } catch {
      // The conversation remains usable if presence cannot be loaded.
    }
  }

  function renderMessages(scrollToBottom = false): void {
    clear(messageArea);
    if (messagesLoading && messages.length === 0) {
      messageArea.append(el('p', { className: 'chat-message-state', text: 'กำลังโหลดข้อความ…' }));
    } else if (messages.length === 0) {
      messageArea.append(el('p', { className: 'chat-message-state', text: 'ยังไม่มีข้อความ เริ่มพูดคุยกันได้เลย' }));
    }
    const chat = chats.find((item) => item.id === selectedId);
    let prevMessage: ChatMessage | null = null;
    let prevDateStr = '';

    for (const message of messages) {
      const msgDate = new Date(message.createdAt);
      const dateStr = Number.isNaN(msgDate.getTime()) ? '' : msgDate.toDateString();
      if (dateStr && dateStr !== prevDateStr) {
        prevDateStr = dateStr;
        const separator = el('div', { className: 'chat-date-separator' });
        separator.append(el('span', { text: formatChatDate(message.createdAt) }));
        messageArea.append(separator);
      }

      const self = message.senderId === selfId;
      const isGrouped = Boolean(
        prevMessage &&
        prevMessage.senderId === message.senderId &&
        Math.abs(new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) < 2 * 60 * 1000
      );
      prevMessage = message;

      const sender = chat?.members.find((member) => member.id === message.senderId)?.name || 'สมาชิก';
      const item = el('article', {
        className: `chat-message ${self ? 'chat-message--self chat-message--mine' : 'chat-message--theirs'} ${isGrouped ? 'chat-message--grouped' : ''}`.trim(),
      });
      if (!self && chat?.type === 'group' && !isGrouped) {
        item.append(el('span', { className: 'chat-message__sender', text: sender }));
      }
      if (message.images?.length) {
        const media = el('div', {
          className: `chat-message__images chat-message__images--${Math.min(message.images.length, 4)}`,
        });
        for (const [index, path] of message.images.entries()) {
          const fullUrl = chatImageUrl(path);
          const link = el('a', {
            className: 'chat-message__image-link',
            attrs: {
              href: fullUrl,
              target: '_blank',
              rel: 'noopener noreferrer',
              'aria-label': `เปิดรูปภาพที่ ${index + 1}`,
            },
          });
          link.append(el('img', {
            className: 'chat-message__image',
            attrs: { src: fullUrl, alt: 'รูปภาพในแชท', loading: 'lazy' },
          }));
          media.append(link);
        }
        item.append(media);
      }
      if (message.content) {
        item.append(el('p', { className: 'chat-message__content chat-message__bubble', text: message.content }));
      }
      item.append(el('time', { className: 'chat-message__time', text: messageTime(message.createdAt), attrs: { datetime: message.createdAt } }));
      messageArea.append(item);
    }
    renderHeader();
    if (scrollToBottom) requestAnimationFrame(() => { messageArea.scrollTop = messageArea.scrollHeight; });
  }

  function mergeMessages(incoming: ChatMessage[], scrollToBottom = false): void {
    const byId = new Map(messages.map((message) => [message.id, message]));
    for (const message of incoming) byId.set(message.id, message);
    messages = [...byId.values()].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id));
    renderMessages(scrollToBottom);
  }

  async function selectChat(chatId: string): Promise<void> {
    if (disposed) return;
    if (selectedId && typingTimer) {
      window.clearTimeout(typingTimer);
      realtime.sendTyping?.(selectedId, false);
    }
    selectedId = chatId;
    workspace.classList.add('chat-workspace--thread-open');
    document.body.classList.add('is-chat-thread-open');
    const version = ++messageVersion;
    messages = [];
    hasOlder = false;
    messagesLoading = true;
    window.history.replaceState(null, '', `/chat?chatId=${encodeURIComponent(chatId)}`);
    renderChats();
    renderMessages();
    renderTypingIndicator();
    try {
      const latest = await chatsApi.messages(chatId);
      if (disposed || version !== messageVersion) return;
      hasOlder = latest.length === 30;
      mergeMessages(latest);
    } catch (cause) {
      if (!disposed && version === messageVersion) toast.error(errorMessage(cause));
    } finally {
      if (!disposed && version === messageVersion) { messagesLoading = false; renderMessages(true); }
    }
  }

  async function refreshChats(): Promise<void> {
    listLoading = true;
    listError = '';
    renderChats();
    try {
      const latest = await chatsApi.list();
      if (disposed) return;
      const byId = new Map(chats.map((chat) => [chat.id, chat]));
      for (const chat of latest) {
        const previous = byId.get(chat.id);
        if (!previous || new Date(previous.updatedAt).getTime() <= new Date(chat.updatedAt).getTime()) byId.set(chat.id, chat);
      }
      chats = [...byId.values()];
    } catch (cause) {
      if (disposed) return;
      listError = errorMessage(cause);
    } finally {
      if (!disposed) { listLoading = false; renderChats(); renderHeader(); }
    }
  }

  loadOlderButton.addEventListener('click', async () => {
    if (!selectedId || !messages[0] || messagesLoading) return;
    const chatId = selectedId;
    const version = messageVersion;
    const oldHeight = messageArea.scrollHeight;
    messagesLoading = true;
    renderHeader();
    try {
      const older = await chatsApi.messages(chatId, messages[0].id);
      if (disposed || version !== messageVersion) return;
      hasOlder = older.length === 30;
      mergeMessages(older);
      requestAnimationFrame(() => { messageArea.scrollTop += messageArea.scrollHeight - oldHeight; });
    } catch (cause) {
      if (!disposed && version === messageVersion) toast.error(errorMessage(cause));
    } finally {
      if (!disposed && version === messageVersion) { messagesLoading = false; renderHeader(); }
    }
  });

  composer.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!selectedId || sendButton.disabled) return;
    const content = messageInput.value.trim();
    if (!content && pendingImages.length === 0) return;
    const chatId = selectedId;
    if (typingTimer) {
      window.clearTimeout(typingTimer);
      typingTimer = undefined;
    }
    realtime.sendTyping(chatId, false);
    const startedAt = Date.now();
    sendButton.disabled = true;
    imageButton.disabled = true;
    try {
      const uploadedImages = pendingImages.length
        ? await Promise.all(pendingImages.map(async ({ file }) => (await chatsApi.uploadImage(file)).url))
        : [];
      pendingSubmission = { chatId, content, images: uploadedImages, startedAt };
      const sent = realtime.isConnected()
        ? await realtime.sendMessage(chatId, content, uploadedImages)
        : await chatsApi.send(chatId, content, uploadedImages);
      if (disposed) return;
      if (selectedId === chatId) mergeMessages([sent], true);
      if (messageInput.value.trim() === content) messageInput.value = '';
      clearPendingImages();
      updateComposerState();
      pendingSubmission = null;
      const chat = chats.find((item) => item.id === chatId);
      if (chat) mergeChat({ ...chat, lastMessage: sent, updatedAt: sent.createdAt });
    } catch (cause) {
      if (disposed) return;
      if (cause instanceof Error && /timed out|timeout/i.test(cause.message)) {
        try {
          const latest = await chatsApi.messages(chatId);
          if (selectedId === chatId) mergeMessages(latest);
          const expectedImages = pendingSubmission?.images ?? [];
          const delivered = latest.find((message) =>
            message.senderId === selfId
            && message.content === content
            && sameImages(message.images ?? [], expectedImages)
            && new Date(message.createdAt).getTime() >= startedAt - 2000);
          if (delivered) {
            if (messageInput.value.trim() === content) messageInput.value = '';
            clearPendingImages();
            updateComposerState();
            pendingSubmission = null;
            return;
          }
        } catch { /* The send result is still uncertain. */ }
        toast.info('ยังยืนยันการส่งไม่ได้ โปรดดูข้อความล่าสุดก่อนส่งซ้ำ');
      } else {
        pendingSubmission = null;
        toast.error(errorMessage(cause));
      }
    } finally {
      sendButton.disabled = false;
      imageButton.disabled = false;
      messageInput.focus({ preventScroll: true });
    }
  });
  function updateComposerState(): void {
    sendButton.hidden = !messageInput.value.trim() && pendingImages.length === 0;
    imagePreview.hidden = pendingImages.length === 0;
  }

  function renderPendingImages(): void {
    clear(imagePreview);
    for (const [index, item] of pendingImages.entries()) {
      const preview = el('div', { className: 'chat-composer__image-item' });
      preview.append(el('img', {
        attrs: { src: item.previewUrl, alt: `รูปที่เลือก ${index + 1}` },
      }));
      const remove = el('button', {
        className: 'chat-composer__image-remove',
        attrs: { type: 'button', 'aria-label': `ลบรูปที่ ${index + 1}` },
      });
      remove.append(reactIcon('close', { size: 12 }));
      remove.addEventListener('click', () => {
        const [removed] = pendingImages.splice(index, 1);
        if (removed) URL.revokeObjectURL(removed.previewUrl);
        renderPendingImages();
        updateComposerState();
      });
      preview.append(remove);
      imagePreview.append(preview);
    }
    updateComposerState();
  }

  function clearPendingImages(): void {
    for (const item of pendingImages) URL.revokeObjectURL(item.previewUrl);
    pendingImages = [];
    imageInput.value = '';
    clear(imagePreview);
    updateComposerState();
  }

  imageButton.addEventListener('click', () => imageInput.click());
  imageInput.addEventListener('change', () => {
    const selected = [...(imageInput.files ?? [])];
    imageInput.value = '';
    const allowed = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']);
    for (const file of selected) {
      if (pendingImages.length >= 4) {
        toast.info('ส่งรูปได้สูงสุด 4 รูปต่อข้อความ');
        break;
      }
      if (!allowed.has(file.type)) {
        toast.error('รองรับเฉพาะ JPEG, PNG, GIF, WebP และ AVIF');
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} มีขนาดเกิน 10 MB`);
        continue;
      }
      pendingImages.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    renderPendingImages();
  });

  messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      composer.requestSubmit();
    }
  });
  messageInput.addEventListener('focus', () => {
    syncChatVisualViewport();
    window.setTimeout(() => {
      syncChatVisualViewport();
      scrollThreadToBottom();
    }, 80);
    window.setTimeout(() => {
      syncChatVisualViewport();
      scrollThreadToBottom();
    }, 280);
  });
  messageInput.addEventListener('blur', () => {
    window.setTimeout(syncChatVisualViewport, 80);
  });
  messageInput.addEventListener('input', () => {
    updateComposerState();
    if (selectedId) {
      realtime.sendTyping?.(selectedId, true);
      if (typingTimer) window.clearTimeout(typingTimer);
      typingTimer = window.setTimeout(() => {
        if (selectedId) realtime.sendTyping?.(selectedId, false);
      }, 1500);
    }
  });
  updateComposerState();

  const groupDialog = el('dialog', { className: 'chat-group-dialog' });
  const groupForm = el('form', { className: 'chat-group-form' });
  const groupName = el('input', { attrs: { name: 'name', type: 'text', maxlength: '80', required: '', placeholder: 'ชื่อกลุ่ม', 'aria-label': 'ชื่อกลุ่ม' } });
  const friendSearchInput = el('input', {
    attrs: {
      type: 'search',
      placeholder: 'ค้นหาเพื่อน...',
      'aria-label': 'ค้นหาเพื่อน',
      className: 'chat-conversation-search',
    },
  });
  const selectedCounter = el('div', {
    className: 'text-meta',
    text: 'เลือกแล้ว: 0 คน',
  });
  const groupMembers = el('div', { className: 'chat-group-members' });
  const groupError = el('p', { className: 'chat-group-error', attrs: { role: 'alert' } });
  const groupSubmit = el('button', { className: 'button button--primary', text: 'สร้างกลุ่ม', attrs: { type: 'submit' } });
  const groupCancel = el('button', { className: 'button button--secondary', text: 'ยกเลิก', attrs: { type: 'button' } });
  groupCancel.addEventListener('click', () => groupDialog.close());
  groupForm.append(
    el('h2', { text: 'สร้างกลุ่มสนทนา' }),
    el('label', { text: 'ชื่อกลุ่ม', attrs: { for: 'chat-group-name' } }),
    groupName,
    friendSearchInput,
    selectedCounter,
    groupMembers, groupError,
    el('div', { className: 'chat-group-actions' }, groupCancel, groupSubmit),
  );
  groupName.id = 'chat-group-name';
  groupDialog.append(groupForm);
  root.append(groupDialog);

  let loadedFriends: AcceptedFriend[] = [];

  const updateSelectedCount = () => {
    const checked = groupMembers.querySelectorAll<HTMLInputElement>('input[name="member"]:checked');
    selectedCounter.textContent = `เลือกแล้ว: ${checked.length} คน`;
  };

  const renderGroupFriends = (filterText = '') => {
    clear(groupMembers);
    const term = filterText.trim().toLowerCase();
    const matching = loadedFriends.filter((f) => !term || f.name.toLowerCase().includes(term) || f.university.toLowerCase().includes(term));
    if (matching.length === 0) {
      groupMembers.append(el('p', { text: loadedFriends.length ? 'ไม่พบเพื่อนที่ตรงกับการค้นหา' : 'ยังไม่มีเพื่อนที่ตอบรับแล้ว' }));
      return;
    }
    for (const friend of matching) {
      const checkbox = el('input', { attrs: { type: 'checkbox', name: 'member', value: friend.id } });
      checkbox.addEventListener('change', updateSelectedCount);
      const friendAvatar = createAvatar({
        url: friend.avatarUrl,
        name: friend.name,
        size: 'sm',
      });
      groupMembers.append(el('label', { className: 'chat-group-member' },
        checkbox,
        friendAvatar,
        el('span', { text: `${friend.name} · ${friend.university}` }),
      ));
    }
    updateSelectedCount();
  };

  friendSearchInput.addEventListener('input', () => {
    renderGroupFriends(friendSearchInput.value);
  });

  groupButton.addEventListener('click', async () => {
    groupError.textContent = '';
    groupName.value = '';
    friendSearchInput.value = '';
    groupMembers.replaceChildren(el('p', { text: 'กำลังโหลดรายชื่อเพื่อน…' }));
    groupDialog.showModal();
    try {
      const friends = await listFriends();
      if (disposed || !groupDialog.open) return;
      loadedFriends = friends;
      renderGroupFriends();
    } catch (cause) {
      if (!disposed) groupError.textContent = errorMessage(cause);
    }
  });

  groupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = groupName.value.trim();
    const memberIds = [...groupMembers.querySelectorAll<HTMLInputElement>('input[name="member"]:checked')].map((input) => input.value);
    if (!name || memberIds.length === 0) { groupError.textContent = 'ระบุชื่อและเลือกเพื่อนอย่างน้อย 1 คน'; return; }
    groupSubmit.disabled = true;
    groupError.textContent = '';
    try {
      const chat = await chatsApi.createGroup(name, memberIds);
      if (disposed) return;
      groupDialog.close();
      mergeChat(chat);
      await selectChat(chat.id);
      toast.success('สร้างกลุ่มแล้ว');
    } catch (cause) {
      if (!disposed) groupError.textContent = errorMessage(cause);
    } finally {
      groupSubmit.disabled = false;
    }
  });

  const unsubscribers = [
    ...(realtime.onTyping
      ? [
          realtime.onTyping(({ chatId, userId, isTyping }) => {
            if (userId === selfId) return;
            if (!typingUsersByChat.has(chatId)) {
              typingUsersByChat.set(chatId, new Set());
            }
            const userSet = typingUsersByChat.get(chatId)!;
            const timerKey = `${chatId}:${userId}`;
            if (isTyping) {
              userSet.add(userId);
              const existing = typingExpireTimers.get(timerKey);
              if (existing) window.clearTimeout(existing);
              typingExpireTimers.set(
                timerKey,
                window.setTimeout(() => {
                  userSet.delete(userId);
                  renderTypingIndicator();
                }, 3000),
              );
            } else {
              userSet.delete(userId);
              const existing = typingExpireTimers.get(timerKey);
              if (existing) {
                window.clearTimeout(existing);
                typingExpireTimers.delete(timerKey);
              }
            }
            renderTypingIndicator();
          }),
        ]
      : []),
    realtime.onMessage((message) => {
      if (pendingSubmission
          && message.chatId === pendingSubmission.chatId
          && message.senderId === selfId
          && message.content === pendingSubmission.content
          && sameImages(message.images ?? [], pendingSubmission.images)
          && new Date(message.createdAt).getTime() >= pendingSubmission.startedAt - 2000) {
        if (messageInput.value.trim() === pendingSubmission.content) messageInput.value = '';
        clearPendingImages();
        pendingSubmission = null;
      }
      if (message.chatId === selectedId) mergeMessages([message], true);
      const chat = chats.find((item) => item.id === message.chatId);
      if (chat) mergeChat({ ...chat, lastMessage: message, updatedAt: message.createdAt });
      else void refreshChats();
    }),
    realtime.onConversation((chat) => mergeChat(chat)),
    realtime.onPresenceUpdated(({ userId, isOnline }) => {
      onlineByUserId.set(userId, isOnline);
      renderChats();
      renderHeader();
    }),
    realtime.onConnection((online) => {
      connection.textContent = online ? 'เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อ…';
      connection.classList.toggle('chat-connection--online', online);
      if (online && wasConnected) {
        void refreshChats();
        if (selectedId) void selectChat(selectedId);
      }
      if (online) wasConnected = true;
    }),
  ];

  async function start(): Promise<void> {
    void refreshPresence();
    await refreshChats();
    if (disposed) return;
    const directUserId = context.query.get('userId');
    if (directUserId) {
      try {
        const direct = await chatsApi.direct(directUserId);
        if (disposed) return;
        mergeChat(direct);
        await selectChat(direct.id);
      } catch (cause) {
        if (!disposed) toast.error(errorMessage(cause));
      }
      return;
    }
    const requested = context.query.get('chatId');
    const requestedChat = requested ? chats.find((chat) => chat.id === requested) : undefined;
    const mobile = window.innerWidth <= 1023;

    if (requestedChat) {
      await selectChat(requestedChat.id);
      return;
    }

    // Mobile follows a Messenger/Facebook master-detail flow:
    // /chat shows the conversation list first, then a selected thread becomes full screen.
    if (mobile) {
      selectedId = null;
      document.body.classList.remove('is-chat-thread-open');
      workspace.classList.remove('chat-workspace--thread-open');
      renderChats();
      renderHeader();
      return;
    }

    const first = sortedChats()[0];
    if (first) await selectChat(first.id);
    else renderHeader();
  }
  renderHeader();
  void start();
  return {
    title: 'ข้อความ', element: root,
    dispose: () => {
      disposed = true;
      ++messageVersion;
      if (typingTimer) {
        window.clearTimeout(typingTimer);
        typingTimer = undefined;
      }
      for (const timer of typingExpireTimers.values()) {
        window.clearTimeout(timer);
      }
      typingExpireTimers.clear();
      clearPendingImages();
      document.body.classList.remove('is-chat-thread-open');
      root.style.removeProperty('--chat-visible-height');
      document.body.style.removeProperty('--chat-visible-height');
      root.classList.remove('chat-page--keyboard-open');
      if (viewportFrame) cancelAnimationFrame(viewportFrame);
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
      window.removeEventListener('resize', handleViewportChange);
      for (const unsubscribe of unsubscribers) unsubscribe();
      if (groupDialog.open) groupDialog.close();
    },
  };
}
