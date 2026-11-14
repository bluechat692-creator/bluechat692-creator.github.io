/* CLEAR push handlers. Add this line at the very top of your sw.js:
     importScripts('./clear-push.js');
   and upload this file next to sw.js. */

self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data ? event.data.text() : '' }; }
  const title = d.title || 'CLEAR';
  event.waitUntil(self.registration.showNotification(title, {
    body: d.body || 'New message',
    icon: d.icon || './clear-192.png',
    badge: './clear-192.png',
    tag: d.tag || (d.conversation_id ? 'clear-chat-' + d.conversation_id : 'clear'),
    renotify: true,
    data: { conversation_id: d.conversation_id || null, url: d.url || './' },
    actions: [{ action: 'open', title: 'Open' }, { action: 'reply', title: 'Reply' }]
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
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
