import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function processOpenAIStream(stream: ReadableStream): Promise<ReadableStream> {
  const reader = stream.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('Stream complete');
            controller.close();
            break;
          }

          const chunk = decoder.decode(value);
          console.log('Received chunk:', chunk);
          
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim() === '') continue;
            
            if (line.includes('[DONE]')) {
              console.log('Received [DONE] signal');
              controller.close();
              return;
            }

            if (line.startsWith('data: ')) {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices[0]?.delta?.content;
                if (content) {
                  console.log('Processing content:', content);
                  controller.enqueue(encoder.encode(content));
                }
              } catch (error) {
                console.error('Error parsing JSON:', error);
                console.error('Problematic line:', line);
                continue;
              }
            }
          }
        }
      } catch (error) {
        console.error('Stream processing error:', error);
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    }
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, model } = await req.json();
    console.log('Received request:', { model, messageCount: messages.length });
    console.log('Messages:', JSON.stringify(messages, null, 2));

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY is not set');
      throw new Error('OpenAI API key is not configured');
    }

    console.log('Sending request to OpenAI...');
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: messages.map(({ role, content }) => ({ role, content })),
        stream: true,
      }),
    });

    if (!openAIResponse.ok) {
      const error = await openAIResponse.json();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    console.log('OpenAI response status:', openAIResponse.status);

    if (!openAIResponse.body) {
      throw new Error('No response body from OpenAI');
    }

    // Process and transform the OpenAI stream
    const processedStream = await processOpenAIStream(openAIResponse.body);

    return new Response(processedStream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});