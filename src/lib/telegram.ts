import { TelegramUser } from '../types';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          query_id?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            photo_url?: string;
          };
          auth_date?: string;
          hash?: string;
        };
        version?: string;
        platform?: string;
        colorScheme?: 'light' | 'dark';
        themeParams?: Record<string, string>;
        isExpanded?: boolean;
        viewportHeight?: number;
        viewportStableHeight?: number;
        headerColor?: string;
        backgroundColor?: string;
        isClosingConfirmationEnabled?: boolean;
        BackButton?: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        MainButton?: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
        };
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        openLink: (url: string) => void;
        openTelegramLink: (url: string) => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        enableClosingConfirmation: () => void;
        disableClosingConfirmation: () => void;
      };
    };
  }
}

// Fallback user for testing inside standard browsers/AI Studio preview
const FALLBACK_TEST_USER: TelegramUser = {
  id: 849204812,
  first_name: 'Ren',
  last_name: 'Kurogane',
  username: 'ren_kuro',
  language_code: 'en',
  photo_url: '',
  join_date: '2026-01-15'
};

export function isInsideTelegram(): boolean {
  return typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initData);
}

export function initTelegramWebApp(): void {
  if (typeof window === 'undefined') return;
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return;

  try {
    webApp.ready();
    webApp.expand();
    webApp.setHeaderColor('#030712');
    webApp.setBackgroundColor('#030712');
  } catch (err) {
    console.warn('Telegram WebApp init warning:', err);
  }
}

export function getTelegramInitData(): string {
  if (typeof window === 'undefined') return '';
  return window.Telegram?.WebApp?.initData || 'demo_mode=true&user=%7B%22id%22%3A849204812%2C%22first_name%22%3A%22Ren%22%2C%22username%22%3A%22ren_kuro%22%7D';
}

export function getTelegramUser(): TelegramUser {
  if (typeof window === 'undefined') return FALLBACK_TEST_USER;
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (tgUser && tgUser.id) {
    return {
      id: tgUser.id,
      first_name: tgUser.first_name,
      last_name: tgUser.last_name,
      username: tgUser.username,
      language_code: tgUser.language_code,
      photo_url: tgUser.photo_url,
      join_date: '2026-02-01'
    };
  }
  return FALLBACK_TEST_USER;
}

export const haptic = {
  impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
    } catch {
      // safe fallback
    }
  },
  notification: (type: 'error' | 'success' | 'warning') => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
    } catch {
      // safe fallback
    }
  },
  selection: () => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
    } catch {
      // safe fallback
    }
  }
};

export function setupBackButton(onClick: () => void): () => void {
  const backBtn = window.Telegram?.WebApp?.BackButton;
  if (!backBtn) return () => {};

  try {
    backBtn.show();
    backBtn.onClick(onClick);
    return () => {
      backBtn.offClick(onClick);
      backBtn.hide();
    };
  } catch {
    return () => {};
  }
}
