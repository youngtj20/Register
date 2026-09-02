import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

// Renders into #print-root, a sibling of #root in index.html — kept out of
// the app's own DOM tree entirely. This matters because the old approach
// (visibility:hidden on the rest of the page, visibility:visible on the
// printable node) still left the whole hidden app fully laid out — its
// invisible height still counts for print pagination, producing a trailing
// blank page whenever the dashboard behind the modal was taller than one
// sheet. A portal sidesteps that: during print we simply set #root to
// display:none (which truly removes it from layout) and only #print-root
// is visible, sized purely by its own printable content.
export default function PrintPortal({ children }: { children: ReactNode }) {
  const target = typeof document !== 'undefined' ? document.getElementById('print-root') : null;
  if (!target) return null;
  return createPortal(children, target);
}
