'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, 
  Users, 
  Video, 
  DollarSign, 
  ArrowRight,
  Calendar,
  Loader2,
  Inbox
} from 'lucide-react';
import { getAnalyticsOverview } from '@/lib/webinar-api';

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState('Last 30 Days');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics-overview', dateRange],
    queryFn: () => getAnalyticsOverview(dateRange === 'Last 7 Days' ? '7d' : (dateRange === 'All Time' ? 'all' : '30d')),
    refetchInterval: 3000, // Live poll every 3s
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const totalViews = data?.total_views ?? 0;
  const totalRegistrations = data?.total_registrations ?? 0;
  const attendanceRate = data?.attendance_rate ?? 0;
  const totalRevenue = data?.total_revenue ?? 0;
  const funnelSteps = data?.funnel_steps || [
    { name: 'Landing Page Views', value: 0, percentage: 0 },
    { name: 'Registered', value: 0, percentage: 0 },
    { name: 'Attended', value: 0, percentage: 0 },
    { name: 'Clicked Offer', value: 0, percentage: 0 },
    { name: 'Purchased', value: 0, percentage: 0 },
  ];
  const topWebinars = data?.top_webinars || [];

  return (
    <div className="p-6 md:p-8 font-sans animate-in fade-in duration-500 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics & Funnel Performance</h1>
          <p className="text-muted-foreground mt-1">Track your webinar traffic, conversions, and live revenue.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none bg-card border border-border rounded-lg py-2 pl-4 pr-10 text-sm font-medium text-foreground hover:bg-muted/80 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
            >
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>All Time</option>
            </select>
            <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mr-2 text-primary" />
          <span>Loading live funnel analytics…</span>
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Views</p>
                  <h3 className="text-3xl font-bold text-foreground">{totalViews.toLocaleString()}</h3>
                </div>
                <div className="p-3 bg-indigo-500/10 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-indigo-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-muted-foreground">Live page visits</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Registrations</p>
                  <h3 className="text-3xl font-bold text-foreground">{totalRegistrations.toLocaleString()}</h3>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded text-xs mr-2">
                  {totalViews > 0 ? `${((totalRegistrations / totalViews) * 100).toFixed(1)}%` : '0.0%'} Conv.
                </span>
                <span className="text-muted-foreground">from views</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Attendance Rate</p>
                  <h3 className="text-3xl font-bold text-foreground">{attendanceRate.toFixed(1)}%</h3>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Video className="h-6 w-6 text-purple-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-muted-foreground">Live attendee rate</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Sales</p>
                  <h3 className="text-3xl font-bold text-foreground">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-muted-foreground">Live collected revenue</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Funnel Conversion Breakdown */}
            <div className="lg:col-span-2 bg-card rounded-xl shadow-sm border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-6">Funnel Conversion Breakdown</h2>
              <div className="space-y-6">
                {funnelSteps.map((step, index) => (
                  <div key={index} className="relative">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-foreground/90">{step.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">{step.value.toLocaleString()}</span>
                        <span className="font-bold text-indigo-500 w-12 text-right">{step.percentage}%</span>
                      </div>
                    </div>
                    <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(100, Math.max(step.value > 0 ? 5 : 0, step.percentage))}%` }}
                      ></div>
                    </div>
                    {index < funnelSteps.length - 1 && (
                      <div className="absolute -bottom-5 left-4 text-muted-foreground/60">
                        <ArrowRight className="h-4 w-4 rotate-90" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Top Converting Webinars */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-foreground">Top Performers</h2>
              </div>
              {topWebinars.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Inbox className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium text-foreground">No webinars yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create your first webinar funnel to see performance.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {topWebinars.map((webinar) => (
                    <div key={webinar.id} className="border-b border-border last:border-0 pb-5 last:pb-0">
                      <h4 className="font-medium text-foreground truncate mb-1" title={webinar.title}>
                        {webinar.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-3">{webinar.date}</p>
                      
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs mb-0.5">Reg</p>
                          <p className="font-semibold text-foreground">{webinar.registrants}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-0.5">Conv</p>
                          <p className="font-semibold text-emerald-500">{webinar.conversion}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-0.5">Revenue</p>
                          <p className="font-semibold text-foreground">{webinar.revenue}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
