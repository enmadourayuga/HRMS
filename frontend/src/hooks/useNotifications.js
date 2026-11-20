import { useEffect, useRef } from 'react';
import { tokenStorage } from '../api';

/**
 * Hook that connects to the live notification stream (SSE)
 * with automatic fallback polling for high reliability across all environments.
 *
 * @param {Function} addToast   - App's addToast(message, type)
 * @param {Function} refreshData - Callback to re-fetch all data
 * @param {Object|null} user    - Current logged-in user (null = disconnected)
 */
export default function useNotifications(addToast, refreshData, user) {
  const eventSourceRef = useRef(null);
  const reconnectTimer = useRef(null);
  const pollTimer = useRef(null);
  const isSseActive = useRef(false);

  useEffect(() => {
    if (!user) {
      cleanup();
      return;
    }

    connect();

    return () => cleanup();
  }, [user]);

  function getBaseApiUrl() {
    let base = (import.meta.env.VITE_API_BASE || '/api').trim().replace(/\/+$/, '');
    if (base.startsWith('http') && !base.endsWith('/api')) {
      base = `${base}/api`;
    }
    return base;
  }

  function handleNotificationPayload(payload) {
    if (!payload || !payload.message) return;
    const type = payload.type || '';
    const toastType =
      type.includes('reject') || type.includes('error')
        ? 'error'
        : type.includes('approve') || type.includes('paid') || type.includes('success')
        ? 'success'
        : 'info';

    addToast(payload.message, toastType);
    if (typeof refreshData === 'function') {
      refreshData();
    }
  }

  function pollNotifications() {
    const token = tokenStorage.getAccess();
    if (!token) return;

    const base = getBaseApiUrl();
    fetch(`${base}/notifications/poll/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((events) => {
        if (Array.isArray(events) && events.length > 0) {
          events.forEach((evt) => handleNotificationPayload(evt));
        }
      })
      .catch((err) => {
        console.debug('[Notifications] Poll check:', err);
      });
  }

  function connect() {
    cleanup();

    const token = tokenStorage.getAccess();
    if (!token) return;

    const base = getBaseApiUrl();
    const url = `${base}/notifications/stream/?token=${encodeURIComponent(token)}`;

    try {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.addEventListener('notification', (e) => {
        try {
          const payload = JSON.parse(e.data);
          handleNotificationPayload(payload);
        } catch (err) {
          console.error('[Notifications] Parse error:', err);
        }
      });

      es.addEventListener('connected', () => {
        console.log('[Notifications] SSE live stream connected.');
        isSseActive.current = true;
      });

      es.onerror = () => {
        isSseActive.current = false;
        // If SSE closes or fails, ensure fallback polling runs every 8 seconds
        if (!pollTimer.current) {
          pollNotifications();
          pollTimer.current = setInterval(pollNotifications, 8000);
        }

        if (es.readyState === EventSource.CLOSED) {
          console.warn('[Notifications] SSE disconnected. Reconnecting in 5s…');
          reconnectTimer.current = setTimeout(connect, 5000);
        }
      };
    } catch (e) {
      console.warn('[Notifications] EventSource not supported or failed to init:', e);
      // Fallback to polling
      pollTimer.current = setInterval(pollNotifications, 8000);
    }
  }

  function cleanup() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    isSseActive.current = false;
  }
}
