import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { IconType } from 'react-icons';
import {
  FaAngry,
  FaArrowLeft,
  FaArrowRight,
  FaBell,
  FaBookmark,
  FaCheck,
  FaChevronDown,
  FaChevronRight,
  FaComments,
  FaEdit,
  FaEllipsisH,
  FaExclamationTriangle,
  FaGlobe,
  FaHeart,
  FaImage,
  FaInfoCircle,
  FaLaughSquint,
  FaNewspaper,
  FaLock,
  FaPaperclip,
  FaPlus,
  FaSadTear,
  FaSearch,
  FaShieldAlt,
  FaSignOutAlt,
  FaSmile,
  FaTag,
  FaSurprise,
  FaThumbsUp,
  FaTimes,
  FaTrash,
  FaUniversity,
  FaUser,
  FaUserFriends,
  FaUserPlus,
  FaUsers,
  FaFileAlt,
} from 'react-icons/fa';

const ICONS = {
  angry: FaAngry,
  'arrow-left': FaArrowLeft,
  'arrow-right': FaArrowRight,
  bell: FaBell,
  bookmark: FaBookmark,
  check: FaCheck,
  'chevron-down': FaChevronDown,
  'chevron-right': FaChevronRight,
  comments: FaComments,
  connections: FaUserFriends,
  edit: FaEdit,
  ellipsis: FaEllipsisH,
  warning: FaExclamationTriangle,
  globe: FaGlobe,
  heart: FaHeart,
  image: FaImage,
  info: FaInfoCircle,
  laugh: FaLaughSquint,
  feed: FaNewspaper,
  lock: FaLock,
  paperclip: FaPaperclip,
  plus: FaPlus,
  sad: FaSadTear,
  search: FaSearch,
  shield: FaShieldAlt,
  logout: FaSignOutAlt,
  smile: FaSmile,
  tag: FaTag,
  surprise: FaSurprise,
  'thumbs-up': FaThumbsUp,
  close: FaTimes,
  trash: FaTrash,
  university: FaUniversity,
  user: FaUser,
  posts: FaFileAlt,
  'user-plus': FaUserPlus,
  users: FaUsers,
} satisfies Record<string, IconType>;

export type AppIconName = keyof typeof ICONS;

export interface ReactIconOptions {
  className?: string;
  size?: string | number;
  label?: string;
}

const markupCache = new Map<string, string>();

export function reactIcon(name: AppIconName, options: ReactIconOptions = {}): SVGSVGElement {
  const Component = ICONS[name];
  const className = ['react-icon', options.className].filter(Boolean).join(' ');
  const size = options.size ?? '1em';
  const cacheKey = `${name}|${className}|${String(size)}|${options.label ?? ''}`;

  let markup = markupCache.get(cacheKey);
  if (!markup) {
    markup = renderToStaticMarkup(createElement(Component, {
      className,
      size,
      focusable: false,
      role: options.label ? 'img' : undefined,
      'aria-label': options.label,
      'aria-hidden': options.label ? undefined : true,
    }));
    markupCache.set(cacheKey, markup);
  }

  const template = document.createElement('template');
  template.innerHTML = markup;
  const svg = template.content.firstElementChild;
  if (!(svg instanceof SVGSVGElement)) {
    throw new Error(`React icon "${name}" did not render an SVG element`);
  }
  return svg;
}
