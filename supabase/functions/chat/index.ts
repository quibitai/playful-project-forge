import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Create a new TransformStream to process the response
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line === 'data: [DONE]') {
            console.log('Stream complete');
            return;
          }

          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              const content = json.choices[0]?.delta?.content;
              if (content) {
                console.log('Sending content:', content);
                controller.enqueue(new TextEncoder().encode(content));
              }
            } catch (error) {
              console.error('Error processing chunk:', error);
              console.error('Problematic line:', line);
            }
          }
        }
      }
    });

    // Pipe the response through our transform stream
    const processedStream = openAIResponse.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(transformStream)
      .pipeThrough(new TextEncoderStream());

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