'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Bill {
  id: string;
  congress: number;
  chamber: string;
  title: string;
  summary: string;
  status: string;
  sponsorId: string;
  introducedDate: string;
  lastAction: string;
  lastActionText: string;
  sourceUrl: string;
  currentStage: string;
  timeline: Array<{
    date: string;
    action: string;
    chamber: string;
  }>;
  votes: Array<{
    date: string;
    chamber: string;
    yeas: number;
    nays: number;
    result: string;
  }>;
  cosponsors: number;
  subjects: string[];
}

interface BillFilters {
  status: string;
  chamber: string;
  subject: string;
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [apiData, setApiData] = useState<any>(null);
  const [filters, setFilters] = useState<BillFilters>({
    status: '',
    chamber: '',
    subject: ''
  });

  useEffect(() => {
    fetchBills();
  }, [filters]);

  const fetchBills = async () => {
    try {
      setFiltering(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.chamber) params.append('chamber', filters.chamber);
      if (filters.subject) params.append('subject', filters.subject);
      params.append('limit', '100');

      const res = await fetch(`/api/bills/active?${params}`);
      if (!res.ok) throw new Error('Failed to fetch bills');
      const data = await res.json();
      setBills(data.bills);
      setApiData(data);
      setLoading(false);
      setFiltering(false);
    } catch (err) {
      console.error("Bills API error:", err);
      setLoading(false);
      setFiltering(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      chamber: '',
      subject: ''
    });
  };

  const hasActiveFilters = filters.status || filters.chamber || filters.subject;

  const getStatusColor = (status: string) => {
    if (status.includes('Passed')) return 'bg-green-100 text-green-800';
    if (status.includes('Introduced')) return 'bg-blue-100 text-blue-800';
    if (status.includes('Committee')) return 'bg-yellow-100 text-yellow-800';
    if (status.includes('Failed')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getChamberIcon = (chamber: string) => {
    return chamber === 'house' ? '🏛️' : '🏛️';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading active bills...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Bill Tracker</h1>
          <p className="text-xl text-gray-600 mb-6">
            Track active legislation through Congress with real-time updates, detailed timelines, and voting records.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Filter Bills</h2>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
          
          {/* Filter Results Summary */}
          {apiData && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold">{bills.length}</span> of <span className="font-semibold">{apiData.total}</span> bills
                {apiData.sources && (
                  <span className="ml-2">
                    ({apiData.sources.database} from database, {apiData.sources.static} from archive)
                  </span>
                )}
                {filtering && <span className="ml-2 text-blue-600">• Filtering...</span>}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-base font-semibold text-gray-900 mb-3">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                disabled={filtering}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium disabled:opacity-50"
              >
                <option value="">All Statuses</option>
                <option value="Introduced">Introduced</option>
                <option value="Committee">In Committee</option>
                <option value="Passed">Passed</option>
                <option value="Referred">Referred</option>
                <option value="Calendar">On Calendar</option>
                <option value="Enacted">Enacted</option>
              </select>
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-900 mb-3">Chamber</label>
              <select
                value={filters.chamber}
                onChange={(e) => setFilters({...filters, chamber: e.target.value})}
                disabled={filtering}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium disabled:opacity-50"
              >
                <option value="">Both Chambers</option>
                <option value="house">House of Representatives</option>
                <option value="senate">Senate</option>
              </select>
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-900 mb-3">Subject</label>
              <select
                value={filters.subject}
                onChange={(e) => setFilters({...filters, subject: e.target.value})}
                disabled={filtering}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium disabled:opacity-50"
              >
                <option value="">All Subjects</option>
                <option value="Energy">Energy</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Education">Education</option>
                <option value="Immigration">Immigration</option>
                <option value="Economy">Economy</option>
                <option value="Defense">Defense</option>
                <option value="Transportation">Transportation</option>
                <option value="Environment">Environment</option>
                <option value="Civil Rights">Civil Rights</option>
                <option value="Agriculture">Agriculture</option>
                <option value="Taxation">Taxation</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Technology">Technology</option>
                <option value="Veterans">Veterans</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bills List */}
        <div className="space-y-6">
          {bills.map((bill) => (
            <div key={bill.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getChamberIcon(bill.chamber)}</span>
                    <h3 className="text-xl font-bold text-gray-900">{bill.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(bill.status)}`}>
                      {bill.status}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{bill.summary}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {bill.subjects.map((subject, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p>Introduced: {formatDate(bill.introducedDate)}</p>
                  <p>Last Action: {formatDate(bill.lastAction)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Current Stage</h4>
                  <p className="text-gray-600">{bill.currentStage}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Cosponsors</h4>
                  <p className="text-gray-600">{bill.cosponsors} members</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Last Action</h4>
                  <p className="text-gray-600 text-sm">{bill.lastActionText}</p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <Link
                    href={`/bill/${bill.id}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </Link>
                  <a
                    href={bill.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Congress.gov
                  </a>
                </div>
                <div className="text-sm text-gray-500">
                  {bill.chamber === 'house' ? 'H.R.' : 'S.'} {bill.id.split('-')[0].replace(/[a-z]/g, '')}
                </div>
              </div>
            </div>
          ))}
        </div>

        {bills.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No bills found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
