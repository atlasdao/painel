'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/app/lib/auth';
import toast, { Toaster } from 'react-hot-toast';
import { Eye, EyeOff, UserPlus, Check, X, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [emailServerError, setEmailServerError] = useState<string | null>(null);

  // Validações
  const validations = {
    username: {
      minLength: formData.username.length >= 3,
      maxLength: formData.username.length <= 20,
      format: /^[a-zA-Z0-9_]+$/.test(formData.username),
    },
    email: {
      format: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
    },
    password: {
      minLength: formData.password.length >= 8,
      hasNumber: /\d/.test(formData.password),
      hasLetter: /[a-zA-Z]/.test(formData.password),
    },
    confirmPassword: {
      matches: formData.password === formData.confirmPassword && formData.confirmPassword.length > 0,
    },
  };

  const isFormValid = 
    validations.username.minLength && 
    validations.username.maxLength && 
    validations.username.format &&
    validations.email.format &&
    validations.password.minLength &&
    validations.password.hasNumber &&
    validations.password.hasLetter &&
    validations.confirmPassword.matches;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    // Clear server email error when user modifies email
    if (e.target.name === 'email') {
      setEmailServerError(null);
    }
  };

  const handleBlur = (field: string) => {
    setTouched({
      ...touched,
      [field]: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Marcar todos os campos como tocados
    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!isFormValid) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    setLoading(true);

    try {
      await authService.register(
        formData.username,
        formData.email,
        formData.password
      );
      toast.success('Cadastro realizado com sucesso!');
      router.push('/dashboard');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao criar conta';
      const errors = error.response?.data?.errors;

      if (errors && Array.isArray(errors)) {
        let disposableEmailError = false;

        errors.forEach((err: any) => {
          // Check if this is a disposable email error
          if (err.field && err.message) {
            const fullMessage = `${err.field} ${err.message}`;

            if (fullMessage.includes('temporários') ||
                err.field.toLowerCase() === 'endereços' ||
                err.message.toLowerCase().includes('temporários') ||
                (fullMessage.toLowerCase().includes('email') && fullMessage.includes('temporários'))) {
              // This is the disposable email error
              const completeMessage = "Endereços de email temporários não são permitidos. Use um email permanente.";
              setEmailServerError(completeMessage);
              toast.error(completeMessage);
              disposableEmailError = true;
            } else {
              toast.error(err.message || err);
            }
          } else {
            toast.error(err.message || err);
          }
        });

        if (!disposableEmailError) {
          toast.error(message);
        }
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="card bg-gray-800 border-gray-700">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Criar Conta</h2>
          <p className="text-gray-400 mt-2">Preencha os dados abaixo para se registrar</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Username Field */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300">
              Nome de usuário
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className={`input-field mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 ${
                touched.username && !validations.username.format ? 'border-red-500' : ''
              } ${
                touched.username && validations.username.format && validations.username.minLength && validations.username.maxLength ? 'border-green-500' : ''
              }`}
              placeholder="johndoe"
              value={formData.username}
              onChange={handleChange}
              onBlur={() => handleBlur('username')}
            />
            
            {/* Username Validations */}
            {touched.username && (
              <div className="mt-2 space-y-1">
                <div className={`flex items-center text-xs ${validations.username.minLength ? 'text-green-400' : 'text-red-400'}`}>
                  {validations.username.minLength ? <Check size={12} className="mr-1" /> : <X size={12} className="mr-1" />}
                  Mínimo 3 caracteres
                </div>
                <div className={`flex items-center text-xs ${validations.username.maxLength ? 'text-green-400' : 'text-red-400'}`}>
                  {validations.username.maxLength ? <Check size={12} className="mr-1" /> : <X size={12} className="mr-1" />}
                  Máximo 20 caracteres
                </div>
                <div className={`flex items-center text-xs ${validations.username.format ? 'text-green-400' : 'text-red-400'}`}>
                  {validations.username.format ? <Check size={12} className="mr-1" /> : <X size={12} className="mr-1" />}
                  Apenas letras, números e underscore
                </div>
              </div>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={`input-field mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 ${
                emailServerError || (touched.email && !validations.email.format) ? 'border-red-500' : ''
              } ${
                !emailServerError && touched.email && validations.email.format ? 'border-green-500' : ''
              }`}
              placeholder="seu@email.com"
              value={formData.email}
              onChange={handleChange}
              onBlur={() => handleBlur('email')}
            />
            
            {/* Email Validation */}
            {emailServerError ? (
              <div className="mt-2 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-400">{emailServerError}</p>
              </div>
            ) : touched.email && !validations.email.format ? (
              <div className="mt-2 flex items-center text-xs text-red-400">
                <X size={12} className="mr-1" />
                Email inválido
              </div>
            ) : touched.email && validations.email.format ? (
              <div className="mt-2 flex items-center text-xs text-green-400">
                <Check size={12} className="mr-1" />
                Email válido
              </div>
            ) : null}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Senha
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className={`input-field pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 ${
                  touched.password && (!validations.password.minLength || !validations.password.hasNumber || !validations.password.hasLetter) ? 'border-red-500' : ''
                } ${
                  touched.password && validations.password.minLength && validations.password.hasNumber && validations.password.hasLetter ? 'border-green-500' : ''
                }`}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                onBlur={() => handleBlur('password')}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            
            {/* Password Validations */}
            {touched.password && (
              <div className="mt-2 space-y-1">
                <div className={`flex items-center text-xs ${validations.password.minLength ? 'text-green-400' : 'text-red-400'}`}>
                  {validations.password.minLength ? <Check size={12} className="mr-1" /> : <X size={12} className="mr-1" />}
                  Mínimo 8 caracteres
                </div>
                <div className={`flex items-center text-xs ${validations.password.hasNumber ? 'text-green-400' : 'text-red-400'}`}>
                  {validations.password.hasNumber ? <Check size={12} className="mr-1" /> : <X size={12} className="mr-1" />}
                  Pelo menos um número
                </div>
                <div className={`flex items-center text-xs ${validations.password.hasLetter ? 'text-green-400' : 'text-red-400'}`}>
                  {validations.password.hasLetter ? <Check size={12} className="mr-1" /> : <X size={12} className="mr-1" />}
                  Pelo menos uma letra
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
              Confirmar senha
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              className={`input-field mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 ${
                touched.confirmPassword && !validations.confirmPassword.matches ? 'border-red-500' : ''
              } ${
                touched.confirmPassword && validations.confirmPassword.matches ? 'border-green-500' : ''
              }`}
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={() => handleBlur('confirmPassword')}
            />
            
            {/* Confirm Password Validation */}
            {touched.confirmPassword && !validations.confirmPassword.matches && formData.confirmPassword.length > 0 && (
              <div className="mt-2 flex items-center text-xs text-red-400">
                <X size={12} className="mr-1" />
                As senhas não coincidem
              </div>
            )}
            {touched.confirmPassword && validations.confirmPassword.matches && (
              <div className="mt-2 flex items-center text-xs text-green-400">
                <Check size={12} className="mr-1" />
                Senhas coincidem
              </div>
            )}
          </div>

          {/* Error Alert */}
          {!isFormValid && (touched.username || touched.email || touched.password || touched.confirmPassword) && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-3 flex items-start">
              <AlertCircle className="text-red-400 mr-2 flex-shrink-0 mt-0.5" size={16} />
              <div className="text-sm text-red-400">
                Por favor, corrija os erros acima antes de continuar
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                href="/login"
                className="font-medium text-blue-400 hover:text-blue-300"
              >
                Já tem uma conta? Faça login
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="btn-primary w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Criar conta
              </>
            )}
          </button>
        </form>
      </div>
    </>
  );
}