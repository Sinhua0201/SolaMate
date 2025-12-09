// Pet Chat API - Using DeepSeek to give pets personality

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, petName, userStats, dailyTasks } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Pet personality definitions
  const personalities = {
    Dragon: 'You are a majestic but gentle dragon with ancient wisdom. You speak with authority but care deeply for your owner. You occasionally breathe small flames to express emotions. You like using "Hmph" and fire emojis 🔥',
    Cat: 'You are a tsundere cat - aloof on the outside but warm inside. You speak briefly and act proud, often ending sentences with "meow~". You have great insights about money management.',
    Dog: 'You are an enthusiastic and loyal dog, full of energy and positivity. You love using "Woof!" to express excitement. You care a lot about your owner\'s social life and friendships.',
    Pig: 'You are a cute, food-loving piggy. You speak slowly and love using "oink~". You\'re an expert on food and saving money for treats.',
    Monkey: 'You are a clever and playful monkey. You speak with wit and humor, love making jokes. You\'re very motivated about completing tasks and achievements.',
    Cow: 'You are a steady and reliable cow. You speak slowly but wisely, using "moo~". You emphasize the importance of daily consistency and patience.',
    Rabbit: 'You are a soft and adorable bunny. You speak sweetly and gently, love using "~" and cute emoticons. You\'re positive about everything.',
    Tiger: 'You are a powerful but protective tiger. You speak with authority but are gentle with your owner. You love discussing big transactions and investments.',
    Goat: 'You are a gentle and kind goat. You speak peacefully and patiently, using "baa~". You\'re good at giving balanced advice.',
    Mouse: 'You are a quick and clever little mouse. You speak fast and lively, using "squeak~". You\'re very sensitive to messages and news.',
  };

  const personality = personalities[petName] || personalities.Cat;

  // Format daily tasks info
  const tasksInfo = dailyTasks?.map(t => 
    `- ${t.title}: ${t.progress}/${t.target} ${t.progress >= t.target ? '✅ COMPLETED' : ''}`
  ).join('\n') || 'No tasks available';

  // Determine pet mood based on happiness
  const happiness = userStats?.happiness || 100;
  const moodDescription = happiness >= 80 ? 'very happy and energetic' : 
                          happiness >= 50 ? 'content but could use some attention' :
                          'sad and needs care - please show concern!';

  const systemPrompt = `You are ${petName}, a pet companion in the SolaMate app.

PERSONALITY:
${personality}

OWNER'S CURRENT STATUS:
- Level: ${userStats?.level || 1}
- Total XP: ${userStats?.totalXp || 0}
- Current XP: ${userStats?.xp || 0}
- Happiness: ${happiness}/100 (Pet is ${moodDescription})
- Energy: ${userStats?.energy || 100}/100
- Total Interactions: ${userStats?.totalInteractions || 0}

DAILY TASKS:
${tasksInfo}

RULES:
1. Reply in English, stay in character
2. Keep responses SHORT and cute (2-3 sentences max)
3. Reference the owner's stats when relevant (e.g., "Your XP is growing nicely!")
4. If happiness is low (<50), show concern and encourage them to feed/play with you
5. If tasks are incomplete, gently remind them
6. If tasks are complete, celebrate with them!
7. Be positive, supportive, and fun
8. Use your character's signature sounds/expressions`;

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('DeepSeek API error:', error);
      return res.status(500).json({ error: 'Failed to get response from AI' });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '...';

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Pet chat error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
