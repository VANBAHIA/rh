import { Bell, Search, Moon, Sun, Clock } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export default function Header() {
  const { usuario } = useAuthStore()
  const navigate = useNavigate()
  const [darkMode, setDarkMode] = useState(false)

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40 flex items-center px-6 gap-4">
      {/* Busca global */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar servidor, matrícula, CPF..."
            className="pl-9 h-9 bg-muted/50 border-transparent focus-visible:border-input focus-visible:bg-background text-sm"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-background text-[10px] text-muted-foreground font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Botão Bater Ponto */}
        <Button
          variant="gov"
          size="sm"
          onClick={() => navigate('/bater-ponto')}
          className="gap-1.5 hidden sm:flex"
        >
          <Clock className="w-4 h-4" />
          Bater Ponto
        </Button>

        {/* Dark mode toggle (visual only por ora) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDarkMode(!darkMode)}
          className="text-muted-foreground hover:text-foreground"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        {/* Notificações */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-gold-500" />
        </Button>

        {/* Usuário */}
        {usuario && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-border">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium leading-none text-foreground">
                {usuario.nome.split(' ')[0]}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{usuario.perfil}</p>
            </div>
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-gov-700 text-white text-xs font-semibold">
                {getInitials(usuario.nome)}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </header>
  )
}
