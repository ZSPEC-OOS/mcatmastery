// lib/model-router.ts
// Dynamic model router that auto-detects API format from Base URL

interface ModelRequest {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  maxTokens?: number;
}

interface ModelResponse {
  success: boolean;
  content: string;
  error?: string;
}

export async function routeModelRequest({
  baseUrl,
  apiKey,
  model,
  prompt,
  maxTokens = 4096
}: ModelRequest): Promise<ModelResponse> {
  // Detect provider from Base URL
  const isAnthropic = baseUrl.includes('anthropic.com') || 
                      baseUrl.includes('/v1/messages');
  
  if (isAnthropic) {
    return await callAnthropicAPI({ baseUrl, apiKey, model, prompt, maxTokens });
  } else {
    return await callOpenAICompatibleAPI({ baseUrl, apiKey, model, prompt, maxTokens });
  }
}

async function callAnthropicAPI({
  baseUrl,
  apiKey,
  model,
  prompt,
  maxTokens
}: ModelRequest): Promise<ModelResponse> {
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, content: '', error: `Anthropic API error: ${response.status} - ${error}` };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || data.content || '';
    return { success: true, content, error: undefined };
    
  } catch (error) {
    return { success: false, content: '', error: error instanceof Error ? error.message : String(error) };
  }
}

async function callOpenAICompatibleAPI({
  baseUrl,
  apiKey,
  model,
  prompt,
  maxTokens
}: ModelRequest): Promise<ModelResponse> {
  try {
    let endpoint = baseUrl;
    if (!baseUrl.includes('/chat/completions') && !baseUrl.includes('/completions')) {
      endpoint = baseUrl.replace(/\/$/, '') + '/v1/chat/completions';
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, content: '', error: `API error: ${response.status} - ${error}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 
                    data.choices?.[0]?.text || 
                    data.content || 
                    '';
    return { success: true, content, error: undefined };
    
  } catch (error) {
    return { success: false, content: '', error: error instanceof Error ? error.message : String(error) };
  }
}

export async function testCustomModelConnection(baseUrl: string, apiKey: string, model: string) {
  const result = await routeModelRequest({
    baseUrl,
    apiKey,
    model,
    prompt: 'Respond with exactly: "CONNECTED" (one word only)',
    maxTokens: 10
  });
  
  if (result.success && result.content.includes('CONNECTED')) {
    return { success: true, message: 'Connection successful!' };
  } else {
    return { success: false, message: result.error || 'Invalid response format' };
  }
}
