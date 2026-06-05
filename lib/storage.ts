import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORAGE_KEYS = {
  USER_ROLE: "vasudha_user_role",
  ONBOARDING_DONE: "vasudha_onboarding_done",
  DRAFT_BOOKING: "vasudha_draft_booking",
} as const;

export const storage = {
  keys: STORAGE_KEYS,

  async set(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn("AsyncStorage set error:", e);
    }
  },

  async get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn("AsyncStorage get error:", e);
      return null;
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn("AsyncStorage remove error:", e);
    }
  },

  async setJSON<T>(key: string, value: T): Promise<void> {
    await storage.set(key, JSON.stringify(value));
  },

  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await storage.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
};

export const secureStorage = {
  async set(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        await AsyncStorage.setItem(`secure_${key}`, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (e) {
      console.warn("SecureStore set error:", e);
    }
  },

  async get(key: string): Promise<string | null> {
    try {
      if (Platform.OS === "web") {
        return await AsyncStorage.getItem(`secure_${key}`);
      }
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn("SecureStore get error:", e);
      return null;
    }
  },

  async remove(key: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        await AsyncStorage.removeItem(`secure_${key}`);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (e) {
      console.warn("SecureStore remove error:", e);
    }
  },
};
