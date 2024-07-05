export default {
  async fetch(request, env) {
    var api_key = getApiKey(request);
    if(api_key !== env.API_KEY){
      return new Response('Unauthorized', { status: 401 })
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response('Unsupported Media Type', { status: 415 });
    }

    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return new Response('Bad Request: Invalid JSON', { status: 400 });
    }

    if (!requestBody.model || !requestBody.messages || !Array.isArray(requestBody.messages)) {
      return new Response('Bad Request: Missing required fields', { status: 400 });
    }

    try {
      if (requestBody.stream === true) {
        // Streaming response
        const stream = await env.AI.run(requestBody.model, {
          messages: requestBody.messages,
          stream: true,
        });

        const transformedStream = new ReadableStream({
          async start(controller) {
            const reader = stream.getReader();
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();

            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.close();
                break;
              }
              const decodedChunk = decoder.decode(value);
              const formattedChunk = formatStream(decodedChunk, requestBody.model);
              controller.enqueue(encoder.encode(formattedChunk));
            }
          },
        });

        return new Response(transformedStream, {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      } else {
        // Non-streaming response
        const response = await env.AI.run(requestBody.model, {
          messages: requestBody.messages,
        });

        const openAIResponse = formatResponse(response, requestBody.model);
        return Response.json(openAIResponse);
      }
    } catch (error) {
      console.error(error);
      return new Response(JSON.stringify({ error: error.message || 'An error occurred' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};

function formatStream(chunk, model) {
  try {
    const parsedChunk = JSON.parse(chunk.replace('data: ', ''));
    const formattedChunk = {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          delta: {
            content: parsedChunk.response
          }
        }
      ]
    };
    return `data: ${JSON.stringify(formattedChunk)}\n\n`;
  } catch (error) {
    console.error('Error formatting stream chunk:', error);
    return '';
  }
}

function formatResponse(response, model) {
  return {
    id: 'chatcmpl-' + Date.now(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: response.response,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: -1,
      completion_tokens: -1,
      total_tokens: -1,
    },
  };
}

function getApiKey(request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  
  return request.headers.get('api-key')
}
