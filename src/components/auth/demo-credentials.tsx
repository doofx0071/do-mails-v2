'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, Eye, EyeOff } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface DemoCredentialsProps {
  onFillCredentials?: (email: string, password: string) => void
}

export function DemoCredentials({ onFillCredentials }: DemoCredentialsProps) {
  const [showPassword, setShowPassword] = useState(false)
  const { toast } = useToast()
  
  const demoEmail = 'demo@veenusra.com'
  const demoPassword = 'demo123'

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: 'Copied!',
        description: `${type} copied to clipboard`,
      })
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleFillCredentials = () => {
    if (onFillCredentials) {
      onFillCredentials(demoEmail, demoPassword)
      toast({
        title: 'Credentials filled',
        description: 'Demo credentials have been filled in the form',
      })
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Demo Credentials</CardTitle>
          <Badge variant="secondary">For Testing</Badge>
        </div>
        <CardDescription>
          Use these credentials to test the authentication system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Email:</span>
            <div className="flex items-center space-x-2">
              <code className="text-sm bg-muted px-2 py-1 rounded">{demoEmail}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(demoEmail, 'Email')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Password:</span>
            <div className="flex items-center space-x-2">
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {showPassword ? demoPassword : '•'.repeat(demoPassword.length)}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(demoPassword, 'Password')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {onFillCredentials && (
          <Button onClick={handleFillCredentials} className="w-full" variant="outline">
            Fill Credentials
          </Button>
        )}
        
        <div className="text-xs text-muted-foreground">
          💡 This demo account works for both local development and deployed version
        </div>
      </CardContent>
    </Card>
  )
}
