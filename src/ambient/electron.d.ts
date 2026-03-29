declare module "electron" {
  export const dialog: {
    showMessageBox: (options: Record<string, unknown>) => Promise<{ response: number }>;
  };
}
