'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        (window as any).deferredPrompt = e;
        window.dispatchEvent(new CustomEvent('chillbill:caninstall'));
      };

      const handleAppInstalled = () => {
        (window as any).deferredPrompt = null;
        window.dispatchEvent(new CustomEvent('chillbill:installed'));
        console.log('[ChillBill PWA] App installed successfully');
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      if ('serviceWorker' in navigator) {
        // In local development, unregister any active service worker and purge caches
        // so code changes and hot reload are never blocked by stale cache
        const isLocalhost =
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname.endsWith('.local');

        if (isLocalhost) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const reg of registrations) {
              reg.unregister();
              console.log('[ChillBill Dev] Unregistered service worker to guarantee fresh code:', reg.scope);
            }
          });
          if ('caches' in window) {
            caches.keys().then((names) => {
              for (const name of names) {
                caches.delete(name);
              }
            });
          }
        } else {
          window.addEventListener('load', () => {
            navigator.serviceWorker
              .register('/sw.js')
              .then((registration) => {
                console.log('[ChillBill PWA] Service Worker registered with scope:', registration.scope);

                // Check for updates
                registration.onupdatefound = () => {
                  const installingWorker = registration.installing;
                  if (installingWorker) {
                    installingWorker.onstatechange = () => {
                      if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('[ChillBill PWA] New update available. Will activate on next session.');
                      }
                    };
                  }
                };
              })
              .catch((error) => {
                console.warn('[ChillBill PWA] Service Worker registration failed:', error);
              });
          });
        }
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  return null;
}
