import type { ReactNode } from "react";
import { Toaster, toast } from "sonner";
export function ToastProvider({ children }: { children: ReactNode }) {
  return <>{children}<Toaster richColors closeButton position="bottom-right" toastOptions={{style:{fontFamily:"'DM Sans', sans-serif"}}} /></>;
}
export function useToast() { return (message: string) => { toast(message); }; }
