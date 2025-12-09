import { useState } from 'react';
import { useIPFS } from '@/hooks/useIPFS';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * IPFS Upload Test Component
 * 用于测试 Pinata IPFS 上传功能
 */
export function IPFSTest() {
    const { uploadFile, uploadJSON, uploading, error } = useIPFS();
    const [result, setResult] = useState(null);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const result = await uploadFile(file);
        setResult(result);
    };

    const handleJSONUpload = async () => {
        const testData = {
            name: 'Test Application',
            reason: 'Testing IPFS upload',
            amount: 1.5,
            timestamp: Date.now()
        };

        const result = await uploadJSON(testData, {
            name: 'test-application.json'
        });
        setResult(result);
    };

    return (
        <Card className="p-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">IPFS Upload Test</h2>

            <div className="space-y-4">
                {/* File Upload */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Upload File
                    </label>
                    <input
                        type="file"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="block w-full text-sm text-neutral-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-600 file:text-white
              hover:file:bg-blue-700
              file:cursor-pointer cursor-pointer"
                    />
                </div>

                {/* JSON Upload */}
                <div>
                    <Button
                        onClick={handleJSONUpload}
                        disabled={uploading}
                        className="w-full"
                    >
                        {uploading ? 'Uploading...' : 'Upload Test JSON'}
                    </Button>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Result Display */}
                {result && result.success && (
                    <div className="p-4 bg-green-900/20 border border-green-500 rounded-lg space-y-2">
                        <p className="text-green-400 font-semibold">✅ Upload Successful!</p>
                        <div className="text-sm space-y-1">
                            <p className="text-neutral-300">
                                <span className="font-medium">IPFS Hash:</span>{' '}
                                <code className="bg-neutral-800 px-2 py-1 rounded">
                                    {result.ipfsHash}
                                </code>
                            </p>
                            <p className="text-neutral-300">
                                <span className="font-medium">Gateway URL:</span>{' '}
                                <a
                                    href={result.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:underline break-all"
                                >
                                    {result.url}
                                </a>
                            </p>
                            <p className="text-neutral-300">
                                <span className="font-medium">Public URL:</span>{' '}
                                <a
                                    href={result.publicUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:underline break-all"
                                >
                                    {result.publicUrl}
                                </a>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
