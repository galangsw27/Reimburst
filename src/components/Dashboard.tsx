import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Upload, CheckCircle, Clock, XCircle, DollarSign, FileText, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { User } from '../types';
import { getDashboardStats } from '../services/reimbursementService';
import { UploadForm } from './UploadForm';
import { ApprovalList } from './ApprovalList';
import { HistoryList } from './HistoryList';

interface DashboardProps {
    user: User;
    onLogout: () => void;
}

type DashboardView = 'overview' | 'upload' | 'approval' | 'history' | 'download';

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
    const [view, setView] = useState<DashboardView>('overview');
    const [stats, setStats] = useState({
        totalRequests: 0,
        pendingApproval: 0,
        approved: 0,
        rejected: 0,
        totalAmount: 0,
    });

    const loadStats = () => {
        const userId = user.role === 'user' ? user.id : undefined;
        setStats(getDashboardStats(userId));
    };

    useEffect(() => {
        loadStats();
    }, [user]);

    const getRoleTitle = () => {
        switch (user.role) {
            case 'user': return 'User Dashboard';
            case 'head': return 'Head Dashboard';
            case 'lead': return 'Lead Dashboard';
            case 'finance': return 'Finance Dashboard';
        }
    };

    const canUpload = ['user', 'head', 'lead'].includes(user.role);
    const canApprove = ['head', 'lead', 'finance'].includes(user.role);
    const canDownload = user.role === 'finance';

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white glow-text">
                            {getRoleTitle()}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Welcome back, {user.name}
                        </p>
                    </div>
                    <Button variant="outline" onClick={onLogout}>
                        <LogOut className="w-4 h-4" />
                        Logout
                    </Button>
                </header>

                {/* Navigation */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    <Button
                        variant={view === 'overview' ? 'default' : 'outline'}
                        onClick={() => setView('overview')}
                    >
                        <FileText className="w-4 h-4" />
                        Overview
                    </Button>
                    {canUpload && (
                        <Button
                            variant={view === 'upload' ? 'default' : 'outline'}
                            onClick={() => setView('upload')}
                        >
                            <Upload className="w-4 h-4" />
                            Upload Reimbursement
                        </Button>
                    )}
                    {canApprove && (
                        <Button
                            variant={view === 'approval' ? 'default' : 'outline'}
                            onClick={() => setView('approval')}
                        >
                            <CheckCircle className="w-4 h-4" />
                            Approval
                        </Button>
                    )}
                    <Button
                        variant={view === 'history' ? 'default' : 'outline'}
                        onClick={() => setView('history')}
                    >
                        <Clock className="w-4 h-4" />
                        History
                    </Button>
                    {canDownload && (
                        <Button
                            variant={view === 'download' ? 'default' : 'outline'}
                            onClick={() => setView('download')}
                        >
                            <Download className="w-4 h-4" />
                            Download Excel
                        </Button>
                    )}
                </div>

                {/* Content */}
                {view === 'overview' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                    >
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                                <FileText className="w-4 h-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalRequests}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                                <Clock className="w-4 h-4 text-yellow-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-yellow-500">{stats.pendingApproval}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Approved</CardTitle>
                                <CheckCircle className="w-4 h-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-500">{stats.approved}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                                <XCircle className="w-4 h-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-500">{stats.rejected}</div>
                            </CardContent>
                        </Card>

                        <Card className="md:col-span-2 lg:col-span-4">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                                <DollarSign className="w-4 h-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    Rp {stats.totalAmount.toLocaleString('id-ID')}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {view === 'upload' && canUpload && (
                    <UploadForm user={user} onSuccess={() => { loadStats(); setView('history'); }} />
                )}

                {view === 'approval' && canApprove && (
                    <ApprovalList user={user} onUpdate={loadStats} />
                )}

                {view === 'history' && (
                    <HistoryList user={user} />
                )}

                {view === 'download' && canDownload && (
                    <HistoryList user={user} showDownload />
                )}
            </div>
        </div>
    );
};
