/**
 * Desktop notification utilities for Tauri
 * Falls back to web notifications if not in Tauri
 */

/**
 * Check if we're running in Tauri
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (isTauri()) {
    try {
      const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');
      
      let permissionGranted = await isPermissionGranted();
      
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
      
      return permissionGranted;
    } catch (error) {
      console.error('[Notifications] Error requesting Tauri notification permission:', error);
      return false;
    }
  } else {
    // Web fallback
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }
}

/**
 * Send a desktop notification
 */
export async function sendNotification(title: string, body: string, options?: {
  icon?: string;
  tag?: string;
  silent?: boolean;
}): Promise<void> {
  if (isTauri()) {
    try {
      const { sendNotification } = await import('@tauri-apps/plugin-notification');
      
      await sendNotification({
        title,
        body,
        icon: options?.icon,
        tag: options?.tag,
        sound: options?.silent ? 'none' : 'default',
      });
    } catch (error) {
      console.error('[Notifications] Error sending Tauri notification:', error);
      // Fallback to web notifications
      sendWebNotification(title, body, options);
    }
  } else {
    sendWebNotification(title, body, options);
  }
}

/**
 * Fallback to web notifications
 */
function sendWebNotification(title: string, body: string, options?: {
  icon?: string;
  tag?: string;
  silent?: boolean;
}): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: options?.icon,
      tag: options?.tag,
      silent: options?.silent,
    });
  } else {
    console.warn('[Notifications] Web notifications not available or permission not granted');
  }
}

/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
  if (isTauri()) {
    return true; // Tauri always supports notifications
  }
  return 'Notification' in window;
}

