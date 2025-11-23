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
    const { client_id, assessment_type, notes } = await req.json();
    
    console.log('Requesting assessment:', { client_id, assessment_type });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get auth header and verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Create assessment request
    const { data: request, error: requestError } = await supabase
      .from('assessment_requests')
      .insert({
        client_id,
        assessment_type,
        status: 'pending',
        requested_by: user.id,
        notes: notes || `Requested via admin dashboard`
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating request:', requestError);
      throw requestError;
    }

    console.log('Assessment request created:', request.id);

    // Get client details
    const { data: client } = await supabase
      .from('clients')
      .select('name, user_id')
      .eq('id', client_id)
      .single();

    if (!client) {
      throw new Error('Client not found');
    }

    // Format assessment type for display
    const assessmentTypeMap: Record<string, { title: string; description: string }> = {
      'health_assessment': {
        title: 'Health Assessment',
        description: 'Please complete your health assessment form to help us create a personalized plan for you.'
      },
      'stress_assessment': {
        title: 'Stress Assessment',
        description: 'Please complete your stress assessment to help us understand your current stress levels.'
      },
      'sleep_assessment': {
        title: 'Sleep Assessment',
        description: 'Please complete your sleep assessment to help us improve your sleep quality.'
      }
    };

    const assessmentInfo = assessmentTypeMap[assessment_type] || {
      title: 'Assessment',
      description: 'Please complete your assessment form.'
    };

    const messageContent = `📋 **${assessmentInfo.title} Requested**\n\n${assessmentInfo.description}\n\nClick the button below to get started.`;

    // Create message for client
    const { error: messageError } = await supabase.from('messages').insert({
      client_id,
      sender_id: user.id,
      sender_type: 'system',
      message_type: 'assessment_request',
      content: messageContent,
      metadata: {
        assessment_type,
        request_id: request.id,
        assessment_title: assessmentInfo.title
      }
    });

    if (messageError) {
      console.error('Error creating message:', messageError);
    }

    // Send push notification
    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          client_id,
          title: `${assessmentInfo.title} Requested`,
          body: 'Please complete your assessment form',
          data: {
            type: 'assessment_request',
            request_id: request.id,
            assessment_type
          }
        }
      });
    } catch (pushError) {
      console.error('Error sending push notification:', pushError);
      // Don't fail the request if push fails
    }

    console.log('Assessment request completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        request,
        message: 'Assessment request sent to client successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in request-assessment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
