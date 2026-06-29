import { useToastStore } from '../store/toast.store';

export function useToast() {
  const push = useToastStore((s) => s.push);
  return {
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    info: (message: string) => push('info', message),
  };
}
