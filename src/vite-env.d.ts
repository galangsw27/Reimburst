/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_WEBHOOK_URL: string;
    readonly VITE_GOOGLE_CLIENT_ID: string;
    readonly VITE_GOOGLE_SPREADSHEET_ID: string;
    readonly VITE_GOOGLE_SHEET_NAME: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
