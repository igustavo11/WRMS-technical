import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { cn } from '~/lib/utils';
import { useLogin } from '../hooks/useLogin';
import { type LoginFormValues, loginSchema } from '../schemas/loginSchema';

const BRANDING_GRID = [
	{ id: 'r1c1', filled: false },
	{ id: 'r1c2', filled: true },
	{ id: 'r1c3', filled: false },
	{ id: 'r2c1', filled: true },
	{ id: 'r2c2', filled: false },
	{ id: 'r2c3', filled: false },
];

export function LoginPage() {
	const navigate = useNavigate();
	const login = useLogin();
	const [showPassword, setShowPassword] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

	async function onSubmit(values: LoginFormValues) {
		try {
			await login.mutateAsync(values);
			toast.success('Login realizado com sucesso!');
			navigate('/');
		} catch (error) {
			const message =
				error instanceof AxiosError && error.response?.data?.message
					? error.response.data.message
					: 'Erro ao fazer login. Verifique suas credenciais.';
			toast.error(message);
		}
	}

	const passwordErrorMessage =
		errors.password?.message ??
		(login.isError ? 'Senha incorreta. Tente novamente.' : undefined);

	return (
		<div className="flex min-h-screen w-full bg-background">
			<div className="hidden flex-1 flex-col items-center justify-center border-r border-border bg-card p-8 lg:flex">
				<img src="/wtec-logo.svg" alt="WTEC" className="w-[280px]" />
				<p className="mt-4 max-w-[320px] text-center text-2xl font-semibold text-muted-foreground">
					Warehouse Reservation Management System
				</p>
				<div className="mt-16 grid grid-cols-3 gap-2 opacity-20">
					{BRANDING_GRID.map((cell) => (
						<div
							key={cell.id}
							className={cn(
								'size-16 rounded-sm',
								cell.filled ? 'bg-accent' : 'border border-accent',
							)}
						/>
					))}
				</div>
			</div>

			<div className="flex flex-1 flex-col items-center justify-center bg-background p-8">
				<div className="relative w-full max-w-[448px] overflow-hidden rounded-lg border border-border bg-card p-[33px] shadow-2xl">
					<div className="absolute inset-x-0 top-0 h-1 bg-primary" />

					<div className="mb-6 flex justify-center lg:hidden">
						<img src="/wtec-logo.svg" alt="WTEC" className="h-10" />
					</div>

					<div className="flex flex-col gap-2">
						<h1 className="text-3xl font-bold text-foreground">
							Entrar na sua conta
						</h1>
						<p className="text-sm text-muted-foreground">
							Gerencie reservas e inventário
						</p>
					</div>

					<form
						onSubmit={handleSubmit(onSubmit)}
						className="mt-8 flex flex-col gap-6"
					>
						<div className="flex flex-col gap-2">
							<Label
								htmlFor="email"
								className="text-[11px] tracking-wider text-muted-foreground uppercase"
							>
								E-mail de acesso
							</Label>
							<div className="relative">
								<Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id="email"
									type="email"
									className="h-auto rounded-[10px] py-[13px] pl-10"
									aria-invalid={!!errors.email}
									{...register('email')}
								/>
							</div>
							{errors.email && (
								<p className="text-xs text-destructive">
									{errors.email.message}
								</p>
							)}
						</div>

						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<Label
									htmlFor="password"
									className={cn(
										'text-[11px] tracking-wider uppercase',
										passwordErrorMessage
											? 'text-destructive'
											: 'text-muted-foreground',
									)}
								>
									Senha
								</Label>
							</div>
							<div className="relative">
								<Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id="password"
									type={showPassword ? 'text' : 'password'}
									className={cn(
										'h-auto rounded-[10px] py-[13px] pl-10 pr-10',
										passwordErrorMessage && 'border-destructive',
									)}
									aria-invalid={!!passwordErrorMessage}
									{...register('password')}
								/>
								<button
									type="button"
									onClick={() => setShowPassword((value) => !value)}
									className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
									aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
								>
									{showPassword ? (
										<EyeOff className="size-4" />
									) : (
										<Eye className="size-4" />
									)}
								</button>
							</div>
							{passwordErrorMessage && (
								<p className="text-xs text-destructive">
									{passwordErrorMessage}
								</p>
							)}
						</div>

						<Button
							type="submit"
							disabled={login.isPending}
							className="h-auto w-full justify-center gap-2 rounded-[10px] py-3 text-sm"
						>
							{login.isPending ? 'Entrando...' : 'Entrar'}
							<ArrowRight className="size-4" />
						</Button>
					</form>

					<div className="mt-8 flex items-center justify-center gap-2 border-t border-border pt-6 text-xs text-muted-foreground">
						<ShieldCheck className="size-3.5" />
						Acesso restrito a operadores autorizados
					</div>
				</div>
			</div>
		</div>
	);
}

export default LoginPage;
