import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { login } from '../services/authService';
import { User } from '../types';

interface LoginPageProps {
    onLogin: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const user = login(email, password);
        if (user) {
            onLogin(user);
        } else {
            setError('Email atau password salah');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-2 text-white glow-text">
                        AIRism
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        AI Reimbursement System
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">
                        Silakan login untuk melanjutkan
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Login</CardTitle>
                        <CardDescription>Masukkan kredensial Anda</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="user@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-2 text-destructive text-sm"
                                >
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </motion.div>
                            )}

                            <Button type="submit" className="w-full" size="lg">
                                <LogIn className="w-4 h-4" />
                                Login
                            </Button>
                        </form>

                        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-2 font-semibold">Demo Accounts:</p>
                            <div className="space-y-1 text-xs text-muted-foreground">
                                <p>• User: user@company.com</p>
                                <p>• Head: head@company.com</p>
                                <p>• Lead: lead@company.com</p>
                                <p>• Finance: finance@company.com</p>
                                <p className="mt-2 italic">Password: any</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};
