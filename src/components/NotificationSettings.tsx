import { Bell, BellOff, CheckCircle, XCircle, AlertCircle, Settings, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationSettingsProps {
  clientId: string | null;
}

export function NotificationSettings({ clientId }: NotificationSettingsProps) {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permissionStatus,
    subscribe,
    unsubscribe,
    refreshPermissionStatus
  } = usePushNotifications(clientId);

  const getStatusInfo = () => {
    if (!isSupported) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      return {
        icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
        title: isIOS ? "PWA Required" : "Not Supported",
        description: isIOS
          ? "iOS requires you to add this app to your Home Screen to enable notifications."
          : "Push notifications are not supported in your browser.",
        color: isIOS ? "text-yellow-500" : "text-destructive"
      };
    }

    if (permissionStatus === 'denied') {
      return {
        icon: <XCircle className="h-5 w-5 text-destructive" />,
        title: "Blocked",
        description: "Notifications are blocked. Follow the instructions below to enable them.",
        color: "text-destructive"
      };
    }

    if (permissionStatus === 'granted' && isSubscribed) {
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        title: "Enabled",
        description: "You will receive push notifications for important updates.",
        color: "text-green-500"
      };
    }

    return {
      icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
      title: "Not Enabled",
      description: "Enable notifications to stay updated on your health journey.",
      color: "text-yellow-500"
    };
  };

  const statusInfo = getStatusInfo();

  const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('chrome')) {
      return {
        browser: "Chrome",
        steps: [
          "Click the lock icon (🔒) in the address bar",
          "Find 'Notifications' in the dropdown",
          "Change from 'Block' to 'Allow'",
          "Refresh the page"
        ]
      };
    }

    if (userAgent.includes('firefox')) {
      return {
        browser: "Firefox",
        steps: [
          "Click the lock icon (🔒) in the address bar",
          "Click 'Connection secure' → 'More Information'",
          "Go to 'Permissions' tab",
          "Find 'Send Notifications' and click 'Allow'",
          "Refresh the page"
        ]
      };
    }

    if (userAgent.includes('safari')) {
      return {
        browser: "Safari",
        steps: [
          "Go to Safari → Settings → Websites",
          "Click 'Notifications' in the sidebar",
          "Find this website and change to 'Allow'",
          "Refresh the page"
        ]
      };
    }

    if (userAgent.includes('edg')) {
      return {
        browser: "Edge",
        steps: [
          "Click the lock icon (🔒) in the address bar",
          "Click 'Permissions for this site'",
          "Find 'Notifications' and change to 'Allow'",
          "Refresh the page"
        ]
      };
    }

    return {
      browser: "your browser",
      steps: [
        "Open your browser settings",
        "Navigate to Site Settings or Permissions",
        "Find Notifications settings",
        "Allow notifications for this site",
        "Refresh the page"
      ]
    };
  };

  const browserInstructions = getBrowserInstructions();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Manage how you receive updates and reminders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status indicator */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          {statusInfo.icon}
          <div className="flex-1">
            <p className={`font-medium ${statusInfo.color}`}>{statusInfo.title}</p>
            <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
          </div>
        </div>

        {/* iOS PWA Instructions */}
        {!isSupported && /iPad|iPhone|iPod/.test(navigator.userAgent) && (
          <div className="border border-yellow-200 bg-yellow-50/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-800">
              <RefreshCw className="h-4 w-4" />
              How to enable on iPhone/iPad
            </div>
            <ol className="text-sm text-yellow-700 space-y-2 list-decimal list-inside">
              <li>Tap the <strong>Share</strong> button (box with upward arrow)</li>
              <li>Scroll down and tap <strong>'Add to Home Screen'</strong></li>
              <li>Open the app from your Home Screen</li>
              <li>Go back to these settings and click <strong>'Enable'</strong></li>
            </ol>
          </div>
        )}

        {/* Action button */}
        {isSupported && permissionStatus !== 'denied' && (
          <div className="space-y-2">
            <Button
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={isLoading}
              variant={isSubscribed ? "outline" : "default"}
              className="w-full"
            >
              {isLoading ? (
                "Processing..."
              ) : isSubscribed ? (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Disable Notifications
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable Notifications
                </>
              )}
            </Button>

            {isSubscribed && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={async () => {
                  try {
                    await supabase.functions.invoke('send-push-notification', {
                      body: {
                        client_id: clientId,
                        title: 'Test Notification 🔔',
                        body: 'This is a test to verify your notifications are working correctly!',
                        url: '/dashboard',
                      }
                    });
                    toast.success("Test notification sent!");
                  } catch (err) {
                    toast.error("Failed to send test notification.");
                  }
                }}
              >
                Send Test Notification
              </Button>
            )}
          </div>
        )}

        {/* Re-enable instructions when blocked */}
        {permissionStatus === 'denied' && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings className="h-4 w-4" />
              How to enable notifications in {browserInstructions.browser}
            </div>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              {browserInstructions.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>

            {/* Check Again button - fallback for browsers without Permissions API change events */}
            <Button
              variant="outline"
              size="sm"
              onClick={refreshPermissionStatus}
              className="w-full mt-3"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
