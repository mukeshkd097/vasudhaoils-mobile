import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Supabase auth storage adapter backed by Expo SecureStore on native.
 *
 * SecureStore values are capped at ~2KB each, and Supabase sessions
 * (with JWTs) can exceed that, so values are split into fixed-size
 * chunks. On web, SecureStore is unavailable, so AsyncStorage is used.
 */
const CHUNK_SIZE = 1800;
const isWeb = Platform.OS === "web";
const countKey = (key: string) => `${key}.chunks`;
const chunkKey = (key: string, i: number) => `${key}.${i}`;

export const supabaseSecureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) return AsyncStorage.getItem(key);
    try {
      const countRaw = await SecureStore.getItemAsync(countKey(key));
      if (countRaw == null) return await SecureStore.getItemAsync(key);
      const count = parseInt(countRaw, 10);
      let out = "";
      for (let i = 0; i < count; i++) {
        const part = await SecureStore.getItemAsync(chunkKey(key, i));
        if (part == null) return null;
        out += part;
      }
      return out;
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    const count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
    await SecureStore.setItemAsync(countKey(key), String(count));
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(
        chunkKey(key, i),
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      );
    }
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb) {
      await AsyncStorage.removeItem(key);
      return;
    }
    try {
      const countRaw = await SecureStore.getItemAsync(countKey(key));
      if (countRaw != null) {
        const count = parseInt(countRaw, 10);
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(chunkKey(key, i));
        }
        await SecureStore.deleteItemAsync(countKey(key));
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  },
};
