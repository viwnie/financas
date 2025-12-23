import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
    privacyMode: boolean;
    togglePrivacyMode: () => void;
    setPrivacyMode: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            privacyMode: false,
            togglePrivacyMode: () => set((state) => ({ privacyMode: !state.privacyMode })),
            setPrivacyMode: (value: boolean) => set({ privacyMode: value }),
        }),
        {
            name: 'settings-storage',
        }
    )
);
