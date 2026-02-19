// 🔥 SERVICE WORKER для фоновой загрузки фото
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `mrpo-cache-${CACHE_VERSION}`;
const RUNTIME_CACHE = `mrpo-runtime-${CACHE_VERSION}`;

// Ресурсы для offline кеширования
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/assets/css/styles.css',
    '/assets/js/app.js',
    '/assets/js/main.js',
    '/assets/js/config.js',
    '/assets/js/state.js',
    '/assets/js/notifications.js',
    '/assets/js/checklist.js',
    '/assets/js/upload-queue.js',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// 🔥 INSTALL EVENT
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...', CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching app shell');
                return cache.addAll(ASSETS_TO_CACHE.map(url => new Request(url, { cache: 'reload' })));
            })
            .then(() => self.skipWaiting())
            .catch((err) => {
                console.error('[SW] Cache installation failed:', err);
            })
    );
});

// 🔥 ACTIVATE EVENT
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...', CACHE_VERSION);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 🔥 FETCH EVENT - Offline support
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests and external requests
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((response) => {
                // Don't cache non-successful responses
                if (!response || response.status !== 200 || response.type === 'error') {
                    return response;
                }

                // Clone the response
                const responseToCache = response.clone();

                caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            });
        }).catch(() => {
            // Fallback for offline
            if (event.request.destination === 'document') {
                return caches.match('/index.html');
            }
        })
    );
});

// 🔥 BACKGROUND SYNC - Main feature for uploads
self.addEventListener('sync', (event) => {
    console.log('[SW] Background Sync triggered:', event.tag);

    if (event.tag === 'upload-photos') {
        event.waitUntil(processUploadQueue());
    }
});

// 🔥 MESSAGE HANDLER - Communication with clients
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data.type === 'UPLOAD_NOW') {
        event.waitUntil(processUploadQueue());
    }

    if (event.data.type === 'GET_QUEUE_STATUS') {
        event.waitUntil(getQueueStatus().then(status => {
            event.ports[0].postMessage(status);
        }));
    }
});

// 🔥 PROCESS UPLOAD QUEUE
async function processUploadQueue() {
    console.log('[SW] Processing upload queue...');

    try {
        const db = await openUploadDB();
        const uploads = await getAllPendingUploads(db);

        if (uploads.length === 0) {
            console.log('[SW] No pending uploads');
            await notifyClients({ type: 'QUEUE_EMPTY' });
            return;
        }

        console.log(`[SW] Found ${uploads.length} pending uploads`);

        // Update badge
        if ('setAppBadge' in navigator) {
            navigator.setAppBadge(uploads.length);
        }

        let successCount = 0;
        let failCount = 0;

        // Process uploads with concurrency limit (5 at a time)
        const CONCURRENCY = 5;
        const chunks = [];
        for (let i = 0; i < uploads.length; i += CONCURRENCY) {
            chunks.push(uploads.slice(i, i + CONCURRENCY));
        }

        for (const chunk of chunks) {
            const results = await Promise.allSettled(
                chunk.map(upload => uploadSinglePhoto(upload, db))
            );

            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    successCount++;
                } else {
                    failCount++;
                }
            });

            // Notify clients about progress
            await notifyClients({
                type: 'UPLOAD_PROGRESS',
                completed: successCount + failCount,
                total: uploads.length,
                success: successCount,
                failed: failCount
            });
        }

        // 🔥 BATCH VERIFICATION after all uploads
        console.log('[SW] All uploads completed. Starting batch verification...');
        await batchVerifyUploads(db);

        // Final notification
        await showNotification('Загрузка завершена', {
            body: `✅ Успешно: ${successCount}\n❌ Ошибка: ${failCount}`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            tag: 'upload-complete'
        });

        // Clear badge
        if ('clearAppBadge' in navigator) {
            navigator.clearAppBadge();
        }

        await notifyClients({
            type: 'UPLOAD_COMPLETE',
            success: successCount,
            failed: failCount
        });

    } catch (error) {
        console.error('[SW] Error processing upload queue:', error);
        await notifyClients({ type: 'UPLOAD_ERROR', error: error.message });
    }
}

