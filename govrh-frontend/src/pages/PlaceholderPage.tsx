import { useLocation } from 'react-router-dom'
import { Construction } from 'lucide-react'

export default function PlaceholderPage() {
  const location = useLocation()
  const moduleName = location.pathname.replace('/', '').charAt(0).toUpperCase() + location.pathname.slice(2)

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <Construction className="w-7 h-7 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">Módulo em desenvolvimento</h2>
        <p className="text-muted-foreground text-sm mt-1">
          O módulo <span className="font-mono text-gov-600">/{location.pathname.replace('/', '')}</span> será implementado em breve.
        </p>
      </div>
    </div>
  )
}
