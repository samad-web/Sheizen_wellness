import { Bell, BellOff, CheckCircle, XCircle, AlertCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface NotificationSettingsProps {
  clientId: string | null;
}

export function NotificationSettings({ clientId }: NotificationSettingsProps) {
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications(clientId);
  
  const permissionStatus = typeof Notification !== 'undefined' ? Notification.permission : 'default';

  const getStatusInfo = () => {
    if (!isSupported) {
      return {
        icon: <XCircle className="h-5 w-5 text-destructive" />,
        title: "Not Supported",
        description: "Push notifications are not supported in your browser.",
        color: "text-destructive"
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
          <div>
            <p className={`font-medium ${statusInfo.color}`}>{statusInfo.title}</p>
            <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
          </div>
        </div>

        {/* Action button */}
        {isSupported && permissionStatus !== 'denied' && (
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