// 🔥 UPLOAD SINGLE PHOTO
async function uploadSinglePhoto(upload, db) {
    console.log(`[SW] Uploading photo ${upload.id}...`);

    try {
        // Update status to 'uploading'
        await updateUploadStatus(db, upload.id, 'uploading');

        const formData = new FormData();

        // Convert base64 to blob
        const blob = await fetch(upload.fileData).then(r => r.blob());
        formData.append('photo', blob, upload.fileName);
        formData.append('objectId', upload.objectId);
        formData.append('category', upload.category);
        formData.append('inspector', upload.inspector);
        formData.append('monitoring_date', upload.monitoring_date);

        if (upload.observationRefs && upload.observationRefs.length > 0) {
            formData.append('observationRefs', JSON.stringify(upload.observationRefs));
        }

        // Get server URL from config (stored during enqueue)
        const serverUrl = upload.serverUrl || '/api';

        const response = await fetch(`${serverUrl}?action=uploadPhoto`, {
            method: 'POST',
            body: formData
        });

        // Accept both 2xx and 405 (405 happens due to proxy redirect but file uploads)
        if (response.ok || response.status === 405) {
            console.log(`[SW] ✅ Upload successful: ${upload.fileName}`);

            // Update status to 'uploaded' (will be verified later)
            await updateUploadStatus(db, upload.id, 'uploaded', {
                uploadedAt: Date.now()
            });

            await notifyClients({
                type: 'UPLOAD_SUCCESS',
                uploadId: upload.id,
                fileName: upload.fileName
            });

            return true;
        } else {
            throw new Error(`Upload failed with status ${response.status}`);
        }

    } catch (error) {
        console.error(`[SW] ❌ Upload failed: ${upload.fileName}`, error);

        // Increment retry count
        const newRetryCount = (upload.retryCount || 0) + 1;
        const maxRetries = 3;

        if (newRetryCount < maxRetries) {
            await updateUploadStatus(db, upload.id, 'pending', {
                retryCount: newRetryCount,
                lastError: error.message
            });
        } else {
            await updateUploadStatus(db, upload.id, 'failed', {
                retryCount: newRetryCount,
                lastError: error.message
            });
        }

        await notifyClients({
            type: 'UPLOAD_FAILED',
            uploadId: upload.id,
            fileName: upload.fileName,
            error: error.message
        });

        return false;
    }
}

// 🔥 BATCH VERIFY UPLOADS
async function batchVerifyUploads(db) {
    console.log('[SW] Starting batch verification...');

    try {
        const uploads = await getAllUploadedButUnverified(db);

        if (uploads.length === 0) {
            console.log('[SW] No uploads to verify');
            return;
        }

        console.log(`[SW] Verifying ${uploads.length} uploads...`);

        // ⚠️ LIMIT: Process max 50 files per batch to avoid server timeout
        const MAX_BATCH_SIZE = 50;
        const uploadsToVerify = uploads.slice(0, MAX_BATCH_SIZE);

        if (uploads.length > MAX_BATCH_SIZE) {
            console.warn(`[SW] Queue has ${uploads.length} uploads. Processing first ${MAX_BATCH_SIZE} only.`);
        }

        // Prepare batch request - include ALL required fields
        const filesToVerify = uploadsToVerify.map(u => ({
            uploadId: u.id,
            objectId: u.objectId,
            fileName: u.fileName,
            monitoring_date: u.monitoring_date,
            category: u.category
        }));

        const serverUrl = uploadsToVerify[0].serverUrl || '/api';

        console.log('[SW] Sending batch verify request:', { files: filesToVerify.length });

        const response = await fetch(`${serverUrl}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'batchVerify',
                files: filesToVerify
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[SW] Batch verification HTTP error:', response.status, errorText);
            throw new Error(`Batch verification failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('[SW] Batch verify response:', result);

        // Validate response format
        if (!result.success) {
            console.error('[SW] Batch verification returned success=false:', result.message);
            throw new Error(result.message || 'Batch verification failed');
        }

        if (!result.files || !Array.isArray(result.files)) {
            console.error('[SW] Invalid response format. Expected result.files to be an array, got:', typeof result.files);
            console.error('[SW] Full result:', result);
            throw new Error('Invalid batch verification response format');
        }

        console.log(`[SW] Received ${result.files.length} verification results`);

        // Update each upload with verification result
        for (const fileResult of result.files) {
            const upload = uploadsToVerify.find(u => u.id === fileResult.uploadId);
            if (!upload) {
                console.warn('[SW] Could not find upload for result:', fileResult.uploadId);
                continue;
            }

            if (fileResult.verified) {
                // File verified on Yandex.Disk
                await updateUploadStatus(db, upload.id, 'verified', {
                    verifiedAt: Date.now(),
                    fileInfo: fileResult.fileInfo
                });

                console.log(`[SW] ✅ Verified: ${upload.fileName}`);

                // Delete from queue after successful verification (cleanup after 24 hours)
                setTimeout(() => {
                    deleteUpload(db, upload.id);
                }, 24 * 60 * 60 * 1000);

            } else {
                // File NOT found on Yandex.Disk - mark for retry
                await updateUploadStatus(db, upload.id, 'verification_failed', {
                    verificationError: fileResult.error || 'File not found on Yandex.Disk'
                });

                console.log(`[SW] ❌ Verification failed: ${upload.fileName} - ${fileResult.error}`);
            }
        }

        const verifiedCount = result.files.filter(f => f.verified).length;
        const failedCount = result.files.filter(f => !f.verified).length;

        console.log(`[SW] Batch verification complete: ${verifiedCount} verified, ${failedCount} failed`);

        await notifyClients({
            type: 'VERIFICATION_COMPLETE',
            total: uploadsToVerify.length,
            verified: verifiedCount,
            failed: failedCount
        });

    } catch (error) {
        console.error('[SW] Batch verification error:', error);
        console.error('[SW] Error stack:', error.stack);
        await notifyClients({
            type: 'VERIFICATION_ERROR',
            error: error.message
        });
    }
}

// 🔥 IndexedDB helpers
function openUploadDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('UploadQueueDB', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('uploads')) {
                const store = db.createObjectStore('uploads', { keyPath: 'id', autoIncrement: true });
                store.createIndex('status', 'status', { unique: false });
                store.createIndex('objectId', 'objectId', { unique: false });
            }
        };
    });
}

