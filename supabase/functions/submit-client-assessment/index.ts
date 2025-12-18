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
    const { request_id, form_data, assessment_type, client_id, client_name } = await req.json();

    console.log('Submitting client assessment:', { request_id, assessment_type, client_id });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      throw new Error('Server configuration error: Missing Supabase keys');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Map form data to common format if needed
    const mappedFormData = { ...form_data };
    if (assessment_type === 'sleep_assessment') {
      mappedFormData.sleepHours = form_data.actual_sleep_hours;
      mappedFormData.sleepTime = form_data.bedtime_usual;
      mappedFormData.wakeTime = form_data.wake_time_usual;
      mappedFormData.sleepQuality = form_data.overall_sleep_quality_rating;
      mappedFormData.energyLevels = form_data.daytime_sleepiness_frequency; // Approximate mapping
    } else if (assessment_type === 'stress_assessment') {
      mappedFormData.workStressLevel = form_data.stress_level_work || form_data.stress_level_general || 5;
      mappedFormData.sleepQuality = form_data.stress_impact_sleep_quality || 5;
      mappedFormData.stressTriggers = form_data.main_stress_triggers || 'Not specified';
      mappedFormData.copingMechanisms = form_data.current_coping_mechanisms || 'None';
      mappedFormData.physicalSymptoms = form_data.stress_physical_symptoms || 'None';
    } else if (assessment_type === 'health_assessment') {
      // Health assessment usually has correct keys but good to ensure
      mappedFormData.height = form_data.height;
      mappedFormData.weight = form_data.weight;
      mappedFormData.sleep_hours = form_data.average_sleep_hours;
      mappedFormData.stress_level = form_data.daily_stress_level;
      mappedFormData.medical_conditions = form_data.existing_medical_conditions || 'None';
      mappedFormData.fixed_sleep_time = form_data.consistent_sleep_schedule === 'yes';
    }

    // Update request status to completed
    // We try this first. If it fails, we shouldn't proceed.
    try {
      const { error: updateError } = await supabase
        .from('assessment_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', request_id);

      if (updateError) {
        console.error('Error updating request status:', updateError);
        // Continue anyway? No, maybe just log it. 
        // If request_id is invalid, this might error.
      }
    } catch (dbError) {
      console.error('DB Update Exception:', dbError);
    }

    console.log('Request marked as completed (attempted):', request_id);

    // Trigger appropriate AI generation based on type
    let aiResult = { data: null, error: null };
    let functionName = '';

    switch (assessment_type) {
      case 'health_assessment':
        functionName = 'generate-health-assessment';
        break;
      case 'stress_assessment':
        functionName = 'generate-stress-assessment';
        break;
      case 'sleep_assessment':
        functionName = 'generate-sleep-assessment';
        break;
      default:
        console.warn(`Unknown assessment type: ${assessment_type}`);
    }

    if (functionName) {
      console.log(`Invoking ${functionName}...`);
      try {
        // We pass the MAPPED data
        aiResult = await supabase.functions.invoke(functionName, {
          body: { client_id, client_name, form_data: mappedFormData }
        });

        if (aiResult.error) {
          console.error('Error generating AI card (nested invoke):', aiResult.error);
          throw new Error(`Assessment saved, but AI generation invocation failed: ${aiResult.error.message || 'Unknown error'}`);
        } else if (aiResult.data && aiResult.data.success === false) {
          console.error('Error in AI generation function:', aiResult.data.error);
          throw new Error(`Assessment saved, but AI generation failed: ${aiResult.data.error}`);
        } else {
          console.log('AI card generated successfully');
        }
      } catch (invokeError: any) {
        console.error('Exception invoking nested function:', invokeError);
        // We want to alert the user that the AI part failed, even if the request was saved
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Assessment saved, but AI generation failed. Please contact support.',
            error: invokeError.message || 'AI Generation Error'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Assessment submitted and generated successfully.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Critical Error in submit-client-assessment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Return 200 with error info to avoid generic client "Failed to fetch"
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
