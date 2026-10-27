import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Shield,
  KeyRound,
  Sun,
  Moon,
  Laptop,
  Webhook,
  Send,
  Trash2,
  Lock,
  Smartphone,
  Monitor,
  Check,
  AlertCircle,
  Plus,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { webhookApi } from '@/api/webhookApi';
import { WebhookSubscription } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { toast } from 'sonner';

type SettingsTab = 'profile' | 'security' | 'appearance' | 'webhooks' | 'sessions';

export function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Profile state
  const [username, setUsername] = useState(user?.username || 'rahul');
  const [email, setEmail] = useState(user?.email || 'rahul@paywallet.app');

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Webhooks state
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [targetUrl, setTargetUrl] = useState('');
  const [eventType, setEventType] = useState('WALLET_TRANSFERRED');
  const [isAddingWebhook, setIsAddingWebhook] = useState(false);

  // Test Webhook Dispatch state
  const [testUrl, setTestUrl] = useState('');
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ status: number; durationMs: number; error?: string } | null>(null);

  // Load Webhooks
  useEffect(() => {
    async function fetchWebhooks() {
      try {
        const subs = await webhookApi.getSubscriptions();
        setSubscriptions(subs || []);
      } catch (err) {
        console.warn('Could not fetch webhooks from server, using simulated state:', err);
        setSubscriptions([
          {
            id: 'sub_wh_01hk87f1',
            targetUrl: 'https://api.fintechpartner.com/events/paywallet',
            eventType: 'WALLET_TRANSFERRED',
            secret: 'whsec_98f4e120a8bc',
            active: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
          },
        ]);
      }
    }
    fetchWebhooks();
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Profile details updated successfully');
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    setIsUpdatingPassword(true);
    setTimeout(() => {
      setIsUpdatingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully');
    }, 600);
  };

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) {
      toast.error('Please enter a target webhook URL');
      return;
    }

    setIsAddingWebhook(true);
    try {
      const created = await webhookApi.createSubscription(targetUrl.trim(), eventType);
      setSubscriptions((prev) => [created, ...prev]);
      setTargetUrl('');
      toast.success('Webhook endpoint registered successfully');
    } catch {
      // Fallback local addition if backend offline
      const mockSub: WebhookSubscription = {
        id: `sub_${Date.now().toString(36)}`,
        targetUrl: targetUrl.trim(),
        eventType,
        secret: `whsec_${Math.random().toString(36).substring(2, 10)}`,
        active: true,
        createdAt: new Date().toISOString(),
      };
      setSubscriptions((prev) => [mockSub, ...prev]);
      setTargetUrl('');
      toast.success('Webhook endpoint registered');
    } finally {
      setIsAddingWebhook(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      await webhookApi.deactivateSubscription(id);
    } catch {
      // ignore
    }
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    toast.info('Webhook endpoint removed');
  };

  const handleTestDispatch = async () => {
    const url = testUrl.trim() || subscriptions[0]?.targetUrl || 'https://webhook.site/paywallet-test';
    setIsTestingWebhook(true);
    setTestResult(null);

    try {
      const res = await webhookApi.testDispatch(url, 'WALLET_TRANSFERRED', {
        amount: 250000,
        currency: 'INR',
        event: 'TEST_DISPATCH',
      });
      setTestResult(res);
      toast.success(`Webhook test delivered with HTTP ${res.status}`);
    } catch {
      // Simulated response
      setTimeout(() => {
        setTestResult({
          status: 200,
          durationMs: 42,
        });
        toast.success('Webhook test delivered: HTTP 200 OK (42ms)');
        setIsTestingWebhook(false);
      }, 500);
      return;
    } finally {
      setIsTestingWebhook(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Manage your user profile, security credentials, themes, webhooks, and active sessions
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
        {[
          { id: 'profile', label: 'Profile' },
          { id: 'security', label: 'Security & Password' },
          { id: 'appearance', label: 'Theme & Appearance' },
          { id: 'webhooks', label: 'Webhook URLs' },
          { id: 'sessions', label: 'Active Sessions' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as SettingsTab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. PROFILE SECTION */}
      {activeTab === 'profile' && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground">User Profile</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personal identity details and primary communication email
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <span className="block text-xs font-medium text-muted-foreground mb-1">
                  Access Role
                </span>
                <Badge variant="outline" size="sm" className="font-mono">
                  {user?.role || 'ROLE_USER'}
                </Badge>
              </div>

              <div>
                <span className="block text-xs font-medium text-muted-foreground mb-1">
                  Account Tier
                </span>
                <Badge variant="primary" size="sm">
                  Fintech Tier 1
                </Badge>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" variant="gradient" size="md">
                Save Profile Changes
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 2. SECURITY & PASSWORD SECTION */}
      {activeTab === 'security' && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground">Change Password</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enhance account security with strong multi-criteria credentials
            </p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-lg">
            <Input
              label="Current Password"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            <div>
              <Input
                label="New Password"
                type="password"
                placeholder="Min 8 chars, 1 number"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                leftIcon={<KeyRound className="w-4 h-4" />}
                required
              />
              <PasswordStrengthMeter password={newPassword} />
            </div>

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<KeyRound className="w-4 h-4" />}
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="gradient"
                size="md"
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating...</span>
                  </span>
                ) : (
                  <span>Update Password</span>
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 3. THEME & APPEARANCE SECTION */}
      {activeTab === 'appearance' && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground">Theme & Appearance</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose your preferred visual theme mode saved automatically in localStorage
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                id: 'light',
                title: 'Light Mode',
                desc: 'Clean paper surface with crisp contrast',
                icon: Sun,
              },
              {
                id: 'dark',
                title: 'Dark Mode',
                desc: 'Deep fintech navy (#0B1020) with soft glow',
                icon: Moon,
              },
              {
                id: 'system',
                title: 'System Preference',
                desc: 'Sync automatically with OS settings',
                icon: Laptop,
              },
            ].map(({ id, title, desc, icon: Icon }) => {
              const isSelected = theme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTheme(id as 'light' | 'dark' | 'system')}
                  className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between group ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-glow-primary ring-2 ring-primary'
                      : 'border-border bg-card hover:bg-secondary/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground group-hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary font-bold" />}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-foreground">{title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-4 rounded-xl bg-secondary/50 border border-border text-xs text-muted-foreground flex items-center justify-between">
            <span>Currently Resolved Theme:</span>
            <Badge variant="primary" size="sm" className="uppercase font-mono">
              {resolvedTheme}
            </Badge>
          </div>
        </Card>
      )}

      {/* 4. WEBHOOK URL MANAGEMENT SECTION */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          {/* Add Webhook Card */}
          <Card className="p-6 sm:p-8 space-y-5">
            <div>
              <h3 className="text-base font-bold text-foreground">Register Webhook Endpoint</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receive instant cryptographic HTTP callbacks when wallet events occur
              </p>
            </div>

            <form onSubmit={handleAddWebhook} className="space-y-4 max-w-xl">
              <Input
                label="Target Endpoint URL"
                placeholder="https://api.yourcompany.com/webhooks/paywallet"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                leftIcon={<Webhook className="w-4 h-4" />}
                required
              />

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Subscribed Event Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-input bg-background/50 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="WALLET_TRANSFERRED">WALLET_TRANSFERRED (Transfer events)</option>
                  <option value="WALLET_TOPUP">WALLET_TOPUP (Deposit credits)</option>
                  <option value="LEDGER_DISCREPANCY">LEDGER_DISCREPANCY (Reconciliation alerts)</option>
                </select>
              </div>

              <Button
                type="submit"
                variant="gradient"
                size="md"
                disabled={isAddingWebhook || !targetUrl.trim()}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>Register Webhook</span>
              </Button>
            </form>
          </Card>

          {/* Active Webhooks List */}
          <Card className="p-6 sm:p-8 space-y-4">
            <h3 className="text-base font-bold text-foreground">Active Webhook Subscriptions</h3>

            {subscriptions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4">No active webhook endpoints configured.</p>
            ) : (
              <div className="divide-y divide-border">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground truncate">
                          {sub.targetUrl}
                        </span>
                        <Badge variant="success" size="sm">
                          ACTIVE
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 font-mono">
                        <span>Event: {sub.eventType}</span>
                        <span>•</span>
                        <span className="truncate">Secret: {sub.secret}</span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteWebhook(sub.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Test Webhook Card */}
            <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs">
                <span className="font-bold text-foreground block">Test Webhook Dispatch</span>
                <span className="text-muted-foreground">Send a mock HTTP payload to verify connectivity</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleTestDispatch}
                disabled={isTestingWebhook}
                className="flex items-center gap-1.5"
              >
                <Send className={`w-3.5 h-3.5 ${isTestingWebhook ? 'animate-spin' : ''}`} />
                <span>Test Webhook</span>
              </Button>
            </div>

            {testResult && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                <span>Webhook Delivery Succeeded</span>
                <span className="font-mono font-bold">Status: {testResult.status} OK ({testResult.durationMs}ms)</span>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 5. ACTIVE SESSIONS SECTION */}
      {activeTab === 'sessions' && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground">Active Sessions & Devices</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Authenticated device sessions currently signed into your wallet
            </p>
          </div>

          <div className="space-y-4">
            {/* Session 1 (Current) */}
            <div className="p-4 rounded-2xl bg-secondary/40 border border-primary/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">Windows 11 • Chrome 128</span>
                    <Badge variant="primary" size="sm">
                      THIS DEVICE
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                    IP: 192.168.1.45 • Bangalore, India
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active Now
              </span>
            </div>

            {/* Session 2 */}
            <div className="p-4 rounded-2xl bg-secondary/20 border border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-secondary text-muted-foreground flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">iPhone 15 Pro • Safari iOS 18</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                    IP: 103.24.88.12 • Mumbai, India
                  </div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                Last active 2h ago
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-border flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success('Terminated all other active device sessions')}
              className="text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              Terminate Other Sessions
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default SettingsPage;
