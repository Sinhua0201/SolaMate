import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';

/**
 * Voice Input Component
 * 语音输入组件 - 点击按钮开始录音
 */
export function VoiceInput({ onTranscript, disabled = false }) {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState(null);

    const startVoiceInput = () => {
        // 检查浏览器支持
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setError('Your browser does not support voice input');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        // 配置
        recognition.lang = 'en-US'; // 可以改成 'zh-CN' 支持中文
        recognition.continuous = false; // 说完就停
        recognition.interimResults = false; // 只要最终结果
        recognition.maxAlternatives = 1;

        setIsListening(true);
        setError(null);

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Voice input:', transcript);
            onTranscript(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setError(`Error: ${event.error}`);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        try {
            recognition.start();
        } catch (err) {
            console.error('Failed to start recognition:', err);
            setError('Failed to start voice input');
            setIsListening(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <Button
                onClick={startVoiceInput}
                disabled={disabled || isListening}
                className={`relative ${isListening
                        ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                size="lg"
            >
                {isListening ? (
                    <>
                        <MicOff className="h-5 w-5 mr-2" />
                        Recording...
                    </>
                ) : (
                    <>
                        <Mic className="h-5 w-5 mr-2" />
                        Voice Input
                    </>
                )}
            </Button>

            {error && (
                <p className="text-xs text-red-400">{error}</p>
            )}

            {isListening && (
                <p className="text-xs text-neutral-400 animate-pulse">
                    Listening... Speak now
                </p>
            )}
        </div>
    );
}
