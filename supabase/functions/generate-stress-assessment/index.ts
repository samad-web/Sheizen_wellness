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

    console.log('Generating stress assessment for client:', client_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create AI prompt for stress assessment
    const prompt = `You are a wellness expert analyzing stress levels for ${client_name}.

Based on the following stress assessment data:
- Work Stress Level: ${form_data.workStressLevel}/10
- Sleep Quality (due to stress): ${form_data.sleepQuality}/10
- Main Stress Triggers: ${form_data.stressTriggers}
- Current Coping Mechanisms: ${form_data.copingMechanisms}
- Physical Symptoms: ${form_data.physicalSymptoms || 'None reported'}

Please provide a comprehensive stress assessment report including:
1. Overall Stress Analysis
2. Key Stress Factors Identified
3. Impact on Health and Wellbeing
4. Recommended Stress Management Techniques (5-7 specific, actionable strategies)
5. Lifestyle Modifications
6. When to Seek Professional Help

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
          { role: 'system', content: 'You are an expert wellness consultant specializing in stress management and mental health.' },
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
        assessment_type: 'stress',
        form_responses: form_data,
        assessment_data: { report: assessmentText },
        ai_generated: true,
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
        card_type: 'stress_card',
        generated_content: {
          client_name: client_name,
          form_responses: form_data,
          assessment_text: assessmentText,
          generated_at: new Date().toISOString()
        },
        workflow_stage: 'stress_card_sent',
        status: 'pending'
      });

    console.log('Stress assessment generated successfully:', assessment.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        assessment_id: assessment.id,
        assessment_text: assessmentText 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-stress-assessment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
