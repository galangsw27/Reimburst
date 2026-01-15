// Google Sheets Service for Reimbursement AI
// Handles OAuth and data submission to Google Sheets

// Update project config to use webhook URLs
export interface ProjectConfig {
    id: string;
    name: string;
    spreadsheetId: string;
    sheetName: string;
    webhookUrl?: string; // Google Apps Script webhook URL
}

export const PROJECTS: ProjectConfig[] = [
    {
        id: 'maxstream',
        name: 'MaxStream',
        spreadsheetId: '1lOhILZhnSQR-fESsPuhDexVNYgyjG6MoAkDuk2a9iAU',
        sheetName: 'Sheet1',
        webhookUrl: import.meta.env.VITE_MAXSTREAM_WEBHOOK_URL || '',
    },
    {
        id: 'myorbit',
        name: 'MyOrbit',
        spreadsheetId: '15fcJRGyDM6_Ecd229Fjb7t6VsCQmMiJg3qrsint5_PM',
        sheetName: 'Sheet1',
        webhookUrl: import.meta.env.VITE_MYORBIT_WEBHOOK_URL || '',
    },
    {
        id: 'duniagames',
        name: 'Dunia Games',
        spreadsheetId: '', // Add spreadsheet ID when available
        sheetName: 'Sheet1',
        webhookUrl: import.meta.env.VITE_DUNIAGAMES_WEBHOOK_URL || '',
    },
];

// Current selected project (default to first)
let currentProject: ProjectConfig = PROJECTS[0];

export const setCurrentProject = (projectId: string): void => {
    const project = PROJECTS.find(p => p.id === projectId);
    if (project) {
        currentProject = project;
    }
};

export const getCurrentProject = (): ProjectConfig => currentProject;

const DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

interface ReimbursementRow {
    no: number;
    tgl: string;
    time: string;
    trxId: string;
    transaksi: string;
    paymentType: string;
    amount: number;
    bAdmin: number;
    bKirim: number;
    bLayanan: number;
    diskon: number;
    loginStatus: string;
    total: number;
    by: string;
    folderEvidence: string;
    remark: string;
}

// Initialize the Google API client
export const initGoogleAPI = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        // Check if gapi is already loaded
        if (window.gapi?.client?.sheets) {
            resolve();
            return;
        }

        const existingScript = document.querySelector('script[src*="apis.google.com"]');
        if (existingScript) {
            // Script already exists, just wait for it to load
            const checkGapi = setInterval(() => {
                if (window.gapi) {
                    clearInterval(checkGapi);
                    window.gapi.load('client', async () => {
                        try {
                            await window.gapi.client.init({
                                discoveryDocs: DISCOVERY_DOCS,
                            });
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    });
                }
            }, 100);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            window.gapi.load('client', async () => {
                try {
                    await window.gapi.client.init({
                        discoveryDocs: DISCOVERY_DOCS,
                    });
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        };
        script.onerror = reject;
        document.body.appendChild(script);
    });
};

// Set access token after OAuth login
export const setAccessToken = (accessToken: string): void => {
    if (window.gapi?.client) {
        window.gapi.client.setToken({ access_token: accessToken });
    }
};

// Find the next available row (starting from row 11, stop before "Total")
export const findNextAvailableRow = async (): Promise<number> => {
    try {
        const { spreadsheetId, sheetName } = currentProject;
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: `${sheetName}!A11:A100`, // Check rows 11-100
        });

        const values = response.result.values || [];

        for (let i = 0; i < values.length; i++) {
            const cellValue = values[i][0];

            // If cell is empty, this is our target row
            if (!cellValue || cellValue === '') {
                return 11 + i;
            }

            // If cell contains "Total", insert above it
            if (String(cellValue).toLowerCase().includes('total')) {
                return 11 + i;
            }
        }

        // If no empty row found, return the next row after the last data
        return 11 + values.length;
    } catch (error) {
        console.error('Error finding next row:', error);
        throw error;
    }
};

// Get the current row count for auto-increment No
export const getNextNo = async (): Promise<number> => {
    try {
        const { spreadsheetId, sheetName } = currentProject;
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: `${sheetName}!A11:A100`,
        });

        const values = response.result.values || [];
        let maxNo = 0;

        for (const row of values) {
            const cellValue = row[0];
            if (cellValue && !isNaN(Number(cellValue))) {
                maxNo = Math.max(maxNo, Number(cellValue));
            }
        }

        return maxNo + 1;
    } catch (error) {
        console.error('Error getting next No:', error);
        return 1;
    }
};

