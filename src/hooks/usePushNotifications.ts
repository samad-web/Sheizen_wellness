import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// VAPID public key - hardcoded for frontend use (public keys are meant to be public!)
const VAPID_PUBLIC_KEY = "BKbNBg2FSUHZhfEJTfzFTUcoDRfqKHr5x5gQSDsTczmFv2-z1KZj0lVYv71ozBxKDcUwaX9vHm4pXIgxRFQ1dxs";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function usePushNotifications(clientId: string | null) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  const checkSubscriptionStatus = useCallback(async () => {
    if (!clientId) return;

    try {
      // First check if permission is already denied - don't try to access pushManager if so
      if (Notification.permission === 'denied') {
        setIsSubscribed(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      // Silently handle errors - don't show toast on initial check
      console.error('Error checking subscription:', error);
      setIsSubscribed(false);
    }
  }, [clientId]);

  // Refresh permission status manually (fallback for browsers without Permissions API)
  const refreshPermissionStatus = useCallback(() => {
    if (typeof Notification !== 'undefined') {
      const newStatus = Notification.permission;
      setPermissionStatus(newStatus);

      // If permission is now granted, re-check subscription status
      if (newStatus === 'granted') {
        checkSubscriptionStatus();
      }
    }
  }, [checkSubscriptionStatus]);

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    // Set initial permission status
    if (typeof Notification !== 'undefined') {
      setPermissionStatus(Notification.permission);
    }

    // Use Permissions API to listen for permission changes
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' as PermissionName }).then((status) => {
        // Update on initial query
        if (typeof Notification !== 'undefined') {
          setPermissionStatus(Notification.permission);
        }

        // Listen for changes
        status.onchange = () => {
          if (typeof Notification !== 'undefined') {
            const newStatus = Notification.permission;
            setPermissionStatus(newStatus);

            // Re-check subscription status when permission changes to granted
            if (newStatus === 'granted') {
              checkSubscriptionStatus();
            } else if (newStatus === 'denied') {
              setIsSubscribed(false);
            }
          }
        };
      }).catch(() => {
        // Fallback for browsers that don't support this - just use initial value

      });
    }

    if (clientId && supported) {
      checkSubscriptionStatus();
    }
  }, [clientId, checkSubscriptionStatus]);

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in your browser');
      return false;
    }

    // Check current permission state first
    const currentPermission = Notification.permission;

    if (currentPermission === 'denied') {
      toast.error('Notification permission was previously denied. Please enable it in your browser settings.');
      return false;
    }

    if (currentPermission === 'granted') {
      return true;
    }

    // Only request permission if it's 'default' (not yet asked)
    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);

    if (permission !== 'granted') {
      toast.error('Notification permission denied');
      return false;
    }

    return true;
  };

  const subscribe = async () => {
    if (!clientId) return;

    setIsLoading(true);
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed to push service (possibly with old key) and unsubscribe
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }

      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);


      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      // Save subscription to database
      const { error } = await supabase.from('push_subscriptions').upsert({
        client_id: clientId,
        endpoint: subscription.endpoint,
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: arrayBufferToBase64(subscription.getKey('auth')),
        user_agent: navigator.userAgent,
      });

      if (error) throw error;

      setIsSubscribed(true);
      toast.success('Notifications enabled successfully!');
    } catch (error: any) {
      console.error('Error subscribing to push:', error);
      toast.error(`Failed to enable notifications: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!clientId) return;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('client_id', clientId)
          .eq('endpoint', subscription.endpoint);

        setIsSubscribed(false);
        toast.success('Notifications disabled');
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Failed to disable notifications');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permissionStatus,
    subscribe,
    unsubscribe,
    refreshPermissionStatus,
  };
}