function getAllPendingUploads(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['uploads'], 'readonly');
        const store = tx.objectStore('uploads');
        const index = store.index('status');
        const request = index.getAll('pending');

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getAllUploadedButUnverified(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['uploads'], 'readonly');
        const store = tx.objectStore('uploads');
        const index = store.index('status');
        const request = index.getAll('uploaded');

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function updateUploadStatus(db, id, status, additionalData = {}) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['uploads'], 'readwrite');
        const store = tx.objectStore('uploads');
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const upload = getRequest.result;
            if (upload) {
                upload.status = status;
                upload.lastUpdated = Date.now();
                Object.assign(upload, additionalData);

                const putRequest = store.put(upload);
                putRequest.onsuccess = () => resolve(upload);
                putRequest.onerror = () => reject(putRequest.error);
            } else {
                reject(new Error('Upload not found'));
            }
        };

        getRequest.onerror = () => reject(getRequest.error);
    });
}

function deleteUpload(db, id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['uploads'], 'readwrite');
        const store = tx.objectStore('uploads');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getQueueStatus() {
    try {
        const db = await openUploadDB();
        const tx = db.transaction(['uploads'], 'readonly');
        const store = tx.objectStore('uploads');
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const uploads = request.result;
                const status = {
                    total: uploads.length,
                    pending: uploads.filter(u => u.status === 'pending').length,
                    uploading: uploads.filter(u => u.status === 'uploading').length,
                    uploaded: uploads.filter(u => u.status === 'uploaded').length,
                    verified: uploads.filter(u => u.status === 'verified').length,
                    failed: uploads.filter(u => u.status === 'failed').length,
                    verificationFailed: uploads.filter(u => u.status === 'verification_failed').length
                };
                resolve(status);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('[SW] Error getting queue status:', error);
        return { error: error.message };
    }
}

// 🔥 NOTIFY ALL CLIENTS
async function notifyClients(message) {
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach(client => {
        client.postMessage(message);
    });
}

// 🔥 SHOW NOTIFICATION
async function showNotification(title, options) {
    if ('Notification' in self && self.Notification.permission === 'granted') {
        return self.registration.showNotification(title, options);
    }
}

// 🔥 NOTIFICATION CLICK
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.openWindow('/')
    );
});

console.log('[SW] Service Worker loaded');
