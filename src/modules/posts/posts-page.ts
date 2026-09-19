import { authStore } from '../../core/auth/auth-store';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { pagination, socialPostCard } from './post-components';
import { postsApi } from './posts-api';

function positiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function feedComposer(): HTMLElement {
  const user = authStore.snapshot.user;
  if (!user) return el('div');

  const card = el('form', { className: 'composer' });
  const avatar = el('span', { className: 'avatar' });
  if (user.avatarUrl) avatar.append(el('img', { attrs: { src: user.avatarUrl, alt: '' } }));
  else avatar.textContent = user.name.charAt(0).toUpperCase();

  const textarea = el('textarea', {
    className: 'composer__textarea',
    attrs: { placeholder: "What's on your mind?", maxlength: '20000', rows: '3', required: 'true' },
  });
  const imageInput = el('input', {
    className: 'composer__image-input',
    attrs: { type: 'url', placeholder: 'Paste an image URL…', 'aria-label': 'Image URL' },
  });
  imageInput.hidden = true;

  const photo = el('button', { className: 'composer-tool', text: '▧ Photo', attrs: { type: 'button' } });
  photo.addEventListener('click', () => {
    imageInput.hidden = !imageInput.hidden;
    if (!imageInput.hidden) imageInput.focus();
  });

  const submit = el('button', { className: 'button button--primary composer__submit', text: 'Post', attrs: { type: 'submit' } });
  card.append(
    el('div', { className: 'composer__body' }, avatar, textarea),
    imageInput,
    el('div', { className: 'composer__footer' },
      el('div', { className: 'composer__tools' }, photo, el('span', { className: 'composer-hint', text: 'Share with the KingMongkut Social community' })),
      submit,
    ),
  );

  card.addEventListener('submit', async (event) => {
    event.preventDefault();
    const content = textarea.value.trim();
    if (!content) return;
    submit.disabled = true;
    submit.textContent = 'Posting…';

    try {
      const coverImage = imageInput.value.trim();
      await postsApi.create({
        content,
        status: 'published',
        tags: [],
        ...(coverImage ? { coverImage } : {}),
      });
      textarea.value = '';
      imageInput.value = '';
      toast.success('Post published');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (cause) {
      toast.error(errorMessage(cause));
      submit.disabled = false;
      submit.textContent = 'Post';
    }
  });

  return card;
}

function filterBar(current: string | null, search: string): HTMLElement {
  const form = el('form', { className: 'feed-filter', attrs: { method: 'get', action: '/' } });
  const group = el('label', { className: 'feed-filter__field' },
    el('span', { text: 'INSTITUTION' }),
  );
  const select = el('select', { className: 'input', attrs: { name: 'university', 'aria-label': 'Institution' } },
    el('option', { text: 'All Institutions', attrs: { value: '' } }),
    el('option', { text: 'KMITL', attrs: { value: 'KMITL' } }),
    el('option', { text: 'KMUTT', attrs: { value: 'KMUTT' } }),
    el('option', { text: 'KMUTNB', attrs: { value: 'KMUTNB' } }),
  );
  select.value = current ?? '';
  group.append(select);

  const hiddenSearch = el('input', { attrs: { type: 'hidden', name: 'search', value: search } });
  form.append(group, hiddenSearch, el('button', { className: 'button button--filter', text: 'Filter', attrs: { type: 'submit' } }));
  return form;
}

function rightRail(): HTMLElement {
  const user = authStore.snapshot.user;
  return el('aside', { className: 'feed-rail' },
    el('section', { className: 'rail-card' },
      el('h2', { text: 'Your Network' }),
      el('div', { className: 'rail-profile' },
        el('span', { className: `uni-dot uni-dot--${user?.university.toLowerCase() ?? 'kmitl'}` }),
        el('div', {},
          el('strong', { text: user?.university ?? '3K' }),
          el('span', { text: 'Connected to the KingMongkut Social community' }),
        ),
      ),
      el('a', { className: 'text-link', text: 'Find connections →', attrs: { href: '/connections' } }),
    ),
    el('section', { className: 'rail-card' },
      el('h2', { text: 'KingMongkut Institutions' }),
      el('div', { className: 'institution-list' },
        el('span', { className: 'university-badge university-badge--kmitl', text: 'KMITL' }),
        el('span', { className: 'university-badge university-badge--kmutt', text: 'KMUTT' }),
        el('span', { className: 'university-badge university-badge--kmutnb', text: 'KMUTNB' }),
      ),
      el('p', { className: 'muted', text: 'A shared academic space for students across the three King Mongkut institutes.' }),
    ),
  );
}

export async function postsPage(context: RouteContext): Promise<PageView> {
  const page = positiveInteger(context.query.get('page'), 1);
  const search = (context.query.get('search') ?? '').trim().slice(0, 100);
  const rawUniversity = context.query.get('university');
  const university = rawUniversity === 'KMITL' || rawUniversity === 'KMUTT' || rawUniversity === 'KMUTNB'
    ? rawUniversity
    : undefined;

  const result = await postsApi.listPublished({
    page,
    limit: 12,
    ...(search ? { search } : {}),
    ...(university ? { university } : {}),
  });

  const center = el('div', { className: 'feed-center' }, feedComposer(), filterBar(university ?? null, search));
  if (search) {
    center.append(el('p', { className: 'feed-context', text: `Showing results for “${search}”` }));
  }

  const feed = el('div', { className: 'feed-list' });
  if (result.data.items.length === 0) {
    feed.append(el('div', { className: 'empty-state empty-state--compact' },
      el('h3', { text: 'No posts found' }),
      el('p', { className: 'muted', text: 'Try another search or publish the first post in this feed.' }),
    ));
  } else {
    feed.append(...result.data.items.map((post) => socialPostCard(post)));
  }
  center.append(feed);

  const pager = pagination(result.data.page, result.data.pages, search, '/');
  if (pager) center.append(pager);

  const pageShell = el('section', { className: 'feed-page' }, center, rightRail());
  return { title: 'Home Feed', element: pageShell };
}