// Append data to the Google Sheet
export const appendToSheet = async (data: Omit<ReimbursementRow, 'no' | 'folderEvidence'>): Promise<void> => {
    try {
        const { spreadsheetId, sheetName } = currentProject;
        
        if (!spreadsheetId) {
            throw new Error(`Spreadsheet ID not configured for project: ${currentProject.name}`);
        }
        
        const nextRow = await findNextAvailableRow();
        const nextNo = await getNextNo();

        // Format date from yyyy-mm-dd to dd/mm/yyyy for Google Sheet
        const formatDateForSheet = (dateStr: string): string => {
            if (!dateStr) return '';
            const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (match) {
                return `${match[3]}/${match[2]}/${match[1]}`;
            }
            return dateStr;
        };

        // Prepare row data (columns A-P)
        const rowData = [
            nextNo,                          // A: No
            formatDateForSheet(data.tgl),    // B: Tgl (formatted as dd/mm/yyyy)
            data.time,                 // C: Time
            data.trxId,                // D: TRX ID
            data.transaksi,            // E: Transaksi
            data.paymentType,          // F: Payment Type
            data.amount,               // G: Amount
            data.bAdmin,               // H: B. Admin
            data.bKirim,               // I: B. Kirim
            data.bLayanan,             // J: B. Layanan
            data.diskon,               // K: Diskon
            data.loginStatus,          // L: Login/Non Login
            data.total,                // M: Total
            data.by,                   // N: By
            '',                        // O: Folder Evidence (empty)
            data.remark,               // P: Remark
        ];

        const range = `${sheetName}!A${nextRow}:P${nextRow}`;

        await window.gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [rowData],
            },
        });

        console.log(`Data inserted at row ${nextRow} in ${currentProject.name}`);

    } catch (error) {
        console.error('Error appending to sheet:', error);
        throw error;
    }
};

// Batch append using Google Apps Script webhook (NO OAUTH REQUIRED)
export const batchAppendToSheetViaWebhook = async (
    projectId: string, 
    dataRows: Omit<ReimbursementRow, 'no' | 'folderEvidence'>[]
): Promise<void> => {
    try {
        const project = PROJECTS.find(p => p.id === projectId.toLowerCase().replace(/\s+/g, ''));
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }
        
        if (!project.webhookUrl) {
            throw new Error(`Webhook URL not configured for project: ${project.name}. Please setup Google Apps Script webhook.`);
        }

        // Format date from yyyy-mm-dd to dd/mm/yyyy for Google Sheet
        const formatDateForSheet = (dateStr: string): string => {
            if (!dateStr) return '';
            const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (match) {
                return `${match[3]}/${match[2]}/${match[1]}`;
            }
            return dateStr;
        };

        // Prepare rows for webhook
        const rows = dataRows.map(data => ({
            tgl: formatDateForSheet(data.tgl),
            time: data.time,
            trxId: data.trxId,
            transaksi: data.transaksi,
            paymentType: data.paymentType,
            amount: data.amount,
            bAdmin: data.bAdmin,
            bKirim: data.bKirim,
            bLayanan: data.bLayanan,
            diskon: data.diskon,
            loginStatus: data.loginStatus,
            total: data.total,
            by: data.by,
            remark: data.remark,
        }));

        // Send to Google Apps Script webhook
        const response = await fetch(project.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ rows }),
            mode: 'no-cors', // Important for Google Apps Script
        });

        // Note: With no-cors mode, we can't read the response
        // But the request will still be processed by Apps Script
        console.log(`${rows.length} rows sent to ${project.name} via webhook`);

    } catch (error) {
        console.error('Error sending to webhook:', error);
        throw error;
    }
};

// Download Excel from Google Sheets
export const downloadExcelFromSheet = (projectId: string): void => {
    const project = PROJECTS.find(p => p.id === projectId.toLowerCase().replace(/\s+/g, ''));
    
    if (!project) {
        throw new Error(`Project not found: ${projectId}`);
    }
    
    if (!project.spreadsheetId) {
        throw new Error(`Spreadsheet ID not configured for project: ${project.name}`);
    }

    // Google Sheets export URL for Excel format
    const exportUrl = `https://docs.google.com/spreadsheets/d/${project.spreadsheetId}/export?format=xlsx&gid=0`;
    
    // Open in new tab to trigger download
    window.open(exportUrl, '_blank');
};

// Get spreadsheet URL for viewing
export const getSpreadsheetUrl = (projectId: string): string => {
    const project = PROJECTS.find(p => p.id === projectId.toLowerCase().replace(/\s+/g, ''));
    
    if (!project || !project.spreadsheetId) {
        return '';
    }
    
    return `https://docs.google.com/spreadsheets/d/${project.spreadsheetId}/edit`;
};

// Get Google Client ID from environment
export const getGoogleClientId = (): string => {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
};

// Declare gapi types for TypeScript
declare global {
    interface Window {
        gapi: {
            load: (api: string, callback: () => void) => void;
            client: {
                init: (config: { apiKey?: string; discoveryDocs: string[] }) => Promise<void>;
                setToken: (token: { access_token: string }) => void;
                sheets: {
                    spreadsheets: {
                        values: {
                            get: (params: { spreadsheetId: string; range: string }) => Promise<{
                                result: { values?: string[][] };
                            }>;
                            update: (params: {
                                spreadsheetId: string;
                                range: string;
                                valueInputOption: string;
                                resource: { values: (string | number)[][] };
                            }) => Promise<void>;
                        };
                    };
                };
            };
        };
    }
}

export { SCOPES };
