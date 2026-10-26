import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CountUp } from '@/components/ui/CountUp';
import { AnimatedCheckmark } from '@/components/ui/AnimatedCheckmark';
import { Sparkles, ShieldCheck, ArrowRight, Zap } from 'lucide-react';

interface PlaceholderProps {
  pageTitle: string;
  pageStep: string;
  description: string;
}

export function PlaceholderPage({ pageTitle, pageStep, description }: PlaceholderProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-card border border-border shadow-card">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="default">{pageStep}</Badge>
            <Badge variant="success">Layout Shell Active</Badge>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="gradient" size="sm">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Ready for Prompt
          </Button>
        </div>
      </div>

      {/* Design System & Token Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Glass Card with Animated Balance */}
        <Card variant="hero" className="p-6 flex flex-col justify-between min-h-[190px]">
          <div>
            <div className="flex items-center justify-between text-white/80 text-xs font-semibold mb-2">
              <span>Primary Wallet Balance</span>
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="text-3xl font-extrabold text-white">
              <CountUp valuePaise={12500050} />
            </div>
            <p className="text-xs text-white/70 mt-1">₹1,25,000.50 (Minor units: 12,500,050 paise)</p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/15 text-xs text-white/80">
            <span>ID: pw_live_••••89cf</span>
            <span className="font-mono text-[11px] bg-white/20 px-2 py-0.5 rounded-full">ACTIVE</span>
          </div>
        </Card>

        {/* UI Variant Preview */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <CardTitle className="text-base">Fintech Tokens Active</CardTitle>
            <CardDescription className="mt-1">
              Primary Indigo (#4F46E5), Accent Gradient, Soft shadows & 8px grid.
            </CardDescription>

            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="success">+₹5,000.00 (Credit)</Badge>
              <Badge variant="danger">-₹1,200.00 (Debit)</Badge>
              <Badge variant="warning">In-Flight (Pending)</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Button variant="default" size="sm">
              Button Action
            </Button>
            <Button variant="outline" size="sm">
              Secondary
            </Button>
          </div>
        </Card>

        {/* Motion Preview */}
        <Card className="p-6 flex flex-col items-center justify-center text-center">
          <AnimatedCheckmark size={48} className="mb-2" />
          <h4 className="text-sm font-bold text-foreground">Under 300ms Motion</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Micro-interactions, count-up numbers, page transitions and spring animations.
          </p>
        </Card>
      </div>
    </div>
  );
}
