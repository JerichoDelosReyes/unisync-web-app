/**
 * Firebase Cloud Messaging Service Worker
 * Handles background notifications for UNISYNC PWA
 * Works with both Chrome (FCM) and Safari (Web Push)
 */

// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration - MUST match main app config
const firebaseConfig = {
  apiKey: "AIzaSyBtB3kb_mN3ZdUAyf4xsp1wCK8spQnNtkc",
  authDomain: "unisync-web-app-ac1fd.firebaseapp.com",
  projectId: "unisync-web-app-ac1fd",
  storageBucket: "unisync-web-app-ac1fd.firebasestorage.app",
  messagingSenderId: "25644861146",
  appId: "1:25644861146:web:8fbc17eb8aa666bf60c7e3",
  measurementId: "G-5SQJ2F6E5V"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

// Handle background messages from Firebase (Chrome/Android)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'UNISYNC Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.data?.type || 'general',
    data: payload.data,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    silent: false
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Standard Web Push handler - works for Safari and other browsers
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);
  
  let data = {};
  let title = 'UNISYNC Notification';
  let body = '';
  
  try {
    if (event.data) {
      data = event.data.json();
      console.log('[Service Worker] Push data:', data);
      
      // Handle both FCM format and standard format
      title = data.notification?.title || data.title || title;
      body = data.notification?.body || data.body || body;
    }
  } catch (e) {
    console.error('[Service Worker] Error parsing push data:', e);
    if (event.data) {
      body = event.data.text();
    }
  }
  
  const options = {
    body: body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.data?.type || data.type || 'general',
    data: data.data || data,
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click:', event);
  
  event.notification.close();
  
  // Get the URL to open from notification data
  const notificationData = event.notification.data || {};
  let urlPath = notificationData.url || notificationData.link || '/dashboard';
  
  // Handle FCM link format
  if (notificationData.fcmOptions?.link) {
    urlPath = notificationData.fcmOptions.link;
  }
  
  // Build the full URL
  const urlToOpen = urlPath.startsWith('http') ? urlPath : new URL(urlPath, self.location.origin).href;
  
  console.log('[Service Worker] Opening URL:', urlToOpen);
  
  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(focusedClient => {
              // Navigate to the notification URL
              if (focusedClient && 'navigate' in focusedClient) {
                return focusedClient.navigate(urlToOpen);
              }
              return focusedClient;
            });
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Log service worker activation
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated');
});

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installed');
  self.skipWaiting();
});
