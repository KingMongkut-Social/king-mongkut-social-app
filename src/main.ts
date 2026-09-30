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
import { universitiesPage } from './modules/universities/universities-page';
import { universityPage } from './modules/universities/university-page';
import { groupsPage } from './modules/groups/groups-page';
import { groupPage } from './modules/groups/group-page';
import { searchPage } from './modules/search/search-page';
import { moderationPage } from './modules/reports/moderation-page';
import { notificationsPage } from './modules/notifications/notifications-page';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('App root not found');

const outlet = mountLayout(root);

const routes: RouteDefinition[] = [
  { path: '/', handler: postsPage, auth: 'required' },
  { path: '/login', handler: loginPage, auth: 'guest' },
  { path: '/register', handler: registerPage, auth: 'guest' },
  { path: '/auth/callback', handler: callbackPage },
  { path: '/complete-profile', handler: completeProfilePage, auth: 'required', incompleteProfileAllowed: true },
  { path: '/posts/:id', handler: postDetailPage, auth: 'required' },
  { path: '/profile/edit', handler: editProfilePage, auth: 'required' },
  { path: '/profile/:id', handler: profilePage, auth: 'required' },
  { path: '/profile', handler: profilePage, auth: 'required' },
  { path: '/dashboard', handler: myPostsPage, auth: 'required' },
  { path: '/dashboard/posts/new', handler: postEditorPage, auth: 'required' },
  { path: '/dashboard/posts/:id/edit', handler: postEditorPage, auth: 'required' },
  { path: '/connections', handler: connectionsPage, auth: 'required' },
  { path: '/chat', handler: chatPage, auth: 'required' },
  { path: '/universities', handler: universitiesPage, auth: 'required' },
  { path: '/universities/:code', handler: universityPage, auth: 'required' },
  { path: '/groups', handler: groupsPage, auth: 'required' },
  { path: '/groups/:id', handler: groupPage, auth: 'required' },
  { path: '/search', handler: searchPage, auth: 'required' },
  { path: '/notifications', handler: notificationsPage, auth: 'required' },
  { path: '/admin/moderation', handler: moderationPage, auth: 'required', role: 'admin' },
];

await apiClient.restoreSession();

const router = new Router(outlet, routes);
bindAuthNavigation(router);
router.start();
