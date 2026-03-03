import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Building2, ShieldCheck, Loader2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/useToast'
import { cn, formatCNPJ } from '@/lib/utils'

// ── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  tenantCnpj: z
    .string()
    .min(18, 'CNPJ inválido')
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'Formato: XX.XXX.XXX/XXXX-XX'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

// ── Componente ─────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tenantCnpj: '',
      email: '',
      senha: '',
    },
  })

  const cnpjValue = watch('tenantCnpj')

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('tenantCnpj', formatCNPJ(e.target.value), { shouldValidate: true })
    if (error) clearError()
  }

  const onSubmit = async (data: FormData) => {
    try {
      await login(data)
      toast({ title: 'Acesso autorizado', description: 'Bem-vindo ao GovHRPub.' })
      navigate('/dashboard')
    } catch {
      // erro já está no store
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Painel Esquerdo — Visual/Branding ── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden gov-gradient gov-mesh">
        {/* Grid overlay */}
        <div className="absolute inset-0 grid-overlay opacity-60" />

        {/* Círculos decorativos */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full border border-white/5" />
        <div className="absolute -top-12 -left-12 w-72 h-72 rounded-full border border-white/5" />
        <div className="absolute bottom-16 right-16 w-64 h-64 rounded-full border border-white/5" />
        <div className="absolute bottom-32 right-32 w-40 h-40 rounded-full border border-gov-500/20" />

        {/* Linha diagonal decorativa */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, transparent 49.5%, hsl(232 80% 57% / 0.08) 49.5%, hsl(232 80% 57% / 0.08) 50.5%, transparent 50.5%)',
          }}
        />

        {/* Conteúdo */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo + nome */}
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gov-500/30 border border-gov-400/30 flex items-center justify-center backdrop-blur-sm">
                <ShieldCheck className="w-5 h-5 text-gov-300" />
              </div>
              <span className="font-display text-white/90 text-xl font-light tracking-wide">
                GovHR<span className="text-gold-400 font-semibold">Pub</span>
              </span>
            </div>
            <p className="text-white/30 text-xs tracking-widest uppercase font-mono ml-1">
              Sistema Municipal de RH
            </p>
          </div>

          {/* Headline central */}
          <div className="space-y-6 animate-fade-in delay-100">
            <h1 className="font-display text-5xl xl:text-6xl font-light text-white leading-tight">
              Gestão pública{' '}
              <em className="not-italic text-gold-400">eficiente</em>
              <br />
              começa aqui.
            </h1>
            <p className="text-white/50 text-base leading-relaxed max-w-md font-light">
              Plataforma integrada para administração de servidores municipais, folha de pagamento, progressão funcional e transparência pública.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 pt-2">
              {[
                'EC 103/2019',
                'PCCV Magistério',
                'Folha Automática',
                'Transparência LAI',
                'Multi-Tenant',
              ].map((feat) => (
                <span
                  key={feat}
                  className="px-3 py-1 rounded-full text-xs font-medium border border-white/10 text-white/60 bg-white/5 backdrop-blur-sm"
                >
                  {feat}
                </span>
              ))}
            </div>
          </div>

          {/* Rodapé */}
          <div className="animate-fade-in delay-200">
            <p className="text-white/20 text-xs font-mono">
              v0.1.0 · {new Date().getFullYear()} · Dados protegidos por lei
            </p>
          </div>
        </div>
      </div>

      {/* ── Painel Direito — Formulário ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-background relative">
        {/* Logo mobile */}
        <div className="lg:hidden mb-10 text-center">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gov-700 flex items-center justify-center">
              <ShieldCheck className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-display text-2xl text-foreground font-light">
              GovHR<span className="text-gov-600 font-semibold">Pub</span>
            </span>
          </div>
        </div>

        {/* Card de login */}
        <div className="w-full max-w-[400px] space-y-8">
          <div className="space-y-1.5 animate-fade-in">
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
              Acesso ao sistema
            </h2>
            <p className="text-muted-foreground text-sm">
              Informe os dados da prefeitura e suas credenciais.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 animate-fade-in delay-100">
            {/* CNPJ da Prefeitura */}
            <div className="space-y-2">
              <Label htmlFor="tenantCnpj" className="flex items-center gap-1.5 text-foreground/80">
                <Building2 className="w-3.5 h-3.5" />
                CNPJ da Prefeitura
              </Label>
              <div className="relative">
                <Input
                  id="tenantCnpj"
                  placeholder="00.000.000/0001-00"
                  value={cnpjValue}
                  onChange={handleCnpjChange}
                  className={cn(
                    'h-11 font-mono text-sm tracking-wide',
                    errors.tenantCnpj && 'border-destructive focus-visible:ring-destructive',
                  )}
                  autoComplete="organization"
                />
              </div>
              {errors.tenantCnpj && (
                <p className="text-destructive text-xs flex items-center gap-1">
                  {errors.tenantCnpj.message}
                </p>
              )}
            </div>

            {/* Separador */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-dashed border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-xs text-muted-foreground">
                  Credenciais do usuário
                </span>
              </div>
            </div>

            {/* E-mail */}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@prefeitura.gov.br"
                {...register('email', {
                  onChange: () => { if (error) clearError() },
                })}
                className={cn(
                  'h-11',
                  errors.email && 'border-destructive focus-visible:ring-destructive',
                )}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-destructive text-xs">{errors.email.message}</p>
              )}
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('senha', {
                    onChange: () => { if (error) clearError() },
                  })}
                  className={cn(
                    'h-11 pr-10',
                    errors.senha && 'border-destructive focus-visible:ring-destructive',
                  )}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.senha && (
                <p className="text-destructive text-xs">{errors.senha.message}</p>
              )}
            </div>

            {/* Erro da API */}
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 animate-fade-in">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              variant="gov"
              size="xl"
              disabled={isLoading}
              className="w-full group mt-2 relative overflow-hidden"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  Entrar no sistema
                  <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>

          {/* Dica dev */}
          {import.meta.env.DEV && (
            <div className="rounded-lg border border-dashed border-gov-200 bg-gov-50 p-4 space-y-2 animate-fade-in delay-300">
              <p className="text-xs font-semibold text-gov-700 font-mono">
                🔑 Credenciais de desenvolvimento
              </p>
              <div className="space-y-1 text-xs text-gov-600 font-mono">
                <div>
                  <span className="opacity-60">CNPJ: </span>
                  <button
                    type="button"
                    className="hover:text-gov-800 underline underline-offset-2"
                    onClick={() => setValue('tenantCnpj', formatCNPJ('00000000000100'))}
                  >
                    00.000.000/0001-00
                  </button>
                </div>
                <div>
                  <span className="opacity-60">RH: </span>
                  <button
                    type="button"
                    className="hover:text-gov-800 underline underline-offset-2"
                    onClick={() => { setValue('email', 'rh@exemplo.gov.br'); setValue('senha', 'Rh@2026Pme') }}
                  >
                    rh@exemplo.gov.br / Rh@2026Pme
                  </button>
                </div>
                <div>
                  <span className="opacity-60">Admin: </span>
                  <button
                    type="button"
                    className="hover:text-gov-800 underline underline-offset-2"
                    onClick={() => { setValue('email', 'admin@govrh.gov.br'); setValue('senha', 'Admin@2026!') }}
                  >
                    admin@govrh.gov.br / Admin@2026!
                  </button>
                </div>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground animate-fade-in delay-400">
            Acesso restrito a servidores autorizados. <br />
            Todos os acessos são registrados e auditados.
          </p>
        </div>
      </div>
    </div>
  )
}
