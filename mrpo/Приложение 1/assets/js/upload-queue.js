// 🔥 UPLOAD QUEUE MODULE - IndexedDB для хранения очереди загрузок
// Позволяет продолжать загрузку даже после перезапуска браузера

const DB_NAME = 'UploadQueueDB';
const DB_VERSION = 1;
const STORE_NAME = 'uploads';

// 🔥 Open IndexedDB
function openUploadDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('❌ Failed to open IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create object store
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });

                // Create indexes for efficient queries
                store.createIndex('status', 'status', { unique: false });
                store.createIndex('objectId', 'objectId', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });

                console.log('✅ IndexedDB store created');
            }
        };
    });
}

// 🔥 Enqueue upload
export async function enqueueUpload(uploadData) {
    try {
        const db = await openUploadDB();

        const upload = {
            objectId: uploadData.objectId,
            objectName: uploadData.objectName,
            fileName: uploadData.fileName,
            fileData: uploadData.fileData, // base64
            category: uploadData.category,
            inspector: uploadData.inspector,
            monitoring_date: uploadData.monitoring_date,
            observationRefs: uploadData.observationRefs || [],
            serverUrl: uploadData.serverUrl, // Store server URL for SW
            status: 'pending',
            retryCount: 0,
            timestamp: Date.now(),
            lastUpdated: Date.now()
        };

        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.add(upload);

            request.onsuccess = () => {
                console.log('✅ Upload enqueued:', uploadData.fileName);
                resolve(request.result); // Returns the auto-generated ID
            };

            request.onerror = () => {
                console.error('❌ Failed to enqueue upload:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('❌ Enqueue error:', error);
        throw error;
    }
}

// 🔥 Get all uploads (with optional filter)
export async function getAllUploads(filter = null) {
    try {
        const db = await openUploadDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_NAME], 'readonly');
            const store = tx.objectStore(STORE_NAME);

            let request;
            if (filter && filter.status) {
                const index = store.index('status');
                request = index.getAll(filter.status);
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => {
                let results = request.result;

                // Additional filters
                if (filter) {
                    if (filter.objectId) {
                        results = results.filter(u => u.objectId === filter.objectId);
                    }
                    if (filter.startDate) {
                        results = results.filter(u => u.timestamp >= filter.startDate);
                    }
                    if (filter.endDate) {
                        results = results.filter(u => u.timestamp <= filter.endDate);
                    }
                }

                resolve(results);
            };

            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('❌ Get uploads error:', error);
        return [];
    }
}

// 🔥 Get upload by ID
export async function getUploadById(id) {
    try {
        const db = await openUploadDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_NAME], 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('❌ Get upload by ID error:', error);
        return null;
    }
}

// 🔥 Update upload status
export async function updateUploadStatus(id, status, additionalData = {}) {
    try {
        const db = await openUploadDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const upload = getRequest.result;

                if (!upload) {
                    reject(new Error('Upload not found'));
                    return;
                }

                upload.status = status;
                upload.lastUpdated = Date.now();

                // Merge additional data
                Object.assign(upload, additionalData);

                const putRequest = store.put(upload);

                putRequest.onsuccess = () => {
                    console.log(`✅ Upload ${id} status updated to: ${status}`);
                    resolve(upload);
                };

                putRequest.onerror = () => reject(putRequest.error);
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    } catch (error) {
        console.error('❌ Update status error:', error);
        throw error;
    }
}

// 🔥 Delete upload
export async function deleteUpload(id) {
    try {
        const db = await openUploadDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log(`✅ Upload ${id} deleted`);
                resolve();
            };

            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('❌ Delete upload error:', error);
        throw error;
    }
}

// 🔥 Retry failed upload
export async function retryFailedUpload(id) {
    try {
        return await updateUploadStatus(id, 'pending', {
            retryCount: 0,
            lastError: null
        });
    } catch (error) {
        console.error('❌ Retry upload error:', error);
        throw error;
    }
}

// 🔥 Clear old uploads (cleanup)
export async function clearOldUploads(daysOld = 7) {
    try {
        const db = await openUploadDB();
        const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

        const uploads = await getAllUploads();
        const oldVerified = uploads.filter(u =>
            u.status === 'verified' && u.timestamp < cutoffTime
        );

        for (const upload of oldVerified) {
            await deleteUpload(upload.id);
        }

        console.log(`✅ Cleared ${oldVerified.length} old uploads`);
        return oldVerified.length;
    } catch (error) {
        console.error('❌ Clear old uploads error:', error);
        return 0;
    }
}

// 🔥 Get queue statistics
export async function getQueueStats() {
    try {
        const uploads = await getAllUploads();

        return {
            total: uploads.length,
            pending: uploads.filter(u => u.status === 'pending').length,
            uploading: uploads.filter(u => u.status === 'uploading').length,
            uploaded: uploads.filter(u => u.status === 'uploaded').length,
            verified: uploads.filter(u => u.status === 'verified').length,
            failed: uploads.filter(u => u.status === 'failed').length,
            verificationFailed: uploads.filter(u => u.status === 'verification_failed').length
        };
    } catch (error) {
        console.error('❌ Get stats error:', error);
        return {
            total: 0,
            pending: 0,
            uploading: 0,
            uploaded: 0,
            verified: 0,
            failed: 0,
            verificationFailed: 0
        };
    }
}

// 🔥 Export for debugging
window.UploadQueue = {
    enqueueUpload,
    getAllUploads,
    getUploadById,
    updateUploadStatus,
    deleteUpload,
    retryFailedUpload,
    clearOldUploads,
    getQueueStats
};

console.log('✅ Upload Queue module loaded');
