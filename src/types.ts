export interface ReimbursementData {
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
    remark: string;
}

export type AppState = 'upload' | 'processing' | 'review' | 'success' | 'error';
