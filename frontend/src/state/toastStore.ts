import { create } from 'zustand';
import { randomId } from '../utils/math';

export type Toast = {
  id: string;
  message: string;
};

type ToastStore = {
  toasts: Toast[];
  push: (message: string) => void;
  remove: (id: string) => void;
};

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message) =>
    set((state) => ({
      toasts: [...state.toasts, { id: randomId('toast'), message }].slice(-3),
    })),
  remove: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
