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
  FaComments,
  FaEdit,
  FaGlobe,
  FaHeart,
  FaLaughSquint,
  FaLock,
  FaPaperclip,
  FaPlus,
  FaSadTear,
  FaSurprise,
  FaThumbsUp,
  FaTimes,
  FaTrash,
  FaUniversity,
  FaUser,
  FaUsers,
} from 'react-icons/fa';

const ICONS = {
  angry: FaAngry,
  'arrow-left': FaArrowLeft,
  'arrow-right': FaArrowRight,
  bell: FaBell,
  bookmark: FaBookmark,
  check: FaCheck,
  comments: FaComments,
  edit: FaEdit,
  globe: FaGlobe,
  heart: FaHeart,
  laugh: FaLaughSquint,
  lock: FaLock,
  paperclip: FaPaperclip,
  plus: FaPlus,
  sad: FaSadTear,
  surprise: FaSurprise,
  'thumbs-up': FaThumbsUp,
  close: FaTimes,
  trash: FaTrash,
  university: FaUniversity,
  user: FaUser,
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
