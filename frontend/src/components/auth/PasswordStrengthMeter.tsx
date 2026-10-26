import React, { useMemo } from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const analysis = useMemo(() => {
    const hasMinLength = password.length >= 8;
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    const criteria = [
      { label: 'At least 8 characters', met: hasMinLength },
      { label: 'Uppercase & lowercase letters', met: hasLower && hasUpper },
      { label: 'At least one number (0-9)', met: hasNumber },
      { label: 'At least one symbol (!@#$...)', met: hasSpecial },
    ];

    const score = criteria.filter((c) => c.met).length;

    let label = 'Too Weak';
    let colorClass = 'bg-slate-300 dark:bg-slate-700';

    if (score === 1) {
      label = 'Weak';
      colorClass = 'bg-danger';
    } else if (score === 2) {
      label = 'Fair';
      colorClass = 'bg-warning';
    } else if (score === 3) {
      label = 'Good';
      colorClass = 'bg-primary';
    } else if (score === 4) {
      label = 'Strong';
      colorClass = 'bg-success';
    }

    return { criteria, score, label, colorClass };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2 pt-1 animate-fade-in">
      {/* Strength Header */}
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-muted-foreground">Password strength</span>
        <span
          className={
            analysis.score <= 1
              ? 'text-danger'
              : analysis.score === 2
              ? 'text-warning'
              : analysis.score === 3
              ? 'text-primary'
              : 'text-success'
          }
        >
          {analysis.label}
        </span>
      </div>

      {/* 4-Segment Progress Bar */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-full rounded-full transition-all duration-300 ${
              step <= analysis.score ? analysis.colorClass : 'bg-border/60'
            }`}
          />
        ))}
      </div>

      {/* Criteria Checklist */}
      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
        {analysis.criteria.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 transition-colors ${
              item.met ? 'text-success font-medium' : 'text-muted-foreground'
            }`}
          >
            {item.met ? (
              <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
