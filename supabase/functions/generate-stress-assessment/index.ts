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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create AI prompt for stress assessment
    const prompt = `You are a wellness expert analyzing stress levels for ${client_name}.
    
    Based on the following stress assessment data:
    - Work Stress Level: ${form_data.workStressLevel}/10
    - Sleep Quality (due to stress): ${form_data.sleepQuality}/10
    - Main Stress Triggers: ${form_data.stressTriggers}
    - Current Coping Mechanisms: ${form_data.copingMechanisms}
    - Physical Symptoms: ${form_data.physicalSymptoms || 'None reported'}

    Return a valid JSON object with the following structure (do not include markdown formatting around the JSON):
    {
      "client_details": {
        "name": "${client_name}"
      },
      "key_findings": {
        "stress_level": number,
        "stress_triggers": ["string"],
        "sleep_quality": number,
        "current_coping": ["string"],
        "physical_symptoms": ["string"]
      },
      "lifestyle": {
        "stress_impact_summary": "string"
      },
      "health_goals": ["string"],
      "recommendations": ["string"],
      "ai_analysis": "string (full Markdown formatted detailed analysis text)",
      "summary": "string (brief summary)"
    }`;

    console.log('Calling OpenAI API for stress assessment...');
    let generatedContent = {};

    if (!openaiApiKey) {
      console.warn('Missing OPENAI_API_KEY, using mock response');
      generatedContent = {
        client_details: { name: client_name },
        key_findings: {
          stress_level: form_data.workStressLevel,
          stress_triggers: [form_data.stressTriggers],
          sleep_quality: form_data.sleepQuality,
          current_coping: [form_data.copingMechanisms],
          physical_symptoms: [form_data.physicalSymptoms]
        },
        lifestyle: { stress_impact_summary: "Stress is impacting sleep patterns." },
        health_goals: ["Reduce work stress"],
        recommendations: ["Practice mindfulness", "Take breaks"],
        ai_analysis: "## Mock Analysis\nSystem is in mock mode.",
        summary: "Mock summary."
      };
    } else {
      // Call OpenAI API
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: "json_object" },
          messages: [
            { role: 'system', content: 'You are an expert wellness consultant specializing in stress management. Always respond in valid JSON.' },
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
      try {
        generatedContent = JSON.parse(aiData.choices[0].message.content);
      } catch (e) {
        console.error("Failed to parse AI JSON:", e);
        generatedContent = { ai_analysis: aiData.choices[0].message.content };
      }
    }

    // Store assessment in database
    const { data: assessment, error: dbError } = await supabase
      .from('assessments')
      .insert({
        client_id,
        assessment_type: 'stress',
        form_responses: form_data,
        assessment_data: generatedContent,
        ai_generated: !!openaiApiKey,
        file_name: `Stress Assessment - ${client_name} - ${new Date().toLocaleDateString()}`,
        notes: 'AI-generated stress assessment'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    // Also save to pending review cards for admin review workflow
    const { error: cardError } = await supabase
      .from('pending_review_cards')
      .insert({
        client_id: client_id,
        card_type: 'stress_card',
        generated_content: generatedContent,
        workflow_stage: 'stress_card_generated',
        status: 'pending',
        ai_generated_at: new Date().toISOString()
      });

    if (cardError) {
      console.error('Error creating pending card:', cardError);
      throw new Error(`Failed to create pending review card: ${cardError.message}`);
    }

    console.log('Stress assessment generated successfully:', assessment.id);

    return new Response(
      JSON.stringify({
        success: true,
        assessment_id: assessment.id,
        assessment_data: generatedContent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-stress-assessment:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message, stack: error.stack }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
