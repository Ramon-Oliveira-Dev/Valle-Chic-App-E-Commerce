import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useLocation, useNavigate } from 'react-router-dom';

const fallbackRoutes = new Set(['/', '/home']);

export default function DeviceBackButton() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeListener: (() => void) | undefined;
    let isMounted = true;

    CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack || window.history.length > 1) {
        window.history.back();
        return;
      }
    }).then((listener) => {
      if (!isMounted) {
        listener.remove();
        return;
      }

      removeListener = () => {
        listener.remove();
      };
    });

    return () => {
      isMounted = false;
      removeListener?.();
    };
  }, []);

  return null;
}
