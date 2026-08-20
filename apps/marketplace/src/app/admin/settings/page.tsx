"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@carelim/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, CreditCard, Star, Bell } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure marketplace settings and preferences
        </p>
      </div>

      {/* Payment Gateway */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <div>
              <CardTitle className="text-base">Payment Gateway</CardTitle>
              <CardDescription>Configure payment processing settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gateway">Payment Provider</Label>
              <Input id="gateway" placeholder="e.g. Stripe" defaultValue="Stripe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input id="api-key" type="password" placeholder="Enter API key" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input id="webhook-url" placeholder="https://your-domain.com/api/webhooks" />
          </div>
          <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white">Save Payment Settings</Button>
        </CardContent>
      </Card>

      {/* Commission Rates */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            <div>
              <CardTitle className="text-base">Commission Rates</CardTitle>
              <CardDescription>Set marketplace commission percentages</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commission">Commission Rate (%)</Label>
              <Input id="commission" type="number" placeholder="15" defaultValue="15" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-payout">Minimum Payout ($)</Label>
              <Input id="min-payout" type="number" placeholder="50" defaultValue="50" />
            </div>
          </div>
          <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white">Save Commission Settings</Button>
        </CardContent>
      </Card>

      {/* Featured Modules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-orange-500" />
            <div>
              <CardTitle className="text-base">Featured Modules</CardTitle>
              <CardDescription>Manage which modules appear on the marketplace homepage</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No featured modules configured yet.</p>
          <Button variant="outline" className="mt-3">Select Featured Modules</Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-500" />
            <div>
              <CardTitle className="text-base">Notifications</CardTitle>
              <CardDescription>Configure marketplace notification preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">New Purchase Alerts</p>
              <p className="text-xs text-muted-foreground">Receive alerts when a module is purchased</p>
            </div>
            <Button variant="outline" size="sm">Enable</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Review Notifications</p>
              <p className="text-xs text-muted-foreground">Get notified when new reviews are posted</p>
            </div>
            <Button variant="outline" size="sm">Enable</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Weekly Reports</p>
              <p className="text-xs text-muted-foreground">Receive weekly marketplace analytics summary</p>
            </div>
            <Button variant="outline" size="sm">Enable</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
