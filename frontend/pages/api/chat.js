/**
 * DeepSeek AI API Route
 * Handles chat completions using DeepSeek API
 * OpenAI-compatible API endpoint with function calling support
 */

import { availableFunctions } from '@/lib/llmActions';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, functions = availableFunctions } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request: messages array required' });
  }

  // Get API key from environment variable
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'DeepSeek API key not configured',
      details: 'Please set DEEPSEEK_API_KEY in your environment variables' 
    });
  }

  try {
    // Prepare request body with function calling support
    const requestBody = {
      model: 'deepseek-chat',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    };
    
    // Add functions if provided (DeepSeek uses 'tools' format)
    if (functions && functions.length > 0) {
      requestBody.tools = functions.map(func => ({
        type: 'function',
        function: func
      }));
      requestBody.tool_choice = 'auto'; // Let AI decide when to call functions
    }
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText };
      }
      console.error('DeepSeek API error:', response.status, errorData);
      
      // If functions are not supported, try without them
      if (response.status === 400 && functions && functions.length > 0) {
        console.log('Retrying without functions...');
        const retryResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });
        
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const retryMessage = retryData.choices?.[0]?.message?.content || 'Sorry, I could not process that request.';
          
          return res.status(200).json({ 
            type: 'message',
            message: retryMessage,
            usage: retryData.usage 
          });
        }
      }
      
      return res.status(response.status).json({ 
        error: 'Failed to get response from AI',
        details: errorData 
      });
    }

    const data = await response.json();
    
    const choice = data.choices?.[0];
    const message = choice?.message;
    
    // Check if AI wants to call a function (DeepSeek uses tool_calls format)
    if (message?.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      return res.status(200).json({
        type: 'function_call',
        function_call: {
          name: toolCall.function.name,
          arguments: toolCall.function.arguments
        },
        usage: data.usage,
      });
    }
    
    // Fallback: Check for old function_call format
    if (message?.function_call) {
      return res.status(200).json({
        type: 'function_call',
        function_call: message.function_call,
        usage: data.usage,
      });
    }
    
    // Get text content
    const aiMessage = message?.content || 'Sorry, I could not process that request.';
    
    // Fallback: Check if the content contains a function call as JSON
    // Some models return function calls in the text content
    try {
      // Try to parse if content looks like JSON
      if (aiMessage.trim().startsWith('{') || aiMessage.includes('"name"') || aiMessage.includes('"arguments"')) {
        // Try to extract JSON
        const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          // Check if it looks like a function call
          if (parsed.name && (parsed.arguments || parsed.destinationAddress)) {
            // Convert to function_call format
            const functionCall = {
              name: parsed.name || 'transfer_funds',
              arguments: typeof parsed.arguments === 'string' 
                ? parsed.arguments 
                : JSON.stringify(parsed.arguments || parsed)
            };
            
            return res.status(200).json({
              type: 'function_call',
              function_call: functionCall,
              usage: data.usage,
            });
          }
        }
      }
    } catch (parseError) {
      // If parsing fails, continue with regular message
      console.log('Not a function call, treating as regular message');
    }
    
    // Regular text response
    return res.status(200).json({ 
      type: 'message',
      message: aiMessage,
      usage: data.usage 
    });
    
  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

