/* CLEAR push handlers (messages + calls).
   Keep this line at the very top of sw.js:
     importScripts('./clear-push.js');
   and upload this file next to sw.js. */

self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data ? event.data.text() : '' }; }

  // ---- Incoming call ----
  if (d.type === 'call') {
    const tag = d.tag || ('clear-call-' + (d.call_id || 'x'));
    event.waitUntil((async () => {
      await self.registration.showNotification(d.title || 'CLEAR', {
        body: d.body || 'Incoming call',
        icon: d.icon || './clear-192.png',
        badge: './clear-badge.png',
        tag,
        renotify: true,
        requireInteraction: true,
        vibrate: [400, 200, 400, 200, 400, 200, 400],
        data: { type: 'call', call_id: d.call_id || null, conversation_id: d.conversation_id || null, url: d.url || './' },
        actions: [{ action: 'open', title: 'Open' }]
      });
      // Calls only ring for a short time: remove the notification so it doesn't look like a live call afterwards.
      await new Promise(r => setTimeout(r, 45000));
      const list = await self.registration.getNotifications({ tag });
      list.forEach(n => n.close());
    })());
    return;
  }

  // ---- Chat message ----
  const title = d.title || 'CLEAR';
  event.waitUntil(self.registration.showNotification(title, {
    body: d.body || 'New message',
    icon: d.icon || './clear-192.png',
    badge: './clear-badge.png',
    tag: d.tag || (d.conversation_id ? 'clear-chat-' + d.conversation_id : 'clear'),
    renotify: true,
    data: { conversation_id: d.conversation_id || null, url: d.url || './' },
    actions: [{ action: 'open', title: 'Open' }, { action: 'reply', title: 'Reply' }]
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};

  // ---- Tap on a call notification: open the app so the ringing screen appears ----
  if (data.type === 'call') {
    event.waitUntil((async () => {
      const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of list) {
        if ('focus' in c) {
          await c.focus();
          c.postMessage({ type: 'CLEAR_OPEN_CALL', call_id: data.call_id });
          return;
        }
      }
      await clients.openWindow('./?clearCall=' + encodeURIComponent(data.call_id || ''));
    })());
    return;
  }

  // ---- Tap on a message notification ----
  const focusInput = event.action === 'reply';
  event.waitUntil((async () => {
    const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if ('focus' in c) {
        await c.focus();
        c.postMessage({ type: 'CLEAR_OPEN_CHAT', conversation_id: data.conversation_id, focus_input: focusInput });
        return;
      }
    }
    const url = data.conversation_id
      ? './?clearChat=' + encodeURIComponent(data.conversation_id) + (focusInput ? '&focusReply=1' : '')
      : (data.url || './');
    await clients.openWindow(url);
  })());
});
