"""
In-memory notification queue for live notifications (SSE + polling fallback).
Each user gets a list of pending notification events.
Thread-safe for ASGI/WSGI processes.
"""
import threading
import time
from collections import defaultdict

_lock = threading.Lock()
_queues = defaultdict(list)          # user_id -> [event, ...]
_waiters = defaultdict(list)         # user_id -> [threading.Event, ...]


def push_notification(user_id, event_type, message, data=None):
    """
    Push a notification to a specific user.
    If the user has an active SSE connection, they'll receive it immediately.
    """
    if not user_id:
        return
    event = {
        'id': f"notif_{int(time.time() * 1000)}",
        'type': event_type,
        'message': message,
        'data': data or {},
        'timestamp': time.time(),
    }
    with _lock:
        _queues[user_id].append(event)
        # Wake up any SSE connections waiting for this user
        for waiter in _waiters.get(user_id, []):
            waiter.set()


def broadcast_notification(event_type, message, data=None):
    """
    Broadcast a notification to all currently connected or known users.
    """
    event = {
        'id': f"notif_{int(time.time() * 1000)}",
        'type': event_type,
        'message': message,
        'data': data or {},
        'timestamp': time.time(),
    }
    with _lock:
        target_ids = set(list(_waiters.keys()) + list(_queues.keys()))
        for uid in target_ids:
            _queues[uid].append(event)
            for waiter in _waiters.get(uid, []):
                waiter.set()


def pop_notifications(user_id):
    """Pop and return all pending notifications for a user."""
    with _lock:
        events = _queues.pop(user_id, [])
    return events


def register_waiter(user_id):
    """Register a threading.Event so the SSE loop can sleep until notified."""
    waiter = threading.Event()
    with _lock:
        _waiters[user_id].append(waiter)
    return waiter


def unregister_waiter(user_id, waiter):
    """Remove the waiter when the SSE connection closes."""
    with _lock:
        if user_id in _waiters:
            try:
                _waiters[user_id].remove(waiter)
                if not _waiters[user_id]:
                    del _waiters[user_id]
            except ValueError:
                pass
