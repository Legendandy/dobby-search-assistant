export default async function handler(req, res) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, apiKey, maxTokens = 300 } = req.body;

    if (!query || !apiKey) {
      return res.status(400).json({ error: 'Missing query or API key' });
    }

    // Call Fireworks AI API
    const aiResponse = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'accounts/sentientfoundation-serverless/models/dobby-mini-unhinged-plus-llama-3-1-8b',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant that provides concise, accurate answers to search queries. Keep responses under 200 words and focus on being informative and direct.'
          },
          {
            role: 'user',
            content: `Search query: "${query}"\n\nPlease provide a helpful, concise answer to this search query.`
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'AI API request failed');
    }

    const aiData = await aiResponse.json();
    const response = aiData.choices[0]?.message?.content || 'No response generated';

    res.status(200).json({ response });

  } catch (error) {
    console.error('AI API Error:', error);
    res.status(500).json({ 
      error: 'Failed to get AI response',
      details: error.message 
    });
  }
}