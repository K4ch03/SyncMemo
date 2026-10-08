import {useEffect, useState} from 'react';

// Keyboard/IME viewport changes must never change which pane is visible.
export function useSinglePane() {
  const [singlePane, setSinglePane] = useState<boolean | null>(null);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)');
    const update = () => {
      if (document.activeElement?.closest('.title-input, .prose-editor, .toolbar-shell')) return;
      setSinglePane(query.matches);
    };
    setSinglePane(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return singlePane;
}
