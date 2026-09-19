import './styles.css';
import { bindAuthNavigation, mountLayout } from './app/layout';
import { apiClient } from './core/api/api-client';
import { Router, type RouteDefinition } from './core/router/router';
import { loginPage } from './modules/auth/login-page';
import { renderConnectionsPage } from './modules/friends/connections-page';
import { myPostsPage } from './modules/posts/my-posts-page';
import { postDetailPage } from './modules/posts/post-detail-page';
import { postEditorPage } from './modules/posts/post-editor-page';
import { postsPage } from './modules/posts/posts-page';

const root = document.querySelector('#app') as HTMLElement | null;
if (!root) throw new Error('App root not found');

const outlet = mountLayout(root);

const routes: RouteDefinition[] = [
  { path: '/', handler: postsPage, auth: 'required' },
  { path: '/login', handler: loginPage, auth: 'guest' },
  { path: '/register', handler: loginPage, auth: 'guest' },
  { path: '/posts/:id', handler: postDetailPage, auth: 'required' },
  { path: '/dashboard', handler: myPostsPage, auth: 'required' },
  { path: '/dashboard/posts/new', handler: postEditorPage, auth: 'required' },
  { path: '/dashboard/posts/:id/edit', handler: postEditorPage, auth: 'required' },
  {
    path: '/connections',
    handler: () => ({
      title: 'Connections',
      element: renderConnectionsPage(),
    }),
    auth: 'required',
  },
];

await apiClient.restoreSession();

const router = new Router(outlet, routes);
bindAuthNavigation(router);
router.start();
