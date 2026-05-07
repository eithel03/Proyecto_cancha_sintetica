/* src/components/InstallPWAButton.tsx */
'use client';

import { useEffect, useState } from 'react';

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler as any);
    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);

  const install = async () => {
    if (deferredPrompt && 'prompt' in deferredPrompt) {
      // @ts-ignore
      deferredPrompt.prompt();
      // @ts-ignore
      const { outcome } = await deferredPrompt.userChoice;
      console.log('User choice', outcome);
      setShow(false);
    }
  };

  if (!show) return null;
  return (
    <button
      onClick={install}
      className="mt-4 bg-primary text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:bg-primary/90 transition-colors"
    >
      Instalar aplicación
    </button>
  );
}
