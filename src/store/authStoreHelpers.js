import { useAuthStore } from './authStore';
import { useTranslations } from 'next-intl';

/**
 * Custom hook that provides auth store methods with translation support
 */
export const useAuthStoreWithTranslations = () => {
  const toastAlert = useTranslations('Sweetalert');
  const authStore = useAuthStore();
  
  return {
    ...authStore,
    logout: () => authStore.logout(toastAlert),
  };
};
