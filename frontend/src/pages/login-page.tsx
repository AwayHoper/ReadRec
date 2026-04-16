import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/auth-provider';

const schema = z.object({ email: z.string().email(), password: z.string().min(6) });

/** Summary: This component renders the login and registration form for the MVP. */
export function LoginPage() {
  const navigate = useNavigate();
  const { login, register: registerUser } = useAuth();
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  /** Summary: This function switches the form into login mode. */
  function switchToLoginMode() {
    setMode('LOGIN');
  }

  /** Summary: This function switches the form into registration mode. */
  function switchToRegisterMode() {
    setMode('REGISTER');
  }

  /** Summary: This function submits the auth form and redirects to the dashboard on success. */
  async function submitAuthForm(values: z.infer<typeof schema>) {
    if (mode === 'LOGIN') {
      await login(values.email, values.password);
    } else {
      await registerUser(values.email, values.password);
    }
    navigate('/');
  }

  const onSubmit = handleSubmit(submitAuthForm);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center">
      <div className="grid w-full gap-8 rounded-[32px] bg-white p-8 shadow-xl md:grid-cols-[1.2fr_1fr]">
        <div className="rounded-[28px] bg-ink p-8 text-sand">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-sand/80">Context First</p>
          <h1 className="mb-4 text-4xl font-bold">把背单词改造成语境化成长。</h1>
          <p className="text-base leading-7 text-sand/85">{`ReadRec 用“词生文 -> 词义提取 -> 阅读应用”的三轮闭环，把记忆从孤立词义推进到真实理解。`}</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="flex gap-3 text-sm">
            <button type="button" onClick={switchToLoginMode} className={`rounded-full px-4 py-2 ${mode === 'LOGIN' ? 'bg-coral text-white' : 'bg-sand'}`}>登录</button>
            <button type="button" onClick={switchToRegisterMode} className={`rounded-full px-4 py-2 ${mode === 'REGISTER' ? 'bg-coral text-white' : 'bg-sand'}`}>注册</button>
          </div>
          <label className="block"><span className="mb-2 block text-sm font-medium">邮箱</span><input {...register('email')} className="w-full rounded-2xl border border-black/10 px-4 py-3" /><span className="mt-1 block text-sm text-coral">{errors.email?.message}</span></label>
          <label className="block"><span className="mb-2 block text-sm font-medium">密码</span><input type="password" {...register('password')} className="w-full rounded-2xl border border-black/10 px-4 py-3" /><span className="mt-1 block text-sm text-coral">{errors.password?.message}</span></label>
          <button disabled={isSubmitting} className="w-full rounded-2xl bg-ink px-4 py-3 text-sand">{mode === 'LOGIN' ? '登录进入学习页' : '注册并开始学习'}</button>
        </form>
      </div>
    </div>
  );
}