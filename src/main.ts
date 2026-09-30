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
import { connectionsPage } from './modules/friends/connections-page';
import { chatPage } from './modules/chats/chat-page';
import { profilePage } from './modules/profile/profile-page';
import { editProfilePage } from './modules/profile/edit-profile-page';

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
  { path: '/profile/edit', handler: editProfilePage, auth: 'required' },
  { path: '/profile/:id', handler: profilePage },
  { path: '/profile', handler: profilePage },
  { path: '/dashboard', handler: myPostsPage, auth: 'required' },
  { path: '/dashboard/posts/new', handler: postEditorPage, auth: 'required' },
  { path: '/dashboard/posts/:id/edit', handler: postEditorPage, auth: 'required' },
  { path: '/connections', handler: connectionsPage, auth: 'required' },
  { path: '/chat', handler: chatPage, auth: 'required' },
];

await apiClient.restoreSession();

const router = new Router(outlet, routes);
bindAuthNavigation(router);
router.start();
