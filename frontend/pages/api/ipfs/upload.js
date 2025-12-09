/**
 * API Route: Upload file to IPFS via Pinata
 * POST /api/ipfs/upload
 */

import formidable from 'formidable';
import fs from 'fs';

// 禁用 Next.js 默认的 body parser
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 解析表单数据
        const form = formidable({
            maxFileSize: 10 * 1024 * 1024, // 10MB
        });

        const [fields, files] = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                resolve([fields, files]);
            });
        });

        const file = files.file[0];
        if (!file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        // 读取文件
        const fileBuffer = fs.readFileSync(file.filepath);
        const blob = new Blob([fileBuffer]);

        // 创建 FormData
        const formData = new FormData();
        formData.append('file', blob, file.originalFilename);

        // 添加元数据
        const metadata = JSON.stringify({
            name: file.originalFilename,
            keyvalues: {
                uploadedBy: 'SolaMate',
                timestamp: Date.now(),
            }
        });
        formData.append('pinataMetadata', metadata);

        // 上传到 Pinata
        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'pinata_api_key': process.env.PINATA_API_KEY,
                'pinata_secret_api_key': process.env.PINATA_SECRET_KEY,
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Pinata API error: ${error}`);
        }

        const data = await response.json();
        const ipfsHash = data.IpfsHash;

        // 清理临时文件
        fs.unlinkSync(file.filepath);

        return res.status(200).json({
            success: true,
            ipfsHash,
            url: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
            publicUrl: `https://ipfs.io/ipfs/${ipfsHash}`,
            filename: file.originalFilename,
            size: file.size
        });

    } catch (error) {
        console.error('Error uploading to IPFS:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
