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
    console.log('Generating health assessment for client:', client_id);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch client data for additional context
    const { data: clientData } = await supabaseClient
      .from('clients')
      .select('age, gender, goals, program_type')
      .eq('id', client_id)
      .single();

    // Create comprehensive AI prompt
    const prompt = `You are a certified nutritionist analyzing a client's health assessment. Generate a comprehensive, professional health assessment report in JSON format.

**Client Information:**
- Name: ${client_name}
- Age: ${clientData?.age || form_data.age || 'Not specified'}
- Gender: ${clientData?.gender || form_data.gender || 'Not specified'}
- Height: ${form_data.height_cm} cm
- Weight: ${form_data.weight_kg} kg
- BMI: ${form_data.bmi}
- BMR: ${form_data.bmr_kcal}
- Diet Recall: ${JSON.stringify(form_data.diet_recall || {})}
- Medical Conditions: ${form_data.medical_condition || 'None'}
- Goals: ${form_data.goal_weight_loss_kg ? `Weight loss: ${form_data.goal_weight_loss_kg}kg` : ''} ${form_data.goal_other || ''}

Return a valid JSON object with the following structure (do not include markdown formatting around the JSON):
{
  "client_details": {
    "name": "${client_name}",
    "age": number,
    "gender": "string"
  },
  "key_findings": {
    "height": number (cm),
    "weight": number (kg),
    "bmi": number,
    "bmr": number,
    "ideal_weight": number,
    "calorie_intake": number,
    "protein_intake": number
  },
  "medical_history": {
    "conditions": ["string"],
    "medications": ["string"],
    "allergies": ["string"]
  },
  "lifestyle": {
    "diet": "string summary",
    "exercise": "string summary",
    "sleep": "string summary",
    "stress_level": "string selection"
  },
  "health_goals": ["string"],
  "recommendations": ["string"],
  "ai_analysis": "string (full Markdown formatted detailed analysis text)",
  "summary": "string (brief summary)"
}
`;

    console.log('Calling OpenAI API for assessment generation...');

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    // Call OpenAI for text generation
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
          { role: 'system', content: 'You are an expert nutritionist creating professional health assessments. Always respond in valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI generation failed:', aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let generatedContent = {};
    try {
      generatedContent = JSON.parse(aiData.choices[0].message.content);
    } catch (e) {
      console.error("Failed to parse AI JSON:", e);
      // Fallback or re-throw
      generatedContent = { ai_analysis: aiData.choices[0].message.content };
    }

    console.log('Assessment generated successfully');

    // Insert assessment into database (Assessments table)
    const { data: assessment, error: insertError } = await supabaseClient
      .from('assessments')
      .insert({
        client_id,
        assessment_type: 'health',
        ai_generated: true,
        assessment_data: generatedContent,
        form_responses: form_data,
        file_name: `Health Assessment - ${client_name} - ${new Date().toLocaleDateString()}`,
        notes: 'AI-generated health assessment',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting assessment:', insertError);
      throw insertError;
    }

    // Insert into pending_review_cards for Admin Review
    const { error: cardError } = await supabaseClient
      .from('pending_review_cards')
      .insert({
        client_id: client_id,
        card_type: 'health_assessment',
        generated_content: generatedContent,
        workflow_stage: 'health_assessment_generated',
        status: 'pending',
        ai_generated_at: new Date().toISOString()
      });

    if (cardError) {
      console.error('Error creating pending card:', cardError);
      // CRITICAL UPDATE: Throw error so users know why it failed
      throw new Error(`Failed to create pending review card: ${cardError.message}`);
    }

    console.log('Assessment saved to database:', assessment.id);

    return new Response(
      JSON.stringify({
        assessment_id: assessment.id,
        assessment_data: generatedContent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-health-assessment:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message, stack: error.stack }),
      {
        status: 200, // Return 200 so the caller (submit-client-assessment) can read the JSON body
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
