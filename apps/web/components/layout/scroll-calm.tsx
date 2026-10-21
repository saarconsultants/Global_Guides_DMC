'use client';
// Adds html.is-scrolling while the page scrolls (and ~150ms after), which
// disables pointer events so hover effects don't fire as content moves under
// a stationary cursor. See .is-scrolling in globals.css.
import { useEffect } from 'react';

export function ScrollCalm() {
  useEffect(() => {
    const root = document.documentElement;
    let t: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      if (!root.classList.contains('is-scrolling')) root.classList.add('is-scrolling');
      clearTimeout(t);
      t = setTimeout(() => root.classList.remove('is-scrolling'), 150);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(t); root.classList.remove('is-scrolling'); };
  }, []);
  return null;
}
