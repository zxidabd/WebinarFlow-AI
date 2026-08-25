'use client';

import React, { useState } from 'react';
import { 
  BarChart3, 
  Users, 
  Video, 
  DollarSign, 
  ArrowUpRight,
  ArrowRight,
  Calendar,
  Filter
} from 'lucide-react';

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState('Last 30 Days');

  // Dummy data for funnel
  const funnelSteps = [
    { name: 'Landing Page Views', value: 12450, percentage: 100 },
    { name: 'Registered', value: 3112, percentage: 25 },
    { name: 'Attended', value: 2128, percentage: 17.1 },
    { name: 'Clicked Offer', value: 851, percentage: 6.8 },
    { name: 'Purchased', value: 340, percentage: 2.7 },
  ];

  // Dummy data for top webinars
  const topWebinars = [
    { id: 1, title: 'How to Scale Your SaaS in 2026', date: 'Aug 10, 2026', registrants: 850, conversion: '12.4%', revenue: '$14,500' },
    { id: 2, title: 'AI Automation Masterclass', date: 'Jul 28, 2026', registrants: 1200, conversion: '8.2%', revenue: '$22,800' },
    { id: 3, title: 'Client Acquisition Secrets', date: 'Jul 15, 2026', registrants: 640, conversion: '15.1%', revenue: '$9,200' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Funnel Performance</h1>
          <p className="text-gray-500 mt-1">Track your webinar conversions and revenue</p>
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
          <button className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card 1 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Views</p>
              <h3 className="text-3xl font-bold text-gray-900">12,450</h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg">
              <BarChart3 className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="flex items-center text-emerald-600 font-medium">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              24.5%
            </span>
            <span className="text-gray-500 ml-2">vs last period</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Registrations</p>
              <h3 className="text-3xl font-bold text-gray-900">3,112</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded text-xs mr-2">
              25% Conv.
            </span>
            <span className="text-gray-500">from views</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Attendance Rate</p>
              <h3 className="text-3xl font-bold text-gray-900">68.4%</h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Video className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="flex items-center text-emerald-600 font-medium">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              4.2%
            </span>
            <span className="text-gray-500 ml-2">vs industry avg</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Sales</p>
              <h3 className="text-3xl font-bold text-gray-900">$46,500</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded text-xs mr-2">
              2.7% Conv.
            </span>
            <span className="text-gray-500">from total views</span>
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
                    style={{ width: `${step.percentage}%` }}
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
            <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors">
              View All
            </button>
          </div>
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
        </div>
      </div>
    </div>
  );
}
