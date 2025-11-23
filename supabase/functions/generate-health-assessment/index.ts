import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    const prompt = `You are a certified nutritionist analyzing a client's health assessment. Generate a comprehensive, professional health assessment report.

**Client Information:**
- Name: ${client_name}
- Age: ${clientData?.age || form_data.sleepHours || 'Not specified'}
- Gender: ${clientData?.gender || 'Not specified'}
- Goals: ${clientData?.goals || form_data.weightGoals}

**Diet Recall:**
- Breakfast: ${form_data.breakfast}
- Lunch: ${form_data.lunch}
- Dinner: ${form_data.dinner}
- Snacks: ${form_data.snacks || 'None mentioned'}
- Eating Patterns: ${form_data.eatingPatterns}

**Sleep Pattern:**
- Average Hours: ${form_data.sleepHours} hours
- Schedule: ${form_data.sleepSchedule}
- Quality Rating: ${form_data.sleepQuality}/10

**Hydration:**
- Daily Water: ${form_data.dailyWater}ml
- Beverage Habits: ${form_data.beverageHabits}

**Physical Activity:**
- Type: ${form_data.activityType}
- Frequency: ${form_data.activityFrequency} times/week
- Duration: ${form_data.activityDuration} minutes/session
- Intensity: ${form_data.activityIntensity}

**Medical History:**
- Conditions: ${form_data.medicalConditions || 'None reported'}
- Medications: ${form_data.medications || 'None'}
- Supplements: ${form_data.supplements || 'None'}
- Allergies: ${form_data.allergies || 'None'}

**Goals & Timeline:**
- Weight/Health Goals: ${form_data.weightGoals}
- Timeline: ${form_data.timeline}
- Dietary Restrictions: ${form_data.dietaryRestrictions || 'None'}

Generate a detailed professional assessment covering:
1. **Current Health Status Summary** - Overall health snapshot
2. **Dietary Analysis** - Strengths, gaps, areas for improvement
3. **Lifestyle Evaluation** - Sleep, hydration, activity assessment
4. **Risk Factors & Concerns** - Any red flags or areas needing attention
5. **Recommendations** - Specific, actionable nutrition and lifestyle advice
6. **Action Items** - Prioritized steps to achieve goals

Format as a structured, professional medical assessment document suitable for a nutrition consultation. Be specific, evidence-based, and actionable.`;

    console.log('Calling Lovable AI for assessment generation...');

    // Call Lovable AI for text generation
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert nutritionist creating professional health assessments.' },
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
    const assessmentText = aiData.choices[0].message.content;
    console.log('Assessment generated successfully');

    // Structure the assessment data
    const assessmentData = {
      summary: assessmentText,
      diet_analysis: form_data,
      generated_at: new Date().toISOString(),
      client_info: {
        name: client_name,
        age: clientData?.age || form_data.sleepHours,
        gender: clientData?.gender,
        goals: form_data.weightGoals,
      },
    };

    // Insert assessment into database
    const { data: assessment, error: insertError } = await supabaseClient
      .from('assessments')
      .insert({
        client_id,
        ai_generated: true,
        assessment_data: assessmentData,
        form_responses: form_data,
        notes: 'AI-generated health assessment',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting assessment:', insertError);
      throw insertError;
    }

    console.log('Assessment saved to database:', assessment.id);

    return new Response(
      JSON.stringify({
        assessment_id: assessment.id,
        assessment_data: assessmentData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-health-assessment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: error.message.includes('429') ? 429 : error.message.includes('402') ? 402 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
