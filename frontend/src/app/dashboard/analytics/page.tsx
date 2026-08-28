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
    <div className="min-h-screen bg-gray-50 p-6 md:p-8 font-sans animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Funnel Performance</h1>
          <p className="text-gray-500 mt-1">Track your webinar traffic, conversions, and live revenue.</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg py-2 pl-4 pr-10 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>All Time</option>
            </select>
            <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mr-2 text-indigo-600" />
          <span>Loading live funnel analytics…</span>
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Card 1 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Views</p>
                  <h3 className="text-3xl font-bold text-gray-900">{totalViews.toLocaleString()}</h3>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-gray-500">Live page visits</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Registrations</p>
                  <h3 className="text-3xl font-bold text-gray-900">{totalRegistrations.toLocaleString()}</h3>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded text-xs mr-2">
                  {totalViews > 0 ? `${((totalRegistrations / totalViews) * 100).toFixed(1)}%` : '0.0%'} Conv.
                </span>
                <span className="text-gray-500">from views</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Attendance Rate</p>
                  <h3 className="text-3xl font-bold text-gray-900">{attendanceRate.toFixed(1)}%</h3>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Video className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-gray-500">Live attendee rate</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Sales</p>
                  <h3 className="text-3xl font-bold text-gray-900">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-gray-500">Live collected revenue</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Funnel Conversion Breakdown */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Funnel Conversion Breakdown</h2>
              <div className="space-y-6">
                {funnelSteps.map((step, index) => (
                  <div key={index} className="relative">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-gray-700">{step.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500">{step.value.toLocaleString()}</span>
                        <span className="font-bold text-indigo-600 w-12 text-right">{step.percentage}%</span>
                      </div>
                    </div>
                    <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(100, Math.max(step.value > 0 ? 5 : 0, step.percentage))}%` }}
                      ></div>
                    </div>
                    {index < funnelSteps.length - 1 && (
                      <div className="absolute -bottom-5 left-4 text-gray-400">
                        <ArrowRight className="h-4 w-4 rotate-90" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Top Converting Webinars */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Top Performers</h2>
              </div>
              {topWebinars.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Inbox className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm font-medium text-gray-700">No webinars yet</p>
                  <p className="text-xs text-gray-400 mt-1">Create your first webinar funnel to see performance.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {topWebinars.map((webinar) => (
                    <div key={webinar.id} className="border-b border-gray-50 last:border-0 pb-5 last:pb-0">
                      <h4 className="font-medium text-gray-900 truncate mb-1" title={webinar.title}>
                        {webinar.title}
                      </h4>
                      <p className="text-xs text-gray-500 mb-3">{webinar.date}</p>
                      
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs mb-0.5">Reg</p>
                          <p className="font-semibold text-gray-900">{webinar.registrants}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs mb-0.5">Conv</p>
                          <p className="font-semibold text-emerald-600">{webinar.conversion}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs mb-0.5">Revenue</p>
                          <p className="font-semibold text-gray-900">{webinar.revenue}</p>
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
