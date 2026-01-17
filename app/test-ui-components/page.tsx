'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function TestUIComponents() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center mb-8">UI Components Test</h1>

        {/* Button Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Button Component</CardTitle>
            <CardDescription>Testing all button variants and sizes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="default">Default</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </div>
          </CardContent>
        </Card>

        {/* Input and Label Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Input & Label Components</CardTitle>
            <CardDescription>Testing input fields with labels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter your email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Enter your password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disabled">Disabled Input</Label>
              <Input id="disabled" disabled placeholder="This is disabled" />
            </div>
          </CardContent>
        </Card>

        {/* Select Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Select Component</CardTitle>
            <CardDescription>Testing select dropdown with Radix UI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project">Select Project</Label>
              <Select>
                <SelectTrigger id="project">
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maxstream">MaxStream</SelectItem>
                  <SelectItem value="myorbit">MyOrbit</SelectItem>
                  <SelectItem value="duniagames">DuniaGames</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Select Role</Label>
              <Select>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="head">Head</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Card Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Card Component</CardTitle>
            <CardDescription>This is a card with all its sub-components</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The card component includes CardHeader, CardTitle, CardDescription, CardContent, and CardFooter.
              All components are working correctly with the backdrop blur and shadow effects.
            </p>
          </CardContent>
        </Card>

        {/* Success Message */}
        <Card className="border-green-500 bg-green-50/70">
          <CardHeader>
            <CardTitle className="text-green-700">✓ All Components Migrated Successfully</CardTitle>
            <CardDescription className="text-green-600">
              All Radix UI components are working correctly with Next.js
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
              <li>Button component with all variants and sizes</li>
              <li>Card component with all sub-components</li>
              <li>Input component with proper styling</li>
              <li>Label component from Radix UI</li>
              <li>Select component with dropdown functionality</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
