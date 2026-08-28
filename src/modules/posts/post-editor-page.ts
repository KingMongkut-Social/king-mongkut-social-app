import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { postSchema } from '../../validation/schemas';
import { clearFieldErrors, field, showZodErrors } from '../shared/form';
import { postsApi } from './posts-api';

export async function postEditorPage(context: RouteContext): Promise<PageView> {
  const id = context.params.id;
  const editing = Boolean(id);
  const existing = id ? (await postsApi.getById(id)).data.post : null;

  const section = el('section', { className: 'page-shell page-shell--narrow' });
  const heading = el('div', { className: 'editor-heading' },
    el('div', {},
      el('p', { className: 'eyebrow', text: editing ? 'Edit post' : 'New post' }),
      el('h1', { text: editing ? 'Update your post' : 'Write something worth sharing' }),
      el('p', { className: 'muted', text: 'Save as a draft or publish immediately.' }),
    ),
  );

  const form = el('form', { className: 'form editor-form', attrs: { novalidate: 'true' } });
  const title = el('input', {
    className: 'input',
    attrs: { id: 'title', name: 'title', type: 'text', maxlength: '150', required: 'true', value: existing?.title ?? '' },
  });
  const content = el('textarea', {
    className: 'input textarea',
    attrs: { id: 'content', name: 'content', maxlength: '20000', required: 'true', rows: '14' },
  });
  content.value = existing?.content ?? '';
  const status = el('select', { className: 'input', attrs: { id: 'status', name: 'status' } });
  const draft = el('option', { text: 'Draft', attrs: { value: 'draft' } });
  const published = el('option', { text: 'Published', attrs: { value: 'published' } });
  status.append(draft, published);
  status.value = existing?.status ?? 'draft';

  const formError = el('p', { className: 'form-error', attrs: { role: 'alert' } });
  const actions = el('div', { className: 'form-actions' });
  const cancel = el('a', { className: 'button button--ghost', text: 'Cancel', attrs: { href: '/dashboard' } });
  const submit = el('button', {
    className: 'button button--primary',
    text: editing ? 'Save changes' : 'Create post',
    attrs: { type: 'submit' },
  });
  actions.append(cancel, submit);

  form.append(
    field('title', 'Title', title, 'Maximum 150 characters.'),
    field('content', 'Content', content, 'Plain text, up to 20,000 characters.'),
    field('status', 'Status', status),
    formError,
    actions,
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    formError.textContent = '';

    const result = postSchema.safeParse({ title: title.value, content: content.value, status: status.value });
    if (!result.success) {
      showZodErrors(form, result.error);
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Saving…';
    try {
      if (id) await postsApi.update(id, result.data);
      else await postsApi.create(result.data);
      toast.success(id ? 'Post updated' : 'Post created');
      window.history.pushState(null, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (error) {
      formError.textContent = errorMessage(error);
      submit.disabled = false;
      submit.textContent = editing ? 'Save changes' : 'Create post';
    }
  });

  section.append(heading, form);
  return { title: editing ? 'Edit post' : 'New post', element: section };
}
