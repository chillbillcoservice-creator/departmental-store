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

      // If beforeinstallprompt was already captured in <head>, notify all listeners immediately
      if ((window as any).deferredPrompt) {
        window.dispatchEvent(new CustomEvent('chillbill:caninstall'));
      }

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
          let refreshing = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
              refreshing = true;
              console.log('[ChillBill PWA] Controller changed, refreshing to load latest code...');
              window.location.reload();
            }
          });

          const registerSW = () => {
            navigator.serviceWorker
              .register('/sw.js')
              .then((registration) => {
                console.log('[ChillBill PWA] Service Worker registered with scope:', registration.scope);

                // Auto-update when new version is detected
                registration.onupdatefound = () => {
                  const installingWorker = registration.installing;
                  if (installingWorker) {
                    installingWorker.onstatechange = () => {
                      if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('[ChillBill PWA] New update available. Activating immediately.');
                        installingWorker.postMessage({ type: 'SKIP_WAITING' });
                      }
                    };
                  }
                };

                // Periodically check for updates (every 30 minutes)
                setInterval(() => {
                  registration.update().catch(() => {});
                }, 30 * 60 * 1000);
              })
              .catch((error) => {
                console.warn('[ChillBill PWA] Service Worker registration failed:', error);
              });
          };

          // Register immediately if document is already ready, or on load
          if (document.readyState === 'complete' || document.readyState === 'interactive') {
            registerSW();
          } else {
            window.addEventListener('load', registerSW);
          }
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
