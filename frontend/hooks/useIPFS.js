import { useState } from 'react';

/**
 * Hook for uploading files and data to IPFS via Pinata
 */
export function useIPFS() {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Upload a file to IPFS
     */
    const uploadFile = async (file) => {
        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/ipfs/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            return result;
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setUploading(false);
        }
    };

    /**
     * Upload multiple files to IPFS
     */
    const uploadFiles = async (files) => {
        const results = [];

        for (const file of files) {
            const result = await uploadFile(file);
            results.push(result);
        }

        return results;
    };

    /**
     * Upload JSON data to IPFS
     */
    const uploadJSON = async (data, metadata = {}) => {
        setUploading(true);
        setError(null);

        try {
            const response = await fetch('/api/ipfs/upload-json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, metadata })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            return result;
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setUploading(false);
        }
    };

    return {
        uploadFile,
        uploadFiles,
        uploadJSON,
        uploading,
        error
    };
}
