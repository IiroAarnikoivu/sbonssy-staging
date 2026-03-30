// src/store/uiStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUIStore = create(
  persist(
    (set, get) => ({
      // Sidebar open state for mobile
      isSidebarOpen: false,

      // Stripe reminder modal state
      stripeReminderLastDismissed: null,

      // Actions
      openSidebar: () => set({ isSidebarOpen: true }),
      closeSidebar: () => set({ isSidebarOpen: false }),
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      // Stripe reminder actions
      dismissStripeReminder: () => set({ stripeReminderLastDismissed: Date.now() }),

      shouldShowStripeReminder: () => {
        const lastDismissed = get().stripeReminderLastDismissed;
        if (!lastDismissed) return true;

        const oneDayInMs = 24 * 60 * 60 * 1000;
        const now = Date.now();
        return (now - lastDismissed) > oneDayInMs;
      },
    }),
    {
      name: "ui-storage", // name of the item in localStorage
      partialize: (state) => ({
        stripeReminderLastDismissed: state.stripeReminderLastDismissed,
      }), // only persist stripeReminderLastDismissed
    }
  )
);
