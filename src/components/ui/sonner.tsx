import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      richColors
      toastOptions={{
        className: "bg-cursor-dropdown border border-cursor-border text-cursor-text",
      }}
    />
  );
}
