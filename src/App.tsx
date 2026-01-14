import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, CheckCircle2, AlertCircle, Loader2, Send, LogIn, LogOut, FolderOpen, X } from 'lucide-react';
import axios from 'axios';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { ReimbursementData, AppState } from './types';
import { initGoogleAPI, setAccessToken, appendToSheet, PROJECTS, setCurrentProject } from './services/googleSheetsService';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL || '';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>('upload');
  const [data, setData] = useState<ReimbursementData>({
    tgl: '', time: '', trxId: '', transaksi: '', paymentType: '',
    amount: 0, bAdmin: 0, bKirim: 0, bLayanan: 0, diskon: 0,
    loginStatus: 'Login', total: 0, by: '', remark: ''
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);
  const [isGapiReady, setIsGapiReady] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(PROJECTS[0].id);
  const [showImageModal, setShowImageModal] = useState(false);

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentProject(projectId);
  };

  useEffect(() => {
    initGoogleAPI()
      .then(() => setIsGapiReady(true))
      .catch((err) => console.error('Failed to init Google API:', err));
  }, []);

  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setAccessToken(tokenResponse.access_token);
      setIsGoogleLoggedIn(true);
    },
    onError: () => setError('Gagal login ke Google'),
    scope: 'https://www.googleapis.com/auth/spreadsheets',
  });

  const handleGoogleLogout = () => setIsGoogleLoggedIn(false);

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
          if (jsonString.includes('```')) {
            jsonString = jsonString.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
          }
          try {
            const parsed = JSON.parse(jsonString);
            return typeof parsed === 'object' ? parsed : {};
          } catch {
            return {};
          }
        }
        return {};
      };

      let extracted: Record<string, unknown>;
      if (responseData.data !== undefined) {
        extracted = parseJsonData(responseData.data);
      } else {
        extracted = parseJsonData(responseData);
      }

      const parseNumber = (val: unknown): number => {
        if (val === undefined || val === null || val === '') return 0;
        if (typeof val === 'number') return val;
        return Number(String(val).replace(/\./g, '').replace(/,/g, '.')) || 0;
      };

      const getString = (val: unknown): string => {
        if (val === undefined || val === null) return '';
        return String(val);
      };

      // Parse date from various formats (e.g., "29-Nov", "22 Nov 2025", "5-Dec", "2025-12-29") to YYYY-MM-DD
      const parseDate = (val: unknown): string => {
        if (val === undefined || val === null || val === '') return '';
        const dateStr = String(val).trim();

        // If already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return dateStr;
        }

        // Month name mapping
        const months: Record<string, string> = {
          'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
          'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
          'januari': '01', 'februari': '02', 'maret': '03', 'april': '04', 'mei': '05', 'juni': '06',
          'juli': '07', 'agustus': '08', 'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
        };

        // Try to parse formats like "29-Nov", "22 Nov 2025", "5 Dec", "5-Dec-2025"
        const regex = /(\d{1,2})[\s\-\/]?([a-zA-Z]+)[\s\-\/]?(\d{4})?/i;
        const match = dateStr.match(regex);

        if (match) {
          const day = match[1].padStart(2, '0');
          const monthName = match[2].toLowerCase().substring(0, 3);
          const month = months[monthName] || months[match[2].toLowerCase()] || '01';
          const year = match[3] || new Date().getFullYear().toString();
          return `${year}-${month}-${day}`;
        }

        // Try to parse DD/MM/YYYY or DD-MM-YYYY
        const numericRegex = /(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})/;
        const numMatch = dateStr.match(numericRegex);
        if (numMatch) {
          const day = numMatch[1].padStart(2, '0');
          const month = numMatch[2].padStart(2, '0');
          const year = numMatch[3];
          return `${year}-${month}-${day}`;
        }

        return dateStr;
      };

      setData({
        tgl: parseDate(extracted.tanggal || extracted.tgl),
        time: getString(extracted.waktu || extracted.time),
        trxId: getString(extracted.trx_id || extracted.trxId),
        transaksi: getString(extracted.transaksi),
        paymentType: getString(extracted.payment_type || extracted.paymentType),
        amount: parseNumber(extracted.amount),
        bAdmin: parseNumber(extracted.b_admin || extracted.bAdmin),
        bKirim: parseNumber(extracted.b_kirim || extracted.bKirim),
        bLayanan: parseNumber(extracted.b_layanan || extracted.bLayanan),
        diskon: parseNumber(extracted.diskon),
        loginStatus: getString(extracted.login_non_login || extracted.loginStatus) || 'Login',
        total: parseNumber(extracted.total),
        by: getString(extracted.by),
        remark: getString(extracted.remark)
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

    if (!isGoogleLoggedIn) {
      setError('Silakan login ke Google terlebih dahulu.');
      return;
    }

    if (!isGapiReady) {
      setError('Google API belum siap.');
      return;
    }

    setState('processing');

    try {
      await appendToSheet(data);
      setState('success');
    } catch (err) {
      console.error('Submit error:', err);
      setError('Gagal mengirim data ke Google Sheet.');
      setState('error');
    }
  };

  const reset = () => {
    setState('upload');
    setPreviewUrl(null);
    setData({
      tgl: '', time: '', trxId: '', transaksi: '', paymentType: '',
      amount: 0, bAdmin: 0, bKirim: 0, bLayanan: 0, diskon: 0,
      loginStatus: 'Login', total: 0, by: '', remark: ''
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 md:p-12">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-12 text-center relative">
          {/* Login Button */}
          <div className="absolute top-0 right-0">
            {isGoogleLoggedIn ? (
              <Button variant="outline" size="sm" onClick={handleGoogleLogout} className="bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30">
                <CheckCircle2 className="w-4 h-4" />
                Terhubung
                <LogOut className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => googleLogin()}>
                <LogIn className="w-4 h-4" />
                Login Google
              </Button>
            )}
          </div>

          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="pt-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white glow-text">
              Reimbursement AI
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
              Upload struk pembayaran Anda, AI akan melakukan sisanya.
            </p>

            {/* Project Selector */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <FolderOpen className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground text-sm">Project:</span>
              <Select value={selectedProjectId} onValueChange={handleProjectChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECTS.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        </header>

        <AnimatePresence mode="wait">
          {/* Upload State */}
          {state === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => fileInputRef.current?.click()}>
                <CardContent className="py-16 flex flex-col items-center text-center">
                  <motion.div
                    className="mb-8 p-6 bg-primary/10 rounded-3xl border border-primary/20"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <Upload className="w-16 h-16 text-primary" />
                  </motion.div>
                  <h2 className="text-3xl font-bold mb-3 text-white">Klik untuk Upload Struk</h2>
                  <p className="text-muted-foreground text-lg mb-8">Mendukung format JPG, PNG, atau PDF</p>
                  <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
                  <Button size="xl" className="shadow-lg shadow-primary/30">Pilih File Struk</Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Processing State */}
          {state === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <Card>
                <CardContent className="py-20 flex flex-col items-center text-center">
                  <div className="relative mb-8">
                    <motion.div
                      className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <Loader2 className="w-20 h-20 text-primary animate-spin relative z-10" />
                  </div>
                  <h2 className="text-3xl font-bold mb-3 text-white">Sedang Memproses...</h2>
                  <p className="text-muted-foreground text-lg">AI sedang membaca data dari struk Anda</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Review State */}
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
                        title="Klik untuk melihat lebih besar"
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
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

                    <div className="flex gap-4 pt-4">
                      <Button type="button" variant="outline" onClick={reset}>Batal</Button>
                      <Button type="submit" size="lg" className="flex-1">
                        <Send className="w-5 h-5" />
                        Kirim ke Google Sheet
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Success State */}
          {state === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <Card>
                <CardContent className="py-16 flex flex-col items-center text-center">
                  <motion.div
                    className="mb-8 p-6 bg-emerald-500/20 rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                  >
                    <CheckCircle2 className="w-20 h-20 text-emerald-400" />
                  </motion.div>
                  <h2 className="text-3xl font-bold mb-3 text-white">Berhasil!</h2>
                  <p className="text-muted-foreground text-lg mb-8">Data telah berhasil dikirim ke Google Sheet</p>
                  <Button size="lg" onClick={reset}>Upload Struk Lain</Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-destructive/50">
                <CardContent className="py-16 flex flex-col items-center text-center">
                  <motion.div
                    className="mb-8 p-6 bg-destructive/20 rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <AlertCircle className="w-20 h-20 text-destructive" />
                  </motion.div>
                  <h2 className="text-3xl font-bold mb-3 text-white">Terjadi Kesalahan</h2>
                  <p className="text-muted-foreground text-lg mb-8">{error}</p>
                  <Button size="lg" onClick={reset}>Coba Lagi</Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-16 text-center text-muted-foreground text-sm">
          <p>© 2026 Reimbursement AI System</p>
        </footer>
      </div>

      {/* Image Modal */}
      <AnimatePresence>
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
    </div>
  );
};

const AppWithProvider: React.FC = () => (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
);

export default AppWithProvider;
