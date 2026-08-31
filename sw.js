// Service Worker for Caching and Offline Functionality
// Optimized for performance and reliability

const CACHE_NAME = 'safety-app-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/index-optimized.html',
    '/app.js',
    '/analysis-generators.js',
    '/sw.js',
    'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap'
];

// Files to cache on demand
const DYNAMIC_FILES = [
    'https://cdn.tailwindcss.com?plugins=typography',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Caching static files...');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Static files cached successfully');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Failed to cache static files:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                // Return cached version if available
                if (cachedResponse) {
                    console.log('Serving from cache:', request.url);
                    return cachedResponse;
                }

                // Otherwise fetch from network
                return fetch(request)
                    .then(response => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        // Determine which cache to use
                        const cacheName = DYNAMIC_FILES.includes(request.url) ? DYNAMIC_CACHE : STATIC_CACHE;

                        // Cache the response
                        caches.open(cacheName)
                            .then(cache => {
                                cache.put(request, responseToCache);
                                console.log('Cached response for:', request.url);
                            })
                            .catch(error => {
                                console.error('Failed to cache response:', error);
                            });

                        return response;
                    })
                    .catch(error => {
                        console.error('Fetch failed:', error);
                        
                        // Return offline page for navigation requests
                        if (request.destination === 'document') {
                            return caches.match('/index-optimized.html');
                        }
                        
                        // Return a basic offline response for other requests
                        return new Response('Offline content not available', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});

// Background sync for API calls
self.addEventListener('sync', event => {
    if (event.tag === 'api-sync') {
        console.log('Background sync triggered for API calls');
        event.waitUntil(
            // Handle any pending API calls here
            handlePendingApiCalls()
        );
    }
});

// Handle pending API calls
async function handlePendingApiCalls() {
    try {
        // Get pending API calls from IndexedDB
        const pendingCalls = await getPendingApiCalls();
        
        for (const call of pendingCalls) {
            try {
                await fetch(call.url, call.options);
                // Remove successful call from pending list
                await removePendingApiCall(call.id);
            } catch (error) {
                console.error('Failed to sync API call:', error);
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// IndexedDB operations for pending API calls
async function getPendingApiCalls() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SafetyAppDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['pendingCalls'], 'readonly');
            const store = transaction.objectStore('pendingCalls');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
            getAllRequest.onerror = () => reject(getAllRequest.error);
        };
        
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('pendingCalls')) {
                db.createObjectStore('pendingCalls', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

async function removePendingApiCall(id) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SafetyAppDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['pendingCalls'], 'readwrite');
            const store = transaction.objectStore('pendingCalls');
            const deleteRequest = store.delete(id);
            
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
        };
    });
}

// Message handling for cache management
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }).then(() => {
                event.ports[0].postMessage({ success: true });
            })
        );
    }
});

// Push notification handling
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: data.primaryKey
            },
            actions: [
                {
                    action: 'explore',
                    title: 'مشاهده',
                    icon: '/icon-192x192.png'
                },
                {
                    action: 'close',
                    title: 'بستن',
                    icon: '/icon-192x192.png'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// Notification click handling
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

console.log('Service Worker loaded successfully');