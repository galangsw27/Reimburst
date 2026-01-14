import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Eye, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { User, ReimbursementRequest } from '../types';
import { getAllRequests, getRequestsByUser, getApprovedRequests, exportToExcel } from '../services/reimbursementService';

interface HistoryListProps {
    user: User;
    showDownload?: boolean;
}

export const HistoryList: React.FC<HistoryListProps> = ({ user, showDownload = false }) => {
    const [requests, setRequests] = useState<ReimbursementRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<ReimbursementRequest | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

    useEffect(() => {
        loadRequests();
    }, [user, showDownload]);

    const loadRequests = () => {
        let allRequests: ReimbursementRequest[];
        
        if (showDownload) {
            allRequests = getApprovedRequests();
        } else if (user.role === 'user') {
            allRequests = getRequestsByUser(user.id);
        } else {
            allRequests = getAllRequests();
        }
        
        setRequests(allRequests.sort((a, b) => 
            new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()
        ));
    };

    const handleDownloadExcel = () => {
        const csvData = exportToExcel(requests);
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `reimbursement_approved_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            pending: { class: 'bg-yellow-500/20 text-yellow-500', icon: Clock },
            approved_head: { class: 'bg-blue-500/20 text-blue-500', icon: CheckCircle },
            approved_lead: { class: 'bg-blue-500/20 text-blue-500', icon: CheckCircle },
            approved_finance: { class: 'bg-green-500/20 text-green-500', icon: CheckCircle },
            rejected: { class: 'bg-red-500/20 text-red-500', icon: XCircle },
        };
        return badges[status as keyof typeof badges] || badges.pending;
    };

    const filteredRequests = requests.filter(req => {
        if (filter === 'all') return true;
        if (filter === 'pending') return req.status === 'pending' || req.status === 'approved_head' || req.status === 'approved_lead';
        if (filter === 'approved') return req.status === 'approved_finance';
        if (filter === 'rejected') return req.status === 'rejected';
        return true;
    });

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>
                            {showDownload ? 'Approved Reimbursements' : 'History'} ({filteredRequests.length})
                        </CardTitle>
                        {showDownload && requests.length > 0 && (
                            <Button onClick={handleDownloadExcel}>
                                <Download className="w-4 h-4" />
                                Download Excel
                            </Button>
                        )}
                    </div>
                    {!showDownload && (
                        <div className="flex gap-2 mt-4">
                            <Button
                                size="sm"
                                variant={filter === 'all' ? 'default' : 'outline'}
                                onClick={() => setFilter('all')}
                            >
                                All
                            </Button>
                            <Button
                                size="sm"
                                variant={filter === 'pending' ? 'default' : 'outline'}
                                onClick={() => setFilter('pending')}
                            >
                                Pending
                            </Button>
                            <Button
                                size="sm"
                                variant={filter === 'approved' ? 'default' : 'outline'}
                                onClick={() => setFilter('approved')}
                            >
                                Approved
                            </Button>
                            <Button
                                size="sm"
                                variant={filter === 'rejected' ? 'default' : 'outline'}
                                onClick={() => setFilter('rejected')}
                            >
                                Rejected
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    {filteredRequests.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Tidak ada data reimbursement</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredRequests.map((request) => {
                                const statusInfo = getStatusBadge(request.status);
                                const StatusIcon = statusInfo.icon;
                                
                                return (
                                    <motion.div
                                        key={request.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="border border-border rounded-lg p-4 hover:border-primary/50 transition-all"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h3 className="font-semibold text-lg">{request.id}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {request.userName} • {new Date(request.submittedDate).toLocaleDateString('id-ID', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusInfo.class}`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {request.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                                            <div>
                                                <span className="text-muted-foreground">Nama:</span>
                                                <p className="font-medium">{request.data.nama || '-'}</p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">MSISDN/Email:</span>
                                                <p className="font-medium">{request.data.msisdnEmail || '-'}</p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Transaksi:</span>
                                                <p className="font-medium">{request.data.transaksi}</p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Total:</span>
                                                <p className="font-medium text-green-500">Rp {request.data.total.toLocaleString('id-ID')}</p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Payment:</span>
                                                <p className="font-medium">{request.data.paymentType}</p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Date:</span>
                                                <p className="font-medium">{request.data.tgl}</p>
                                            </div>
                                        </div>

                                        {/* Approval Status */}
                                        <div className="flex gap-4 mb-4 text-xs">
                                            <div className={`flex items-center gap-1 ${request.approvals.head ? 'text-green-500' : 'text-muted-foreground'}`}>
                                                {request.approvals.head ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                Head: {request.approvals.head ? request.approvals.head.by : 'Pending'}
                                            </div>
                                            <div className={`flex items-center gap-1 ${request.approvals.lead ? 'text-green-500' : 'text-muted-foreground'}`}>
                                                {request.approvals.lead ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                Lead: {request.approvals.lead ? request.approvals.lead.by : 'Pending'}
                                            </div>
                                            <div className={`flex items-center gap-1 ${request.approvals.finance ? 'text-green-500' : 'text-muted-foreground'}`}>
                                                {request.approvals.finance ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                Finance: {request.approvals.finance ? request.approvals.finance.by : 'Pending'}
                                            </div>
                                        </div>

                                        {request.rejectionReason && (
                                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                                <p className="text-sm text-red-500">
                                                    <strong>Rejection Reason:</strong> {request.rejectionReason}
                                                </p>
                                            </div>
                                        )}

                                        {/* Asset Match Result (if available) */}
                                        {request.approvals.finance?.assetMatch && (
                                            <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                    <strong className="text-sm">Asset Matched</strong>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div>
                                                        <span className="text-muted-foreground">Asset ID:</span>
                                                        <p className="font-medium">{request.approvals.finance.assetMatch.assetId}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Employee:</span>
                                                        <p className="font-medium">{request.approvals.finance.assetMatch.employeeName}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Department:</span>
                                                        <p className="font-medium">{request.approvals.finance.assetMatch.department}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Confidence:</span>
                                                        <p className="font-medium">{((request.approvals.finance.assetMatch.confidence || 0) * 100).toFixed(0)}%</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setSelectedRequest(selectedRequest?.id === request.id ? null : request)}
                                        >
                                            <Eye className="w-4 h-4" />
                                            {selectedRequest?.id === request.id ? 'Hide Details' : 'View Details'}
                                        </Button>

                                        {selectedRequest?.id === request.id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="mt-4 pt-4 border-t border-border"
                                            >
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-4">
                                                    <div><span className="text-muted-foreground">TRX ID:</span> {request.data.trxId}</div>
                                                    <div><span className="text-muted-foreground">Time:</span> {request.data.time}</div>
                                                    <div><span className="text-muted-foreground">Amount:</span> Rp {request.data.amount.toLocaleString('id-ID')}</div>
                                                    <div><span className="text-muted-foreground">B.Admin:</span> Rp {request.data.bAdmin.toLocaleString('id-ID')}</div>
                                                    <div><span className="text-muted-foreground">B.Kirim:</span> Rp {request.data.bKirim.toLocaleString('id-ID')}</div>
                                                    <div><span className="text-muted-foreground">B.Layanan:</span> Rp {request.data.bLayanan.toLocaleString('id-ID')}</div>
                                                    <div><span className="text-muted-foreground">Diskon:</span> Rp {request.data.diskon.toLocaleString('id-ID')}</div>
                                                    <div><span className="text-muted-foreground">Login Status:</span> {request.data.loginStatus}</div>
                                                    <div><span className="text-muted-foreground">By:</span> {request.data.by}</div>
                                                </div>
                                                {request.data.remark && (
                                                    <div className="mb-3">
                                                        <span className="text-muted-foreground">Remark:</span>
                                                        <p className="mt-1">{request.data.remark}</p>
                                                    </div>
                                                )}
                                                {request.imageUrl && (
                                                    <div>
                                                        <span className="text-muted-foreground">Receipt Image:</span>
                                                        <img
                                                            src={request.imageUrl}
                                                            alt="Receipt"
                                                            className="mt-2 w-48 h-48 object-cover rounded-lg cursor-pointer hover:opacity-80"
                                                            onClick={() => window.open(request.imageUrl, '_blank')}
                                                        />
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
