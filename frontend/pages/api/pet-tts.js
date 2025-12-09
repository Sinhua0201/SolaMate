// Pet TTS API - Using ElevenLabs eleven_turbo_v2 (free model)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || '4TfTGcPwoefWe878B0rm';

  if (!apiKey) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_turbo_v2', // Free model
          voice_settings: {
            stability: 0.3, // Lower = more expressive/animated
            similarity_boost: 0.8,
            style: 0.7, // More stylized/cartoon-like
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs API error:', error);
      return res.status(500).json({ error: 'Failed to generate speech' });
    }

    // Get audio buffer
    const audioBuffer = await response.arrayBuffer();
    
    // Convert to base64
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    return res.status(200).json({ 
      audio: base64Audio,
      contentType: 'audio/mpeg'
    });
  } catch (error) {
    console.error('TTS error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
