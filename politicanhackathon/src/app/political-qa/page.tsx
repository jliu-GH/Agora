'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  chamber: string;
  state: string;
  district?: string;
  party: string;
}

interface QAResponse {
  mode: string;
  response: string;
  citations: string[];
  politicians: Array<{id: string, name: string, party: string, state: string, chamber: string}>;
  hasSufficientContext: boolean;
}

export default function PoliticalQAPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedPolitician, setSelectedPolitician] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [response, setResponse] = useState<QAResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(true);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user' | 'politician', message: string}>>([]);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);
      const res = await fetch('/api/members');
      if (!res.ok) throw new Error('Failed to fetch members');
      const data = await res.json();
      setMembers(data.members || []);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('Failed to load congressional members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPolitician || !query.trim()) {
      setError('Please select a politician and enter a question');
      return;
    }

    setLoading(true);
    setError(null);
    
    // Store current question for conversation history
    const currentQuestion = query.trim();

    try {
      const res = await fetch('/api/interaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'qa',
          politician_id: selectedPolitician,
          query: currentQuestion,
          conversation_history: conversationHistory // Include conversation history
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const responseData: QAResponse = await res.json();
      
      // Update conversation history with the new question and response
      const newUserEntry = { role: 'user' as const, message: currentQuestion };
      const newPoliticianEntry = { role: 'politician' as const, message: responseData.response };
      setConversationHistory(prev => [...prev, newUserEntry, newPoliticianEntry]);
      
      setResponse(responseData);
      setQuery(''); // Clear the input for next question

    } catch (err) {
      console.error('Error getting Q&A response:', err);
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  const handlePoliticianChange = (newPoliticianId: string) => {
    setSelectedPolitician(newPoliticianId);
    // Clear conversation history when switching politicians
    setConversationHistory([]);
    setResponse(null);
    setError(null);
  };

  const clearConversation = () => {
    setConversationHistory([]);
    setResponse(null);
    setError(null);
  };

  const getPartyColor = (party: string) => {
    switch (party) {
      case 'D': return 'text-blue-700 bg-blue-100';
      case 'R': return 'text-red-700 bg-red-100';
      case 'I': return 'text-purple-700 bg-purple-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const selectedMember = members.find(m => m.id === selectedPolitician);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            Political Q&A Session
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Ask direct questions to AI personas of U.S. politicians. All responses are strictly grounded in official voting records, bill sponsorships, and verified government documents.
          </p>
        </div>

        {/* Main Interface */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 md:p-12 mb-8">
            
            {/* Politician Selection */}
            <div className="mb-8">
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                Select a Politician
              </label>
              {loadingMembers ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
                  <span className="ml-3 text-gray-600">Loading politicians...</span>
                </div>
              ) : (
                <select
                  value={selectedPolitician}
                  onChange={(e) => handlePoliticianChange(e.target.value)}
                  className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg text-black"
                  disabled={loading}
                >
                  <option value="">Choose a politician...</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName} ({member.party}-{member.state}) - {member.chamber === 'house' ? 'Rep.' : 'Sen.'}
                      {member.district && ` District ${member.district}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Selected Politician Info */}
            {selectedMember && (
              <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold text-lg">
                    {selectedMember.firstName[0]}{selectedMember.lastName[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {selectedMember.firstName} {selectedMember.lastName}
                    </h3>
                    <p className="text-gray-600">
                      {selectedMember.chamber === 'house' ? 'U.S. Representative' : 'U.S. Senator'} for {selectedMember.state}
                      {selectedMember.district && ` (District ${selectedMember.district})`}
                    </p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold mt-2 ${getPartyColor(selectedMember.party)}`}>
                      {selectedMember.party === 'D' ? 'Democratic' : selectedMember.party === 'R' ? 'Republican' : selectedMember.party === 'I' ? 'Independent' : selectedMember.party}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Question Form */}
            <form onSubmit={handleSubmit} className="mb-8">
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                Your Question
              </label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={conversationHistory.length > 0 
                  ? "Ask a follow-up question to continue the conversation..." 
                  : "Ask about their stance on specific legislation, voting record, or policy positions..."
                }
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg resize-none text-black"
                rows={4}
                disabled={loading}
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-gray-500">
                  {query.length}/500 characters
                </span>
                <div className="flex gap-3">
                  {conversationHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={clearConversation}
                      className="px-4 py-3 bg-gray-500 text-white font-semibold rounded-xl hover:bg-gray-600 transition-all duration-300 shadow-lg"
                      disabled={loading}
                    >
                      Clear Conversation
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading || !selectedPolitician || !query.trim()}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Generating Response...
                      </div>
                    ) : (
                      conversationHistory.length > 0 ? 'Ask Follow-up' : 'Ask Question'
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Error Display */}
            {error && (
              <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center">
                  <span className="text-red-600 text-xl mr-3">⚠️</span>
                  <div>
                    <h4 className="text-red-800 font-semibold">Error</h4>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Latest Response Display - Show most recent response first */}
            {response && (
              <div className="space-y-6 mb-8">
                {/* Context Availability Warning */}
                {!response.hasSufficientContext && (
                  <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <div className="flex items-center">
                      <span className="text-yellow-600 text-xl mr-3">⚠️</span>
                      <div>
                        <h4 className="text-yellow-800 font-semibold">Limited Official Data</h4>
                        <p className="text-yellow-700">
                          Insufficient official records found to provide a comprehensive answer to your question.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Latest AI Response */}
                <div className="p-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-lg">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {response.politicians[0]?.name.split(' ').map(n => n[0]).join('') || 'AI'}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-blue-900 mb-2">
                        {response.politicians[0]?.name} responds:
                      </h4>
                      <div className="text-gray-800 leading-relaxed whitespace-pre-line">
                        {response.response}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Citations */}
                {response.citations && response.citations.length > 0 && (
                  <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Official Sources</h4>
                    <div className="space-y-2">
                      {response.citations.map((citation, index) => (
                        <div key={index} className="text-sm text-gray-700 p-3 bg-white rounded-lg border border-gray-200">
                          {citation}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Previous Conversation History */}
            {conversationHistory.length > 2 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Previous Conversation</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {/* Show all but the last two entries (which are the current question/response) */}
                  {conversationHistory.slice(0, -2).map((entry, index) => (
                    <div key={index} className={`p-4 rounded-xl ${
                      entry.role === 'user' 
                        ? 'bg-gray-50 ml-8 border border-gray-200' 
                        : 'bg-blue-50 mr-8 border border-blue-100'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          entry.role === 'user' 
                            ? 'bg-gray-500 text-white' 
                            : 'bg-blue-500 text-white'
                        }`}>
                          {entry.role === 'user' ? 'You' : selectedMember?.firstName?.[0] + selectedMember?.lastName?.[0] || 'AI'}
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium mb-1 text-sm ${
                            entry.role === 'user' ? 'text-gray-700' : 'text-blue-700'
                          }`}>
                            {entry.role === 'user' ? 'You asked:' : `${selectedMember?.firstName} ${selectedMember?.lastName}:`}
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
          </div>

          {/* Sample Questions */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Sample Questions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-700 italic">"What is your stance on H.R. 5376?"</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-700 italic">"How did you vote on healthcare legislation?"</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-700 italic">"What bills have you sponsored recently?"</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-700 italic">"What is your position on federal energy policy?"</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-8 text-center">
            <Link
              href="/political-debate"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-800 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-purple-900 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Try the Debate Simulator
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
