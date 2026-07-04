import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function useWebPush() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [subscription, setSubscription] = useState<PushSubscriptionJSON | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }
    setIsSupported(true);
    setPermission(Notification.permission);
  }, []);

  const subscribe = useCallback(async (context: {
    businessId: string;
    bookingId?: string;
    queueTicketId?: string;
    locale?: string;
  }) => {
    if (!isSupported || !VAPID_PUBLIC_KEY) {
      setError("Push notifications not supported");
      return null;
    }

    setSubscribing(true);
    setError(null);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        setSubscribing(false);
        return null;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();

      let pushSub: PushSubscription;
      if (existing) {
        pushSub = existing;
      } else {
        pushSub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: VAPID_PUBLIC_KEY,
        });
      }

      const subJSON = pushSub.toJSON();
      setSubscription(subJSON);

      const { error: dbError } = await supabase.from("push_subscriptions").insert({
        business_id: context.businessId,
        booking_id: context.bookingId || null,
        queue_ticket_id: context.queueTicketId || null,
        subscription: subJSON,
        locale: context.locale || "fr",
      });

      if (dbError) {
        console.error("Failed to save push subscription:", dbError);
        setError("Failed to save subscription");
        return null;
      }

      return pushSub;
    } catch (err) {
      console.error("Push subscription error:", err);
      setError(err instanceof Error ? err.message : "Failed to subscribe");
      return null;
    } finally {
      setSubscribing(false);
    }
  }, [isSupported]);

  const sendPush = useCallback(async (
    subscription: PushSubscriptionJSON,
    payload: { title: string; body: string; url?: string; icon?: string; badge?: string },
  ) => {
    const { error: fnError } = await supabase.functions.invoke("send-push", {
      body: { subscription, ...payload },
    });

    if (fnError) {
      console.error("Failed to send push:", fnError);
      return false;
    }
    return true;
  }, []);

  return { isSupported, permission, subscription, subscribing, error, subscribe, sendPush };
}
