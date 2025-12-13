/**
 * Gemini OCR API
 * 使用 Gemini Vision API 识别账单照片
 */

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'Image is required' });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        console.log('Calling Gemini API...');

        // 移除 data URL 前缀
        const base64Data = image.includes(',') ? image.split(',')[1] : image;

        console.log('Base64 data length:', base64Data.length);

        // 调用 Gemini Vision API
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `请识别这张账单图片，提取以下信息并以 JSON 格式返回：
{
  "storeName": "商家名称",
  "date": "日期",
  "items": [
    {"name": "商品名称", "price": 价格}
  ],
  "total": 总金额,
  "currency": "货币单位"
}

如果无法识别某些信息，请用 null 表示。只返回 JSON，不要其他文字。`
                                },
                                {
                                    inline_data: {
                                        mime_type: 'image/jpeg',
                                        data: base64Data,
                                    },
                                },
                            ],
                        },
                    ],
                }),
            }
        );

        const data = await geminiResponse.json();

        console.log('Gemini API response status:', geminiResponse.status);
        console.log('Gemini API response:', JSON.stringify(data).substring(0, 200));

        if (!geminiResponse.ok) {
            console.error('Gemini API error:', data);
            return res.status(500).json({
                error: 'Failed to process image',
                message: data.error?.message || 'Unknown error',
                details: data
            });
        }

        // 提取识别结果
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        console.log('Extracted text:', text.substring(0, 200));

        // 尝试解析 JSON
        let ocrResult;
        try {
            // 移除可能的 markdown 代码块标记
            const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            ocrResult = JSON.parse(jsonText);
        } catch (err) {
            console.log('Failed to parse JSON, using raw text');
            // 如果无法解析为 JSON，返回原始文本
            ocrResult = {
                rawText: text,
                storeName: null,
                date: null,
                items: [],
                total: null,
                currency: null,
            };
        }

        return res.status(200).json({
            success: true,
            result: ocrResult,
            rawText: text,
        });

    } catch (error) {
        console.error('OCR error:', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
