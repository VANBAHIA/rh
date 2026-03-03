import React from 'react'
import { toast } from '@/hooks/useToast'
import { ToastAction } from '@/components/ui/toast'

/**
 * Displays a confirmation toast with a "Confirmar" button.
 * Resolves to true if the user clicks the button, or false if the
 * toast is dismissed/closed.
 */
export function confirmToast(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const { id, dismiss } = toast({
      title: 'Confirmação',
      description: message,
      action: (
        <ToastAction
          className="text-blue-600"
          altText="confirmação"
          onClick={() => {
            resolve(true)
            dismiss()
          }}
        >
          Confirmar
        </ToastAction>
      ),
      onOpenChange: (open) => {
        if (!open) {
          resolve(false)
        }
      },
    })

    // in case the toast is removed automatically after timeout,
    // ensure we resolve as false if not yet settled
    setTimeout(() => {
      resolve(false)
    }, 5000)
  })
}
