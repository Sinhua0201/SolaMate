/**
 * API Route: Upload JSON to IPFS via Pinata
 * POST /api/ipfs/upload-json
 */

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { data, metadata = {} } = req.body;

        if (!data) {
            return res.status(400).json({ error: 'No data provided' });
        }

        const body = {
            pinataContent: data,
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
                'pinata_api_key': process.env.PINATA_API_KEY,
                'pinata_secret_api_key': process.env.PINATA_SECRET_KEY
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Pinata API error: ${error}`);
        }

        const result = await response.json();
        const ipfsHash = result.IpfsHash;

        return res.status(200).json({
            success: true,
            ipfsHash,
            url: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
            publicUrl: `https://ipfs.io/ipfs/${ipfsHash}`
        });

    } catch (error) {
        console.error('Error uploading JSON to IPFS:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
