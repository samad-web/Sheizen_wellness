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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update request status to completed
    const { error: updateError } = await supabase
      .from('assessment_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', request_id);

    if (updateError) {
      console.error('Error updating request:', updateError);
      throw updateError;
    }

    console.log('Request marked as completed:', request_id);

    // Trigger appropriate AI generation based on type
    let aiResult;
    let functionName = '';

    switch (assessment_type) {
      case 'health_assessment':
        functionName = 'generate-health-assessment-card';
        break;
      case 'stress_assessment':
        functionName = 'generate-stress-assessment';
        break;
      case 'sleep_assessment':
        functionName = 'generate-sleep-assessment';
        break;
      default:
        throw new Error(`Unknown assessment type: ${assessment_type}`);
    }

    console.log(`Invoking ${functionName}...`);

    aiResult = await supabase.functions.invoke(functionName, {
      body: { client_id, client_name, form_data }
    });

    if (aiResult.error) {
      console.error('Error generating AI card:', aiResult.error);
      throw new Error(`AI generation failed: ${aiResult.error.message}`);
    }

    console.log('AI card generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Assessment submitted successfully. Your results are being generated and will be reviewed by your coach.',
        ai_result: aiResult.data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in submit-client-assessment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
