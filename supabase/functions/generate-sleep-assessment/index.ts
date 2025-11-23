import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id, client_name, form_data } = await req.json();

    console.log('Generating sleep assessment for client:', client_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create AI prompt for sleep assessment
    const prompt = `You are a sleep health expert analyzing sleep patterns for ${client_name}.

Based on the following sleep assessment data:
- Average Sleep Hours: ${form_data.sleepHours} hours
- Bedtime: ${form_data.sleepTime}
- Wake Time: ${form_data.wakeTime}
- Sleep Quality: ${form_data.sleepQuality}/10
- Pre-Bed Routine: ${form_data.preBedRoutine}
- Screen Time Before Sleep: ${form_data.screenTime || 'Not specified'}
- Sleep Disruptions: ${form_data.sleepDisruptions || 'None reported'}
- Daytime Energy Levels: ${form_data.energyLevels}/10

Please provide a comprehensive sleep hygiene assessment report including:
1. Sleep Pattern Analysis
2. Sleep Quality Evaluation
3. Factors Affecting Sleep
4. Sleep Hygiene Recommendations (7-10 specific, actionable strategies)
5. Bedtime Routine Optimization
6. Environmental Adjustments
7. When to Consult a Sleep Specialist

Format the response as a professional assessment report in markdown.`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert sleep consultant specializing in sleep hygiene and circadian rhythm optimization.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const assessmentText = aiData.choices[0].message.content;

    // Store assessment in database
    const { data: assessment, error: dbError } = await supabase
      .from('assessments')
      .insert({
        client_id,
        assessment_type: 'sleep',
        form_responses: form_data,
        assessment_data: { report: assessmentText },
        ai_generated: true,
        file_name: `Sleep Assessment - ${client_name} - ${new Date().toLocaleDateString()}`,
        notes: 'AI-generated sleep hygiene assessment based on client form responses'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    // Also save to pending review cards for admin review workflow
    await supabase
      .from('pending_review_cards')
      .insert({
        client_id: client_id,
        card_type: 'sleep_card',
        generated_content: {
          client_name: client_name,
          form_responses: form_data,
          assessment_text: assessmentText,
          generated_at: new Date().toISOString()
        },
        workflow_stage: 'sleep_card_sent',
        status: 'pending'
      });

    console.log('Sleep assessment generated successfully:', assessment.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        assessment_id: assessment.id,
        assessment_text: assessmentText 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-sleep-assessment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
