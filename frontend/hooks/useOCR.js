import { useState } from 'react';

/**
 * OCR Hook
 * 使用 Gemini API 识别账单照片
 */
export function useOCR() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const recognizeReceipt = async (imageFile) => {
        setLoading(true);
        setError(null);

        try {
            // 将图片转换为 base64
            const base64 = await fileToBase64(imageFile);

            // 调用 OCR API
            const response = await fetch('/api/ocr/gemini', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: base64 }),
            });

            const data = await response.json();

            console.log('OCR API response:', data);

            if (!response.ok) {
                console.error('OCR API error:', data);
                throw new Error(data.error || data.message || JSON.stringify(data.details) || 'OCR failed');
            }

            setLoading(false);
            return {
                success: true,
                result: data.result,
                rawText: data.rawText,
            };
        } catch (err) {
            console.error('OCR error:', err);
            console.error('Error message:', err.message);
            setError(err.message);
            setLoading(false);
            return {
                success: false,
                error: err.message,
            };
        }
    };

    return {
        recognizeReceipt,
        loading,
        error,
    };
}

// 辅助函数：将文件转换为 base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
}
