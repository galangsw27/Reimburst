import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, CheckCircle2, AlertCircle, Loader2, Send, X } from 'lucide-react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ReimbursementData, User, AppState } from '../types';
import { createRequest } from '../services/reimbursementService';

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL || '';

interface UploadFormProps {
    user: User;
    onSuccess: () => void;
}

export const UploadForm: React.FC<UploadFormProps> = ({ user, onSuccess }) => {
    const [state, setState] = useState<AppState>('upload');
    const [data, setData] = useState<ReimbursementData>({
        nama: '',
        msisdnEmail: '',
        project: 'MaxStream',
        tgl: '', time: '', trxId: '', transaksi: '', paymentType: '',
        amount: 0, bAdmin: 0, bKirim: 0, bLayanan: 0, diskon: 0,
        loginStatus: 'Login', total: 0, by: '', remark: ''
    });
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showImageModal, setShowImageModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);

        setState('processing');
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(WEBHOOK_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const responseData = response.data;

            const parseJsonData = (data: unknown): Record<string, unknown> => {
                if (data && typeof data === 'object' && !Array.isArray(data)) {
                    return data as Record<string, unknown>;
                }
                if (typeof data === 'string') {
                    let jsonString = data.trim();
                    // Remove markdown code blocks
                    if (jsonString.includes('```')) {
                        jsonString = jsonString.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                    }
                    // Remove escaped newlines and extra spaces
                    jsonString = jsonString.replace(/\\n/g, '').replace(/\s+/g, ' ');
                    try {
                        const parsed = JSON.parse(jsonString);
                        return typeof parsed === 'object' ? parsed : {};
                    } catch (e) {
                        console.error('JSON parse error:', e);
                        return {};
                    }
                }
                return {};
            };

            let extracted: Record<string, unknown>;
            // Check if data is wrapped in a "data" field
            if (responseData.data !== undefined) {
                extracted = parseJsonData(responseData.data);
            } else if (responseData.success && responseData.message) {
                // Handle case where data might be in a nested structure
                extracted = parseJsonData(responseData);
            } else {
                extracted = parseJsonData(responseData);
            }

            const parseNumber = (val: unknown): number => {
                if (val === undefined || val === null || val === '') return 0;
                if (typeof val === 'number') return val;
                
                // Convert string to number
                let strVal = String(val).trim();
                
                // Remove "Rp" prefix and any spaces
                strVal = strVal.replace(/Rp\.?/gi, '').trim();
                
                // Handle negative numbers (for discount)
                const isNegative = strVal.startsWith('-');
                if (isNegative) {
                    strVal = strVal.substring(1).trim();
                }
                
                // Remove dots (thousand separator) and replace comma with dot (decimal separator)
                const cleanVal = strVal.replace(/\./g, '').replace(/,/g, '.');
                const parsed = parseFloat(cleanVal);
                const result = isNaN(parsed) ? 0 : parsed;
                
                // Return negative if it was negative
                return isNegative ? -result : result;
            };

            const getString = (val: unknown): string => {
                if (val === undefined || val === null) return '';
                return String(val).trim();
            };

            const parseDate = (val: unknown): string => {
                if (val === undefined || val === null || val === '') return '';
                const dateStr = String(val).trim();

                // If already in YYYY-MM-DD format, return as is
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                    return dateStr;
                }

                // Parse DD/MM/YYYY format (from n8n)
                const ddmmyyyyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
                const ddmmyyyyMatch = dateStr.match(ddmmyyyyRegex);
                if (ddmmyyyyMatch) {
                    const day = ddmmyyyyMatch[1].padStart(2, '0');
                    const month = ddmmyyyyMatch[2].padStart(2, '0');
                    const year = ddmmyyyyMatch[3];
                    return `${year}-${month}-${day}`;
                }

                // Parse DD-MM-YYYY format
                const ddmmyyyyDashRegex = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
                const ddmmyyyyDashMatch = dateStr.match(ddmmyyyyDashRegex);
                if (ddmmyyyyDashMatch) {
                    const day = ddmmyyyyDashMatch[1].padStart(2, '0');
                    const month = ddmmyyyyDashMatch[2].padStart(2, '0');
                    const year = ddmmyyyyDashMatch[3];
                    return `${year}-${month}-${day}`;
                }

                // Parse month name formats (29-Nov, 22 Nov 2025, etc.)
                const months: Record<string, string> = {
                    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
                    'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
                    'januari': '01', 'februari': '02', 'maret': '03', 'april': '04', 'mei': '05', 'juni': '06',
                    'juli': '07', 'agustus': '08', 'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
                };

                const monthNameRegex = /(\d{1,2})[\s\-\/]?([a-zA-Z]+)[\s\-\/]?(\d{4})?/i;
                const monthNameMatch = dateStr.match(monthNameRegex);

                if (monthNameMatch) {
                    const day = monthNameMatch[1].padStart(2, '0');
                    const monthName = monthNameMatch[2].toLowerCase().substring(0, 3);
                    const month = months[monthName] || months[monthNameMatch[2].toLowerCase()] || '01';
                    const year = monthNameMatch[3] || new Date().getFullYear().toString();
                    return `${year}-${month}-${day}`;
                }

                return dateStr;
            };

            const parseTime = (val: unknown): string => {
                if (val === undefined || val === null || val === '') return '';
                const timeStr = String(val).trim();
                
                // If already in HH:MM format, return as is
                if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
                    const parts = timeStr.split(':');
                    const hours = parts[0].padStart(2, '0');
                    const minutes = parts[1].padStart(2, '0');
                    return `${hours}:${minutes}`;
                }
                
                return timeStr;
            };

            setData({
                nama: '',
                msisdnEmail: '',
                project: 'MaxStream',
                tgl: parseDate(extracted.tanggal),
                time: parseTime(extracted.waktu),
                trxId: getString(extracted.trx_id),
                transaksi: getString(extracted.transaksi),
                paymentType: getString(extracted.payment_type),
                amount: parseNumber(extracted.amount),
                bAdmin: parseNumber(extracted.b_admin),
                bKirim: parseNumber(extracted.b_kirim),
                bLayanan: parseNumber(extracted.b_layanan),
                diskon: parseNumber(extracted.diskon),
                loginStatus: getString(extracted.login_non_login) || 'Login',
                total: parseNumber(extracted.total),
                by: '',
                remark: ''
            });

            setState('review');
        } catch (err) {
            console.error('Upload error:', err);
            setError('Gagal memproses gambar. Pastikan webhook n8n aktif.');
            setState('error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setState('processing');

        try {
            createRequest(user.id, user.name, data, previewUrl || undefined, user.leadId, user.leadName);
            setState('success');
            setTimeout(() => {
                onSuccess();
            }, 2000);
        } catch (err) {
            console.error('Submit error:', err);
            setError('Gagal mengirim data.');
            setState('error');
        }
    };

    const reset = () => {
        setState('upload');
        setPreviewUrl(null);
        setData({
            nama: '',
            msisdnEmail: '',
            project: 'MaxStream',
            tgl: '', time: '', trxId: '', transaksi: '', paymentType: '',
            amount: 0, bAdmin: 0, bKirim: 0, bLayanan: 0, diskon: 0,
            loginStatus: 'Login', total: 0, by: '', remark: ''
        });
    };

    return (
        <AnimatePresence mode="wait">
            {state === 'upload' && (
                <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                    {/* User Info & Project Selection - BEFORE Upload */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Informasi Pengajuan</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* User Info Display */}
                            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                <h3 className="text-sm font-semibold mb-3 text-blue-400">Informasi User</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Nama User:</span>
                                        <p className="font-medium text-white">{user.name}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Lead:</span>
                                        <p className="font-medium text-white">{user.leadName || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Project Selection */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    Project <span className="text-red-500">*</span>
                                </Label>
                                <Select value={data.project} onValueChange={val => setData({ ...data, project: val as any })}>
                                    <SelectTrigger className="bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MaxStream">MaxStream</SelectItem>
                                        <SelectItem value="MyOrbit">MyOrbit</SelectItem>
                                        <SelectItem value="Dunia Games">Dunia Games</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Upload Card */}
                    <Card className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => fileInputRef.current?.click()}>
                        <CardContent className="py-16 flex flex-col items-center text-center">
                            <motion.div
                                className="mb-8 p-6 bg-primary/10 rounded-3xl border border-primary/20"
                                whileHover={{ scale: 1.1, rotate: 5 }}
                            >
                                <Upload className="w-16 h-16 text-primary" />
                            </motion.div>
                            <h2 className="text-3xl font-bold mb-3 text-white">Klik untuk Upload Struk</h2>
                            <p className="text-muted-foreground text-lg mb-8">Mendukung format JPG, PNG</p>
                            <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
                            <Button size="lg" className="shadow-lg shadow-primary/30">Pilih File Struk</Button>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {state === 'processing' && (
                <motion.div key="processing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    <Card>
                        <CardContent className="py-20 flex flex-col items-center text-center">
                            <Loader2 className="w-20 h-20 text-primary animate-spin mb-8" />
                            <h2 className="text-3xl font-bold mb-3 text-white">Sedang Memproses...</h2>
                            <p className="text-muted-foreground text-lg">AI sedang membaca data dari struk Anda</p>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {state === 'review' && (
                <motion.div key="review" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                    <Card>
                        <CardHeader className="border-b border-border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-2xl">Review Data</CardTitle>
                                    <CardDescription>Periksa dan edit data sebelum mengirim</CardDescription>
                                </div>
                                {previewUrl && (
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="w-20 h-20 object-cover rounded-xl border border-border cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setShowImageModal(true)}
                                    />
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Nama & MSISDN/Email Section */}
                                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                    <h3 className="text-sm font-semibold mb-4 text-primary">Informasi Pengaju</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">
                                                Nama <span className="text-red-500">*</span>
                                            </Label>
                                            <Input 
                                                value={data.nama} 
                                                onChange={e => setData({ ...data, nama: e.target.value })}
                                                placeholder="Masukkan nama lengkap"
                                                required
                                                className="bg-background"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">
                                                MSISDN / Email <span className="text-red-500">*</span>
                                            </Label>
                                            <Input 
                                                value={data.msisdnEmail} 
                                                onChange={e => setData({ ...data, msisdnEmail: e.target.value })}
                                                placeholder="08123456789 atau email@company.com"
                                                required
                                                className="bg-background"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Akan digunakan untuk matching dengan database asset
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Transaction Details Section */}
                                <div>
                                    <h3 className="text-sm font-semibold mb-4">Detail Transaksi</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tanggal</Label>
                                        <Input type="date" value={data.tgl} onChange={e => setData({ ...data, tgl: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Waktu</Label>
                                        <Input type="time" value={data.time} onChange={e => setData({ ...data, time: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>TRX ID</Label>
                                        <Input value={data.trxId} onChange={e => setData({ ...data, trxId: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Transaksi</Label>
                                        <Input value={data.transaksi} onChange={e => setData({ ...data, transaksi: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Payment Type</Label>
                                        <Input value={data.paymentType} onChange={e => setData({ ...data, paymentType: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Amount</Label>
                                        <Input type="number" value={data.amount} onChange={e => setData({ ...data, amount: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>B. Admin</Label>
                                        <Input type="number" value={data.bAdmin} onChange={e => setData({ ...data, bAdmin: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>B. Kirim</Label>
                                        <Input type="number" value={data.bKirim} onChange={e => setData({ ...data, bKirim: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>B. Layanan</Label>
                                        <Input type="number" value={data.bLayanan} onChange={e => setData({ ...data, bLayanan: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Diskon</Label>
                                        <Input type="number" value={data.diskon} onChange={e => setData({ ...data, diskon: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Login Status</Label>
                                        <Select value={data.loginStatus} onValueChange={val => setData({ ...data, loginStatus: val })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Login">Login</SelectItem>
                                                <SelectItem value="Non Login">Non Login</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Total</Label>
                                        <Input type="number" value={data.total} onChange={e => setData({ ...data, total: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>By</Label>
                                        <Input value={data.by} onChange={e => setData({ ...data, by: e.target.value })} />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Remark</Label>
                                        <Input value={data.remark} onChange={e => setData({ ...data, remark: e.target.value })} />
                                    </div>
                                </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <Button type="button" variant="outline" onClick={reset}>Batal</Button>
                                    <Button type="submit" size="lg" className="flex-1">
                                        <Send className="w-5 h-5" />
                                        Submit Reimbursement
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {state === 'success' && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card>
                        <CardContent className="py-16 flex flex-col items-center text-center">
                            <motion.div
                                className="mb-8 p-6 bg-emerald-500/20 rounded-full"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                            >
                                <CheckCircle2 className="w-20 h-20 text-emerald-400" />
                            </motion.div>
                            <h2 className="text-3xl font-bold mb-3 text-white">Berhasil!</h2>
                            <p className="text-muted-foreground text-lg">Reimbursement berhasil diajukan</p>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {state === 'error' && (
                <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card className="border-destructive/50">
                        <CardContent className="py-16 flex flex-col items-center text-center">
                            <motion.div className="mb-8 p-6 bg-destructive/20 rounded-full" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                <AlertCircle className="w-20 h-20 text-destructive" />
                            </motion.div>
                            <h2 className="text-3xl font-bold mb-3 text-white">Terjadi Kesalahan</h2>
                            <p className="text-muted-foreground text-lg mb-8">{error}</p>
                            <Button size="lg" onClick={reset}>Coba Lagi</Button>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {showImageModal && previewUrl && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowImageModal(false)}
                >
                    <motion.div
                        className="relative max-w-4xl max-h-[90vh]"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -top-12 right-0 text-white hover:bg-white/20"
                            onClick={() => setShowImageModal(false)}
                        >
                            <X className="w-6 h-6" />
                        </Button>
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
