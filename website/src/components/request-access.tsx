'use client'

import { Dialog, DialogPanel, DialogTitle, Description } from "@headlessui/react"
import { Button } from "@/components/button"
import { useState } from "react"
import { toast } from 'sonner'

export const RequestAccess = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/early-access/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      toast.success('Thank you for requesting access! We\'ll be in touch soon.')
      setIsOpen(false)
      setEmail('')
    } catch (error) {
      toast.error('Failed to submit request. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <Button href="#" onClick={() => setIsOpen(true)}>Request early access</Button>
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="w-full max-w-lg space-y-4 rounded-lg border bg-white p-8">
            <DialogTitle className="text-xl font-bold">Request Early Access</DialogTitle>
            <Description className="text-gray-600">
              Join our waitlist to get early access to our platform.
            </Description>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    setEmail('')
                  }}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Submitting...' : 'Request Access'}
                </Button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  )
}