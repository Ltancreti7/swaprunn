export class NotificationService {
  private static hasPermission = false;
  private static audioContext: AudioContext | null = null;

  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.hasPermission = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      return this.hasPermission;
    }

    return false;
  }

  static async showNotification(
    title: string,
    options: {
      body: string;
      icon?: string;
      badge?: string;
      tag?: string;
      requireInteraction?: boolean;
    }
  ): Promise<void> {
    if (!this.hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    try {
      const notification = new Notification(title, {
        ...options,
        requireInteraction: options.requireInteraction ?? true,
        icon: options.icon || '/swaprunn-logo-2025.png',
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  static playNotificationSound(): void {
    try {
      const audioContext = this.getAudioContext();
      if (!audioContext) return;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();

        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);

        oscillator2.frequency.value = 1000;
        oscillator2.type = 'sine';

        gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.5);
      }, 200);

      setTimeout(() => {
        const oscillator3 = audioContext.createOscillator();
        const gainNode3 = audioContext.createGain();

        oscillator3.connect(gainNode3);
        gainNode3.connect(audioContext.destination);

        oscillator3.frequency.value = 1200;
        oscillator3.type = 'sine';

        gainNode3.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator3.start(audioContext.currentTime);
        oscillator3.stop(audioContext.currentTime + 0.5);
      }, 400);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }

  static vibrate(pattern: number | number[] = [200, 100, 200]): void {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        console.error('Failed to vibrate:', error);
      }
    }
  }

  static notifyNewDelivery(message: string): void {
    this.showNotification('🚗 New Delivery Request Available!', {
      body: message,
      tag: 'new-delivery',
      requireInteraction: true,
    });

    this.playNotificationSound();
    this.vibrate([300, 100, 300, 100, 300]);
  }

  static notifyDeliveryAccepted(driverName: string, vin: string): void {
    this.showNotification('✅ Delivery Request Accepted!', {
      body: `${driverName} has accepted your delivery request for VIN: ${vin}.`,
      tag: 'delivery-accepted',
      requireInteraction: false,
    });

    this.playNotificationSound();
    this.vibrate([200, 100, 200]);
  }

  private static getAudioContext(): AudioContext | null {
    if (!this.audioContext) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
        }
      } catch (error) {
        console.error('Failed to create AudioContext:', error);
      }
    }
    return this.audioContext;
  }

  static get isSupported(): boolean {
    return 'Notification' in window;
  }

  static get hasNotificationPermission(): boolean {
    return this.hasPermission;
  }
}
