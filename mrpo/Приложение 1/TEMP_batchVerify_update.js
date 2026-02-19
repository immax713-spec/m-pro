// Временный файл - скопируйте эту функцию в service-worker.js вместо существующей batchVerifyUploads

// 🔥 BATCH VERIFY UPLOADS (обновленная версия с циклами)
async function batchVerifyUploads(db) {
    console.log('[SW] Starting batch verification...');

    try {
        const allUploads = await getAllUploadedButUnverified(db);

        if (allUploads.length === 0) {
            console.log('[SW] No uploads to verify');
            return;
        }

        console.log(`[SW] Verifying ${allUploads.length} uploads total...`);

        // Process in batches of 50 to avoid server timeout
        const BATCH_SIZE = 50;
        const totalBatches = Math.ceil(allUploads.length / BATCH_SIZE);

        let totalVerified = 0;
        let totalFailed = 0;

        // Process each batch
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const start = batchIndex * BATCH_SIZE;
            const end = Math.min(start + BATCH_SIZE, allUploads.length);
            const uploadsToVerify = allUploads.slice(start, end);

            console.log(`[SW] Processing batch ${batchIndex + 1}/${totalBatches} (${uploadsToVerify.length} files)...`);

            // Prepare batch request
            const filesToVerify = uploadsToVerify.map(u => ({
                uploadId: u.id,
                objectId: u.objectId,
                fileName: u.fileName,
                monitoring_date: u.monitoring_date,
                category: u.category
            }));

            const serverUrl = uploadsToVerify[0].serverUrl || '/api';

            try {
                const response = await fetch(`${serverUrl}?action=batchVerify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ files: filesToVerify })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const result = await response.json();

                if (!result.success || !Array.isArray(result.files)) {
                    throw new Error('Invalid response format');
                }

                // Update each upload
                for (const fileResult of result.files) {
                    const upload = uploadsToVerify.find(u => u.id === fileResult.uploadId);
                    if (!upload) continue;

                    if (fileResult.verified) {
                        await updateUploadStatus(db, upload.id, 'verified', {
                            verifiedAt: Date.now(),
                            fileInfo: fileResult.fileInfo
                        });
                        totalVerified++;

                        // Auto-cleanup after 24h
                        setTimeout(() => deleteUpload(db, upload.id), 24 * 60 * 60 * 1000);
                    } else {
                        await updateUploadStatus(db, upload.id, 'verification_failed', {
                            verificationError: fileResult.error || 'Not found'
                        });
                        totalFailed++;
                    }
                }

                // Progress update
                await notifyClients({
                    type: 'VERIFICATION_PROGRESS',
                    batch: batchIndex + 1,
                    totalBatches: totalBatches,
                    verified: totalVerified,
                    failed: totalFailed
                });

            } catch (batchError) {
                console.error(`[SW] Batch ${batchIndex + 1} error:`, batchError);
                // Mark batch as failed
                for (const upload of uploadsToVerify) {
                    await updateUploadStatus(db, upload.id, 'verification_failed', {
                        verificationError: 'Batch error: ' + batchError.message
                    });
                    totalFailed++;
                }
            }
        }

        console.log(`[SW] All batches done: ${totalVerified} verified, ${totalFailed} failed`);

        await notifyClients({
            type: 'VERIFICATION_COMPLETE',
            total: allUploads.length,
            verified: totalVerified,
            failed: totalFailed
        });

    } catch (error) {
        console.error('[SW] Batch verification error:', error);
        await notifyClients({
            type: 'VERIFICATION_ERROR',
            error: error.message
        });
    }
}
