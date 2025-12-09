/**
 * Pinata IPFS Integration
 * 用于上传文件和 JSON 数据到 IPFS
 */

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_JWT = process.env.PINATA_JWT; // 可选：使用 JWT 代替 API Key

/**
 * 上传文件到 IPFS (服务端使用)
 */
export async function uploadFileToIPFS(file, metadata = {}) {
    try {
        const formData = new FormData();
        formData.append('file', file);

        // 添加元数据
        const pinataMetadata = JSON.stringify({
            name: metadata.name || file.name,
            keyvalues: {
                uploadedBy: 'SolaMate',
                timestamp: Date.now(),
                ...metadata.keyvalues
            }
        });
        formData.append('pinataMetadata', pinataMetadata);

        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'pinata_api_key': PINATA_API_KEY,
                'pinata_secret_api_key': PINATA_SECRET_KEY
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Pinata API error: ${response.statusText}`);
        }

        const data = await response.json();
        const ipfsHash = data.IpfsHash;

        return {
            success: true,
            ipfsHash,
            url: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
            publicUrl: `https://ipfs.io/ipfs/${ipfsHash}`
        };
    } catch (error) {
        console.error('Error uploading to IPFS:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 上传 JSON 数据到 IPFS
 */
export async function uploadJSONToIPFS(jsonData, metadata = {}) {
    try {
        const body = {
            pinataContent: jsonData,
            pinataMetadata: {
                name: metadata.name || 'data.json',
                keyvalues: {
                    uploadedBy: 'SolaMate',
                    timestamp: Date.now(),
                    ...metadata.keyvalues
                }
            }
        };

        const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'pinata_api_key': PINATA_API_KEY,
                'pinata_secret_api_key': PINATA_SECRET_KEY
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Pinata API error: ${response.statusText}`);
        }

        const data = await response.json();
        const ipfsHash = data.IpfsHash;

        return {
            success: true,
            ipfsHash,
            url: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
            publicUrl: `https://ipfs.io/ipfs/${ipfsHash}`
        };
    } catch (error) {
        console.error('Error uploading JSON to IPFS:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 从 IPFS 获取数据
 */
export async function getFromIPFS(ipfsHash) {
    try {
        const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.blob();
        }
    } catch (error) {
        console.error('Error fetching from IPFS:', error);
        return null;
    }
}
