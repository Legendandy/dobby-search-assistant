
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, apiKey, maxTokens = 300 } = req.body;

    console.log('Received request:', { query: query?.substring(0, 50), hasApiKey: !!apiKey, maxTokens });

    if (!query || !apiKey) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: `Missing: ${!query ? 'query' : ''} ${!apiKey ? 'apiKey' : ''}`.trim()
      });
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
            content: 'You are Dobby, a helpful AI assistant that provides concise, accurate answers to search queries. Keep responses under 200 words and focus on being informative and direct.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        max_tokens: Math.min(maxTokens, 500),
        temperature: 0.7,
        top_p: 1,
        stream: false
      })
    });

    console.log('Fireworks API response status:', aiResponse.status);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Fireworks API error:', errorText);
      
      let errorMessage = 'AI API request failed';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.detail || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${aiResponse.status}: ${errorText}`;
      }
      
      return res.status(aiResponse.status).json({ 
        error: errorMessage,
        details: `Fireworks API returned ${aiResponse.status}`
      });
    }

    const aiData = await aiResponse.json();
    console.log('Fireworks API success, choices length:', aiData.choices?.length);
    
    const response = aiData.choices?.[0]?.message?.content || 'No response generated';

    res.status(200).json({ response });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}