'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import BillImpactAnalyzer from '@/components/BillImpactAnalyzer';

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

export default function BillPage() {
  const params = useParams();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatQuery, setChatQuery] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user' | 'assistant', message: string}>>([]);

  useEffect(() => {
    if (params.id) {
      fetchBill(params.id as string);
    }
  }, [params.id]);

  const fetchBill = async (billId: string) => {
    try {
      const response = await apiFetch(`/api/bills/active`);
      const data = await response.json();
      if (data.bills) {
        const foundBill = data.bills.find((b: Bill) => b.id === billId);
        setBill(foundBill || null);
      }
    } catch (error) {
      console.error('Error fetching bill:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bill || !chatQuery.trim()) return;
    
    setChatLoading(true);
    const currentQuery = chatQuery.trim();
    setChatQuery(''); // Clear input immediately
    
    try {
      const response = await apiFetch('/api/bill-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bill_id: bill.id,
          bill_title: bill.title,
          bill_summary: bill.summary,
          bill_status: bill.status,
          bill_chamber: bill.chamber,
          query: currentQuery,
          conversation_history: conversationHistory
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }
      
      const data = await response.json();
      
      // Update conversation history
      const newUserEntry = { role: 'user' as const, message: currentQuery };
      const newAssistantEntry = { role: 'assistant' as const, message: data.response };
      setConversationHistory(prev => [...prev, newUserEntry, newAssistantEntry]);
      
      setChatResponse(data.response);
    } catch (error) {
      console.error('Error in bill chat:', error);
      setChatResponse('Sorry, I encountered an error while processing your question. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  const clearChat = () => {
    setConversationHistory([]);
    setChatResponse('');
    setChatQuery('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading bill...</p>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Bill Not Found</h1>
          <p className="text-gray-600">The requested bill could not be found.</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    if (status.includes('Passed')) return 'bg-green-100 text-green-800';
    if (status.includes('Introduced')) return 'bg-blue-100 text-blue-800';
    if (status.includes('Committee')) return 'bg-yellow-100 text-yellow-800';
    if (status.includes('Failed')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{bill.chamber === 'house' ? '🏛️' : '🏛️'}</span>
              <h1 className="text-3xl font-bold text-gray-900">{bill.title}</h1>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
              <span>Congress {bill.congress}</span>
              <span>•</span>
              <span className="capitalize">{bill.chamber === 'house' ? 'House of Representatives' : 'Senate'}</span>
              <span>•</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(bill.status)}`}>
                {bill.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {bill.subjects.map((subject, index) => (
                <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                  {subject}
                </span>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Summary</h2>
            <p className="text-gray-700 text-lg leading-relaxed">{bill.summary}</p>
          </div>

          {/* Key Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Current Stage</h3>
              <p className="text-gray-700">{bill.currentStage}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Cosponsors</h3>
              <p className="text-gray-700">{bill.cosponsors} members</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Introduced</h3>
              <p className="text-gray-700">{formatDate(bill.introducedDate)}</p>
            </div>
          </div>

          {/* External Links */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">External Sources</h2>
            <div className="flex gap-4">
              <a
                href={bill.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
              >
                View on Congress.gov
              </a>
            </div>
          </div>

          {/* Personalized Impact Analysis */}
          <div className="mb-8">
            <BillImpactAnalyzer 
              bill={{
                id: bill.id,
                title: bill.title,
                chamber: bill.chamber,
                status: bill.status
              }}
            />
          </div>

          {/* Bill Chat Interface */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">💬 Ask Questions About This Bill</h2>
              {conversationHistory.length > 0 && (
                <button
                  onClick={clearChat}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
                >
                  Clear Chat
                </button>
              )}
            </div>
            
            {/* Chat Input Form */}
            <form onSubmit={handleChatSubmit} className="mb-6">
              <div className="flex gap-4">
                <textarea
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  placeholder={conversationHistory.length > 0 
                    ? "Ask a follow-up question about this bill..." 
                    : "Ask anything about this bill - its purpose, impact, timeline, voting record, etc."
                  }
                  className="flex-1 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  rows={3}
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatQuery.trim()}
                  className="px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {chatLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Thinking...</span>
                    </div>
                  ) : (
                    conversationHistory.length > 0 ? 'Ask Follow-up' : 'Ask Question'
                  )}
                </button>
              </div>
            </form>

            {/* Latest Response */}
            {chatResponse && (
              <div className="mb-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-lg">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">AI</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-blue-700 mb-2">Legislative Assistant</div>
                      <div className="text-gray-800 leading-relaxed whitespace-pre-line">
                        {chatResponse}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Previous Conversation History */}
            {conversationHistory.length > 2 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Previous Conversation</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto bg-gray-50 rounded-lg p-4">
                  {/* Show all but the last two entries (which are the current question/response) */}
                  {conversationHistory.slice(0, -2).map((entry, index) => (
                    <div key={index} className={`p-4 rounded-lg ${
                      entry.role === 'user' 
                        ? 'bg-white ml-8 border border-gray-200' 
                        : 'bg-blue-50 mr-8 border border-blue-100'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          entry.role === 'user' 
                            ? 'bg-gray-500 text-white' 
                            : 'bg-blue-500 text-white'
                        }`}>
                          {entry.role === 'user' ? 'You' : 'AI'}
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium mb-1 text-sm ${
                            entry.role === 'user' ? 'text-gray-700' : 'text-blue-700'
                          }`}>
                            {entry.role === 'user' ? 'You asked:' : 'Assistant:'}
                          </div>
                          <div className="text-gray-600 text-sm whitespace-pre-line">
                            {entry.message.length > 200 ? entry.message.substring(0, 200) + '...' : entry.message}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Helpful Prompts */}
            {conversationHistory.length === 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">💡 Try asking:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <button
                    onClick={() => setChatQuery("What is the main purpose of this bill?")}
                    className="text-left p-2 bg-white rounded border hover:bg-blue-50 transition-colors text-gray-700"
                  >
                    • What is the main purpose of this bill?
                  </button>
                  <button
                    onClick={() => setChatQuery("Who would this bill affect and how?")}
                    className="text-left p-2 bg-white rounded border hover:bg-blue-50 transition-colors text-gray-700"
                  >
                    • Who would this bill affect and how?
                  </button>
                  <button
                    onClick={() => setChatQuery("What are the potential benefits and drawbacks?")}
                    className="text-left p-2 bg-white rounded border hover:bg-blue-50 transition-colors text-gray-700"
                  >
                    • What are the potential benefits and drawbacks?
                  </button>
                  <button
                    onClick={() => setChatQuery("What is the current status and next steps?")}
                    className="text-left p-2 bg-white rounded border hover:bg-blue-50 transition-colors text-gray-700"
                  >
                    • What is the current status and next steps?
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Votes */}
          {bill.votes.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Voting Record</h2>
              <div className="space-y-6">
                {bill.votes.map((vote, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {vote.chamber === 'house' ? 'House' : 'Senate'} Vote
                      </h3>
                      <span className="text-sm text-gray-500">
                        {formatDate(vote.date)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">{vote.yeas}</div>
                        <div className="text-sm text-gray-600">Yeas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-red-600">{vote.nays}</div>
                        <div className="text-sm text-gray-600">Nays</div>
                      </div>
                      <div className="text-center">
                        <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                          vote.result === 'Passed' ? 'bg-green-100 text-green-800' :
                          vote.result === 'Failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {vote.result}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
