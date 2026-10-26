import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { NavLink, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username cannot exceed 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
      .trim(),
    email: z.string().email('Please enter a valid email address').trim(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[a-zA-Z]/, 'Password must contain at least one letter'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    agreeTerms: z.literal(true, {
      message: 'You must accept the terms of service',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeTerms: true,
    },
  });

  const passwordValue = watch('password', '');

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      await registerUser(data.username, data.email, data.password);
      toast.success('Account created successfully! Welcome to Paywallet.');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      let message = 'Failed to create account. Please check your details.';
      if (err && typeof err === 'object' && 'response' in err) {
        const responseData = (err as { response?: { data?: { message?: string } } }).response?.data;
        if (responseData?.message) {
          message = responseData.message;
        }
      }
      setServerError(message);
      toast.error(message);
    }
  };

  return (
    <AuthSplitLayout
      heading="Create your account"
      subheading="Get started with Paywallet in seconds. Instant wallet creation, double-entry ledger security, and zero duplicate debits."
    >
      {/* Server Error Alert */}
      {serverError && (
        <div className="mb-5 p-3.5 rounded-xl bg-danger/15 border border-danger/30 text-danger text-xs flex items-center gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Username */}
        <Input
          label="Username"
          type="text"
          placeholder="e.g. rahul_dev"
          autoComplete="username"
          leftIcon={<User className="w-4 h-4" />}
          error={errors.username?.message}
          {...register('username')}
        />

        {/* Email */}
        <Input
          label="Email Address"
          type="email"
          placeholder="name@company.com"
          autoComplete="email"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        {/* Password */}
        <div>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min 8 chars, 1 number"
            autoComplete="new-password"
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            error={errors.password?.message}
            {...register('password')}
          />
          {/* Dynamic Password Strength Meter */}
          <PasswordStrengthMeter password={passwordValue} />
        </div>

        {/* Confirm Password */}
        <Input
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Repeat your password"
          autoComplete="new-password"
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {/* Agree Terms Checkbox */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-muted-foreground select-none">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-border text-primary focus:ring-primary w-4 h-4 accent-primary"
              {...register('agreeTerms')}
            />
            <span>
              I agree to the{' '}
              <span className="text-primary font-semibold hover:underline">Terms of Service</span> and{' '}
              <span className="text-primary font-semibold hover:underline">Privacy Policy</span>.
            </span>
          </label>
          {errors.agreeTerms && (
            <p className="text-xs text-danger font-medium mt-1 animate-fade-in">
              {errors.agreeTerms.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="gradient"
          size="lg"
          isLoading={isSubmitting}
          className="w-full mt-2"
        >
          <span>Create Account</span>
          <ArrowRight className="w-4 h-4" />
        </Button>

        {/* Sign In Link */}
        <div className="text-center text-xs text-muted-foreground pt-3">
          Already have an account?{' '}
          <NavLink to="/login" className="text-primary font-bold hover:underline">
            Sign in
          </NavLink>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
