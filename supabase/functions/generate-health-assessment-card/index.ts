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
    const { client_id, client_name } = await req.json();

    console.log(`Generating health assessment card for client ${client_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*, diet_preferences(*)')
      .eq('id', client_id)
      .single();

    if (clientError) throw clientError;

    // Get latest daily log
    const { data: dailyLogs } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('client_id', client_id)
      .order('log_date', { ascending: false })
      .limit(1);

    const latestLog = dailyLogs?.[0];

    // Fetch recent assessments
    const { data: assessments } = await supabase
      .from('assessments')
      .select('*')
      .eq('client_id', client_id)
      .eq('assessment_type', 'health')
      .order('created_at', { ascending: false })
      .limit(1);

    const latestAssessment = assessments?.[0];

    // Calculate BMI, BMR, ideal weight
    const height = latestAssessment?.form_responses?.height || 170;
    const weight = latestLog?.weight || client.last_weight || 70;
    const age = client.age || 30;
    const gender = client.gender || 'male';

    const heightM = height / 100;
    const bmi = (weight / (heightM * heightM)).toFixed(1);
    
    // Mifflin-St Jeor equation
    let bmr;
    if (gender === 'male') {
      bmr = Math.round((10 * weight) + (6.25 * height) - (5 * age) + 5);
    } else {
      bmr = Math.round((10 * weight) + (6.25 * height) - (5 * age) - 161);
    }

    const idealWeight = (22.5 * heightM * heightM).toFixed(1);
    const calorieIntake = client.target_kcal || bmr * 1.2;
    const proteinIntake = (parseFloat(idealWeight) * 1.4).toFixed(1);

    // Generate AI assessment using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const prompt = `You are a professional dietitian creating a comprehensive health assessment card for ${client_name}.

Based on the following client data:
- Name: ${client_name}
- Age: ${age}
- Gender: ${gender}
- Height: ${height} cm
- Weight: ${weight} kg
- BMI: ${bmi}
- BMR: ${bmr} kcal
- Ideal Weight: ${idealWeight} kg
- Recommended Calorie Intake: ${calorieIntake} kcal
- Recommended Protein Intake: ${proteinIntake} g
- Goals: ${client.goals || 'General wellness'}
- Activity Level: ${latestLog?.activity_minutes || 0} min/day
- Sleep: ${latestAssessment?.form_responses?.sleep_hours || 7} hrs/night
- Water Intake: ${latestLog?.water_intake || 2} liters/day
- Stress Level: ${latestAssessment?.form_responses?.stress_level || 5}/10

Generate a professional health assessment with key findings and recommendations. Focus on:
1. Current health status analysis
2. Lifestyle pattern observations
3. Dietary assessment insights
4. Recommended health goals
5. Next steps and action items

Format as a detailed professional report suitable for a dietitian review.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert dietitian creating professional health assessment cards.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiAnalysis = aiData.choices[0].message.content;

    // Structure the card data
    const cardData = {
      client_details: {
        name: client_name,
        age: age,
        gender: gender
      },
      key_findings: {
        height: height,
        weight: weight,
        bmi: parseFloat(bmi),
        bmr: bmr,
        ideal_weight: parseFloat(idealWeight),
        calorie_intake: calorieIntake,
        protein_intake: parseFloat(proteinIntake),
        medical_condition: latestAssessment?.form_responses?.medical_conditions || ''
      },
      lifestyle_patterns: {
        physical_activity: latestLog?.activity_minutes || 0,
        stress_level: latestAssessment?.form_responses?.stress_level || 5,
        sleep_hours: latestAssessment?.form_responses?.sleep_hours || 7,
        water_intake: latestLog?.water_intake || 2,
        fixed_sleep_time: latestAssessment?.form_responses?.fixed_sleep_time || false
      },
      ai_analysis: aiAnalysis,
      generated_at: new Date().toISOString()
    };

    // Save to pending review cards
    const { data: card, error: cardError } = await supabase
      .from('pending_review_cards')
      .insert({
        client_id: client_id,
        card_type: 'health_assessment',
        generated_content: cardData,
        workflow_stage: 'health_assessment_sent',
        status: 'pending'
      })
      .select()
      .single();

    if (cardError) throw cardError;

    console.log(`Health assessment card generated for client ${client_id}, card ID: ${card.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        card_id: card.id,
        message: 'Health assessment card generated and pending admin review'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-health-assessment-card:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
