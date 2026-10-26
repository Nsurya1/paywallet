import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').trim(),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isExpired = new URLSearchParams(location.search).get('expired') === 'true';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: true,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      await login(data.username, data.password);
      toast.success('Welcome back to Paywallet!');
      const destination = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      let message = 'Invalid username or password. Please try again.';
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

  const handleFillDemo = () => {
    setValue('username', 'rahul');
    setValue('password', 'password123', { shouldValidate: true });
    toast.info('Filled demo credentials (rahul)');
  };

  return (
    <AuthSplitLayout
      heading="Welcome back"
      subheading="Sign in to your account to access your wallet, transfer funds, and review ledger transactions."
    >
      {/* Session Expired Banner */}
      {isExpired && (
        <div className="mb-5 p-3.5 rounded-xl bg-warning/15 border border-warning/30 text-warning text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Your session has expired. Please sign in again to continue.</span>
        </div>
      )}

      {/* Server Error Alert */}
      {serverError && (
        <div className="mb-5 p-3.5 rounded-xl bg-danger/15 border border-danger/30 text-danger text-xs flex items-center gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Username */}
        <Input
          label="Username"
          type="text"
          placeholder="e.g. rahul"
          autoComplete="username"
          leftIcon={<User className="w-4 h-4" />}
          error={errors.username?.message}
          {...register('username')}
        />

        {/* Password */}
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          autoComplete="current-password"
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

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors select-none">
            <input
              type="checkbox"
              className="rounded border-border text-primary focus:ring-primary w-4 h-4 accent-primary"
              {...register('rememberMe')}
            />
            <span>Remember this device</span>
          </label>

          <button
            type="button"
            onClick={() => toast.info('Password recovery is managed by your enterprise administrator.')}
            className="text-primary hover:underline font-semibold"
          >
            Forgot password?
          </button>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="gradient"
          size="lg"
          isLoading={isSubmitting}
          className="w-full mt-2"
        >
          <span>Sign In</span>
          <ArrowRight className="w-4 h-4" />
        </Button>

        {/* Demo Account Quick-Fill Chip */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleFillDemo}
            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-primary/30 hover:border-primary/60 bg-primary/5 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-fill Demo Account (rahul)</span>
          </button>
        </div>

        {/* Sign Up Link */}
        <div className="text-center text-xs text-muted-foreground pt-4">
          Don&apos;t have an account?{' '}
          <NavLink to="/register" className="text-primary font-bold hover:underline">
            Create an account
          </NavLink>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
