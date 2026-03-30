import api from "@/lib/axios";
import Swal from "sweetalert2";
import { create } from "zustand";

/**
 * Zustand store for managing authenticated user state.
 */

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,

  /**
   * Update the user state with provided fields.
   * @param {Object} userUpdates - Partial user object to merge with current state
   */
  setUser: (userUpdates) =>
    set((state) => ({
      user: { ...(state.user || {}), ...userUpdates },
      loading: false,
    })),

  /**
   * Fetches the current authenticated user session and profile with retries.
   * @param {number} retries - Number of retry attempts
   * @param {number} delay - Delay between retries in milliseconds
   * @returns {Object|null} - The authenticated user or null
   */
  fetchUser: async (retries = 3, delay = 1000) => {
    set({ loading: true });
    let user = null;

    // Attempt to retrieve user session
    for (let i = 0; i < retries; i++) {
      try {
        const response = await api.get("/auth/session");
        user = response.data.user;
        if (user) break;
      } catch (error) {
        // wait before retrying
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // If session found, retrieve full user profile from backend
    if (user) {
      try {
        const response = await api.get(`/user?supabaseId=${user.id}`);
        const userProfile = response.data;

        set({
          user: {
            ...user,
            id: user.id,
            _id: userProfile._id,
            ...userProfile,
            onboardedDetails: userProfile,
          },
          loading: false,
        });
      } catch (error) {
        set({
          user: { ...user, id: user.id, onboardedDetails: null },
          loading: false,
        });
      }
    } else {
      set({ user: null, loading: false });
    }

    return user;
  },

  /**
   * Logs out the user by calling the logout endpoint and clearing the store.
   * @param {Function} toastAlert - Translation function for toast messages
   */
  logout: async (toastAlert) => {
    try {
      const resp = await api.post("/auth/logout");

      if (resp && toastAlert) {
        Swal.fire({
          title: toastAlert("logoutSuccess"),
          position: "top-right",
          icon: "success",
          toast: true,
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 5000,
        });
      }

      return resp;
    } catch (error) {
      // Ignore logout errors
    } finally {
      set({ user: null, loading: false });
    }
  },

  /**
   * Initializes the auth store if user is not loaded.
   */
  initialize: async () => {
    const { user, loading } = get();
    if (loading && !user) {
      await get().fetchUser();
    }
  },
}));

/**
 * Automatically initialize the auth store on load
 * if no user has been set and loading is true.
 */
if (useAuthStore.getState().user === null && useAuthStore.getState().loading) {
  useAuthStore.getState().initialize();
}
