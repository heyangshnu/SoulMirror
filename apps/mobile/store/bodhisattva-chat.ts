import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  streaming?: boolean;
};

interface BodhisattvaChatState {
  messages: ChatMessage[];
  transcriptLoaded: boolean;
  setMessages: (messages: ChatMessage[]) => void;
  appendMessage: (message: ChatMessage) => void;
  updateMessages: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
  markTranscriptLoaded: () => void;
  clearChat: () => void;
}

export const useBodhisattvaChatStore = create<BodhisattvaChatState>()(
  persist(
    (set) => ({
      messages: [],
      transcriptLoaded: false,
      setMessages: (messages) => set({ messages }),
      appendMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
      updateMessages: (updater) => set((s) => ({ messages: updater(s.messages) })),
      markTranscriptLoaded: () => set({ transcriptLoaded: true }),
      clearChat: () => set({ messages: [], transcriptLoaded: false }),
    }),
    {
      name: 'bodhisattva-chat-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        messages: s.messages.filter((m) => !m.streaming),
        transcriptLoaded: s.transcriptLoaded,
      }),
    },
  ),
);
