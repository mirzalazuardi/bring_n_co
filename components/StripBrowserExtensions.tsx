'use client';

import { useEffect } from 'react';

/**
 * Strips browser-extension-injected attributes (Bitwarden, etc.)
 * that cause React hydration mismatches.
 *
 * Uses MutationObserver to catch ALL future injections too.
 */
export function StripBrowserExtensions() {
  useEffect(() => {
    const strip = (el: Element) => {
      el.removeAttribute('bis_skin_checked');
      el.removeAttribute('bis_register');
      const attrs = el.attributes;
      for (let i = attrs.length - 1; i >= 0; --i) {
        const a = attrs[i];
        if (a && a.name.indexOf('__processed_') === 0) {
          el.removeAttribute(a.name);
        }
      }
    };

    // Strip any already-injected attributes
    document
      .querySelectorAll('[bis_skin_checked],[bis_register],[class*=__processed_]')
      .forEach(strip);

    // Watch for future injections
    const obs = new MutationObserver((muts) => {
      for (let i = 0; i < muts.length; i++) {
        const t = muts[i].target as Element;
        if (t.nodeType === 1) strip(t);
      }
    });
    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => obs.disconnect();
  }, []);

  return null;
}
