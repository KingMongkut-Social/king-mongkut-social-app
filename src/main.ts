import './styles.css';
import { bindAuthNavigation, mountLayout } from './app/layout';
import { apiClient } from './core/api/api-client';
import { Router, type RouteDefinition } from './core/router/router';
import { callbackPage } from './modules/auth/callback-page';
import { completeProfilePage } from './modules/auth/complete-profile-page';
import { loginPage } from './modules/auth/login-page';
import { registerPage } from './modules/auth/register-page';
import { myPostsPage } from './modules/posts/my-posts-page';
import { postDetailPage } from './modules/posts/post-detail-page';
import { postEditorPage } from './modules/posts/post-editor-page';
import { postsPage } from './modules/posts/posts-page';
import { renderConnectionsPage } from './modules/friends/connections-page';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('App root not found');

const outlet = mountLayout(root);

const routes: RouteDefinition[] = [
  { path: '/', handler: postsPage },
  { path: '/login', handler: loginPage, auth: 'guest' },
  { path: '/register', handler: registerPage, auth: 'guest' },
  { path: '/auth/callback', handler: callbackPage },
  { path: '/complete-profile', handler: completeProfilePage, auth: 'required', incompleteProfileAllowed: true },
  { path: '/posts/:id', handler: postDetailPage },
  { path: '/dashboard', handler: myPostsPage, auth: 'required' },
  { path: '/dashboard/posts/new', handler: postEditorPage, auth: 'required' },
  { path: '/dashboard/posts/:id/edit', handler: postEditorPage, auth: 'required' },
  // แก้จุดที่ 2: เติม title ตามข้อกำหนดของ PageView
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