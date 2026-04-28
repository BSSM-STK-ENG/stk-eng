import type { MaterialDto } from '../types/api';

export const LOW_STOCK_NOTIFICATION_PERMISSION_KEY = 'stk-low-stock-notification-permission';

export function isLowStockMaterial(material: MaterialDto): boolean {
  const current = material.currentStockQty ?? 0;
  const safe = material.safeStockQty ?? 0;
  return safe > 0 && current <= safe;
}

export function supportsBrowserNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function hasGrantedLowStockNotificationPermission(): boolean {
  return supportsBrowserNotifications() && window.Notification.permission === 'granted';
}

export async function requestLowStockNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!supportsBrowserNotifications()) {
    return 'unsupported';
  }

  if (window.Notification.permission === 'granted') {
    localStorage.setItem(LOW_STOCK_NOTIFICATION_PERMISSION_KEY, 'granted');
    return 'granted';
  }

  if (window.Notification.permission === 'denied') {
    localStorage.setItem(LOW_STOCK_NOTIFICATION_PERMISSION_KEY, 'denied');
    return 'denied';
  }

  const permission = await window.Notification.requestPermission();
  localStorage.setItem(LOW_STOCK_NOTIFICATION_PERMISSION_KEY, permission);
  return permission;
}

export function notifyLowStock(material: MaterialDto) {
  if (!hasGrantedLowStockNotificationPermission()) {
    return;
  }

  const current = material.currentStockQty ?? 0;
  const safe = material.safeStockQty ?? 0;
  const notification = new window.Notification('안전재고 알림', {
    body: `${material.materialName} (${material.materialCode}) 재고가 ${current}개입니다. 안전재고는 ${safe}개입니다.`,
    tag: `low-stock:${material.materialCode}`,
  });

  notification.onclick = () => {
    window.focus();
    window.location.assign('/stock/current?scope=LOW');
    notification.close();
  };
}
