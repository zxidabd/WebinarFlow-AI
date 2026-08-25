'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  MoreVertical,
  Mail,
  Eye,
  Users,
  DollarSign,
  BarChart3,
  CheckCircle2,
  Clock,
  ShoppingBag,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type CustomerStatus = 'Registered' | 'Attended' | 'Purchased';

interface Customer {
  id: string;
  name: string;
  email: string;
  webinarTitle: string;
  status: CustomerStatus;
  totalSpent: number;
  dateJoined: string;
}

const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    webinarTitle: 'High-Ticket AI Agency Blueprint',
    status: 'Purchased',
    totalSpent: 497.00,
    dateJoined: '2026-08-20',
  },
  {
    id: 'cust-2',
    name: 'Michael Chen',
    email: 'mchen@techventures.io',
    webinarTitle: 'Automated Webinar Sales Machine',
    status: 'Attended',
    totalSpent: 0.00,
    dateJoined: '2026-08-21',
  },
  {
    id: 'cust-3',
    name: 'Elena Rostova',
    email: 'elena.rostova@designco.com',
    webinarTitle: 'High-Ticket AI Agency Blueprint',
    status: 'Purchased',
    totalSpent: 997.00,
    dateJoined: '2026-08-22',
  },
  {
    id: 'cust-4',
    name: 'David Miller',
    email: 'david.m@growthlabs.org',
    webinarTitle: 'Real Estate Investor Masterclass',
    status: 'Registered',
    totalSpent: 0.00,
    dateJoined: '2026-08-23',
  },
];

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const filteredCustomers = mockCustomers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.webinarTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || customer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalLeads = mockCustomers.length;
  const activeBuyers = mockCustomers.filter((c) => c.status === 'Purchased').length;
  const totalRevenue = mockCustomers.reduce((acc, curr) => acc + curr.totalSpent, 0);
  const avgLtv = activeBuyers > 0 ? totalRevenue / activeBuyers : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Customers & Registrants</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage leads, attendees, and active buyers across all your automated webinar funnels.
          </p>
        </div>
        <button
          type="button"
          onClick={() => alert('Exporting customer contacts...')}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Download className="h-4 w-4" />
          Export Contacts
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4a6cf7]/10 text-[#4a6cf7]">
                <Users className="h-4 w-4" />
              </span>
              Total Leads & Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{totalLeads}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <ShoppingBag className="h-4 w-4" />
              </span>
              Active Buyers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{activeBuyers}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                <DollarSign className="h-4 w-4" />
              </span>
              Avg Customer LTV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              ${avgLtv.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, or webinar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white text-black focus:outline-none focus:border-[#4a6cf7]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 px-3 border border-slate-200 rounded-lg text-sm bg-white text-black focus:outline-none focus:border-[#4a6cf7]"
              >
                <option value="All">All Contacts</option>
                <option value="Registered">Registered</option>
                <option value="Attended">Attended</option>
                <option value="Purchased">Purchased</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-medium">Customer Name</th>
                  <th className="px-6 py-3 font-medium">Webinar Funnel</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Total Spent</th>
                  <th className="px-6 py-3 font-medium">Date Joined</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4a6cf7]/10 text-[#4a6cf7] font-semibold text-xs">
                          {c.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">{c.webinarTitle}</td>
                    <td className="px-6 py-4">
                      {c.status === 'Purchased' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Purchased
                        </span>
                      )}
                      {c.status === 'Attended' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          <Eye className="h-3.5 w-3.5" /> Attended
                        </span>
                      )}
                      {c.status === 'Registered' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          <Clock className="h-3.5 w-3.5" /> Registered
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">${c.totalSpent.toFixed(2)}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{c.dateJoined}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => alert(`Sending email to ${c.email}...`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
