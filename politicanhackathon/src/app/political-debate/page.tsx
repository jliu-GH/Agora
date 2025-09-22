'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  chamber: string;
  state: string;
  district?: string;
  party: string;
}

interface DebateResponse {
  mode: string;
  response: string;
  citations: string[];
  politicians: Array<{id: string, name: string, party: string, state: string, chamber: string}>;
  hasSufficientContext: boolean;
  turn?: number;
  currentPolitician?: {id: string, name: string, party: string, state: string, chamber: string};
}

interface DebateHistoryEntry {
  politician_id: string;
  statement: string;
}

interface DebateHistory {
  turn: number;
  politician_id: string;
  politician_name: string;
  response: string;
  citations: string[];
  timestamp: Date;
}

export default function PoliticalDebatePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedPoliticians, setSelectedPoliticians] = useState<[string, string]>(['', '']);
  const [topic, setTopic] = useState<string>('');
  const [debateHistory, setDebateHistory] = useState<DebateHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(true);
  const [currentTurn, setCurrentTurn] = useState<number>(1);
  const [isDebateActive, setIsDebateActive] = useState<boolean>(false);
  const [showNewQuestionForm, setShowNewQuestionForm] = useState<boolean>(false);
  const [newQuestion, setNewQuestion] = useState<string>('');
  const [questionTarget, setQuestionTarget] = useState<string>('both'); // 'both', politician_id1, or politician_id2

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);
      const res = await apiFetch('/api/members');
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

  const startDebate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPoliticians[0] || !selectedPoliticians[1] || !topic.trim()) {
      setError('Please select two politicians and enter a debate topic');
      return;
    }

    if (selectedPoliticians[0] === selectedPoliticians[1]) {
      setError('🚫 A politician cannot debate themselves! Please select two different politicians for a meaningful debate.');
      return;
    }

    setLoading(true);
    setError(null);
    setDebateHistory([]);
    setCurrentTurn(1);
    setIsDebateActive(true);

    await generateDebateTurn();
  };

  const continueDebate = async () => {
    if (!isDebateActive) return;
    setLoading(true);
    setError(null);
    await generateDebateTurn();
  };

  const generateDebateTurn = async () => {
    try {
      // Convert current debate history to the format expected by the API
      const debateHistoryForAPI: DebateHistoryEntry[] = debateHistory.map(entry => ({
        politician_id: entry.politician_id,
        statement: entry.response
      }));

      const res = await apiFetch('/api/interaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'debate',
          politician_ids: selectedPoliticians,
          query: topic.trim(),
          turn: currentTurn,
          debate_history: debateHistoryForAPI
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate debate response');
      }

      const responseData: DebateResponse = await res.json();
      
      // Create new history entry with current politician info
      const newHistoryEntry: DebateHistory = {
        turn: currentTurn,
        politician_id: responseData.currentPolitician?.id || '',
        politician_name: responseData.currentPolitician?.name || 'Unknown',
        response: responseData.response,
        citations: responseData.citations,
        timestamp: new Date()
      };

      setDebateHistory(prev => [...prev, newHistoryEntry]);
      setCurrentTurn(prev => prev + 1);

      // Check if debate should continue
      if (!responseData.hasSufficientContext) {
        setIsDebateActive(false);
      }

    } catch (err) {
      console.error('Error generating debate turn:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate debate response');
      setIsDebateActive(false);
    } finally {
      setLoading(false);
    }
  };

  const resetDebate = () => {
    setDebateHistory([]);
    setCurrentTurn(1);
    setIsDebateActive(false);
    setError(null);
    setShowNewQuestionForm(false);
    setNewQuestion('');
    setQuestionTarget('both');
  };

  const handleNewQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    // Determine target text for display
    let targetText = '';
    if (questionTarget === 'both') {
      targetText = 'to both candidates';
    } else {
      const targetPolitician = selectedMembers.find(m => m.id === questionTarget);
      targetText = targetPolitician ? `to ${targetPolitician.firstName} ${targetPolitician.lastName}` : 'to selected candidate';
    }

    // Add the new question as a "moderator" entry to the debate history
    const moderatorEntry: DebateHistory = {
      turn: currentTurn,
      politician_id: 'moderator',
      politician_name: 'Moderator',
      response: `New Question ${targetText}: ${newQuestion.trim()}`,
      citations: [],
      timestamp: new Date()
    };

    setDebateHistory(prev => [...prev, moderatorEntry]);
    setCurrentTurn(prev => prev + 1);
    setShowNewQuestionForm(false);
    setNewQuestion('');
    setQuestionTarget('both');

    // Continue the debate with the new question as the topic
    setLoading(true);
    setError(null);
    
    try {
      // Convert current debate history to API format
      const debateHistoryForAPI: DebateHistoryEntry[] = [...debateHistory, moderatorEntry].map(entry => ({
        politician_id: entry.politician_id,
        statement: entry.response
      }));

      const res = await apiFetch('/api/interaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'debate',
          politician_ids: selectedPoliticians,
          query: newQuestion.trim(), // Use the new question as the query
          turn: currentTurn,
          debate_history: debateHistoryForAPI,
          targetPolitician: questionTarget // Include targeting information
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate debate response');
      }

      const responseData: DebateResponse = await res.json();
      
      const newHistoryEntry: DebateHistory = {
        turn: currentTurn,
        politician_id: responseData.currentPolitician?.id || '',
        politician_name: responseData.currentPolitician?.name || 'Unknown',
        response: responseData.response,
        citations: responseData.citations,
        timestamp: new Date()
      };

      setDebateHistory(prev => [...prev, newHistoryEntry]);
      setCurrentTurn(prev => prev + 1);

      if (!responseData.hasSufficientContext) {
        setIsDebateActive(false);
      }

    } catch (err) {
      console.error('Error asking new question:', err);
      setError(err instanceof Error ? err.message : 'Failed to ask new question');
    } finally {
      setLoading(false);
    }
  };

  const getPartyColor = (party: string) => {
    switch (party) {
      case 'D': return 'text-blue-700 bg-blue-100';
      case 'R': return 'text-red-700 bg-red-100';
      case 'I': return 'text-purple-700 bg-purple-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const selectedMembers = [
    members.find(m => m.id === selectedPoliticians[0]),
    members.find(m => m.id === selectedPoliticians[1])
  ].filter(Boolean) as Member[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            Political Debate Simulator
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Watch AI personas of two politicians debate based on their official voting records and legislative positions. All responses are strictly grounded in verified government documents.
          </p>
        </div>

        {/* Main Interface */}
        <div className="max-w-6xl mx-auto">
          {!isDebateActive && debateHistory.length === 0 && (
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 md:p-12 mb-8">
              
              {/* Politician Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Politician 1 */}
                <div>
                  <label className="block text-lg font-semibold text-gray-900 mb-4">
                    First Debater
                  </label>
                  {loadingMembers ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-800"></div>
                      <span className="ml-3 text-gray-600">Loading...</span>
                    </div>
                  ) : (
                    <select
                      value={selectedPoliticians[0]}
                      onChange={(e) => setSelectedPoliticians([e.target.value, selectedPoliticians[1]])}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg text-black"
                      disabled={loading}
                    >
                      <option value="">Choose first politician...</option>
                      {members.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.firstName} {member.lastName} ({member.party}-{member.state})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Politician 2 */}
                <div>
                  <label className="block text-lg font-semibold text-gray-900 mb-4">
                    Second Debater
                    {selectedPoliticians[0] && (
                      <span className="ml-2 text-sm text-blue-600 font-normal">
                        (Different from first debater)
                      </span>
                    )}
                  </label>
                  {loadingMembers ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-800"></div>
                      <span className="ml-3 text-gray-600">Loading...</span>
                    </div>
                  ) : (
                    <select
                      value={selectedPoliticians[1]}
                      onChange={(e) => setSelectedPoliticians([selectedPoliticians[0], e.target.value])}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg text-black"
                      disabled={loading}
                    >
                      <option value="">Choose second politician...</option>
                      {members
                        .filter(member => member.id !== selectedPoliticians[0]) // Filter out first selected politician
                        .map(member => (
                          <option key={member.id} value={member.id}>
                            {member.firstName} {member.lastName} ({member.party}-{member.state})
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Selected Politicians Display */}
              {selectedMembers.length === 2 && (
                <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    🥊 Debate Participants Ready
                    <span className="ml-2 text-sm text-green-600 font-normal">
                      ✓ Two different politicians selected
                    </span>
                  </h3>
                  <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                    {selectedMembers.map((member, index) => (
                      <div key={member.id} className="flex items-center">
                        <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200 min-w-64">
                          <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold text-lg">
                            {member.firstName[0]}{member.lastName[0]}
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-gray-900">
                              {member.firstName} {member.lastName}
                            </h4>
                            <p className="text-gray-600">
                              {member.chamber === 'house' ? 'Representative' : 'Senator'} for {member.state}
                            </p>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold mt-1 ${getPartyColor(member.party)}`}>
                              {member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : member.party === 'I' ? 'Independent' : member.party}
                            </span>
                          </div>
                        </div>
                        {index === 0 && selectedMembers.length === 2 && (
                          <div className="mx-6 my-4 text-center">
                            <div className="text-3xl font-bold text-gray-400">VS</div>
                            <div className="text-sm text-gray-500">Different Politicians</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Topic Form */}
              <form onSubmit={startDebate} className="mb-8">
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  Debate Topic
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter a topic for debate, such as 'federal energy policy' or 'healthcare reform'..."
                  className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg resize-none text-black"
                  rows={3}
                  disabled={loading}
                  maxLength={300}
                />
                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm text-gray-500">
                    {topic.length}/300 characters
                  </span>
                  <button
                    type="submit"
                    disabled={loading || !selectedPoliticians[0] || !selectedPoliticians[1] || !topic.trim() || selectedPoliticians[0] === selectedPoliticians[1]}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-800 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-purple-900 transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Starting Debate...
                      </div>
                    ) : (
                      'Start Debate'
                    )}
                  </button>
                </div>
              </form>

              {/* Error Display */}
              {error && (
                <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center">
                    <span className="text-red-600 text-xl mr-3">⚠️</span>
                    <div>
                      <h4 className="text-red-800 font-semibold">Error</h4>
                      <p className="text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Debate Display */}
          {(isDebateActive || debateHistory.length > 0) && (
            <div className="space-y-6">
              {/* Debate Header */}
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Live Debate</h2>
                  <p className="text-lg text-gray-600 mb-6">Topic: {topic}</p>
                  {selectedMembers.length === 2 && (
                    <div className="flex items-center justify-center space-x-8">
                      {selectedMembers.map((member, index) => (
                        <div key={member.id} className="text-center">
                          <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold text-xl mx-auto mb-2">
                            {member.firstName[0]}{member.lastName[0]}
                          </div>
                          <h4 className="text-lg font-bold text-gray-900">
                            {member.firstName} {member.lastName}
                          </h4>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getPartyColor(member.party)}`}>
                            {member.party}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Debate History */}
{debateHistory.map((entry, index) => {
                const speakingMember = selectedMembers.find(m => m.id === entry.politician_id);
                const isModerator = entry.politician_id === 'moderator';
                
                return (
                  <div key={index} className={`backdrop-blur-sm rounded-2xl shadow-xl border p-6 ${
                    isModerator 
                      ? 'bg-yellow-50/90 border-yellow-200' 
                      : 'bg-white/90 border-white/20'
                  }`}>
                    <div className="flex items-start space-x-4 mb-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                        isModerator 
                          ? 'bg-yellow-500 text-white' 
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {isModerator 
                          ? '🎙️' 
                          : speakingMember 
                            ? `${speakingMember.firstName[0]}${speakingMember.lastName[0]}` 
                            : entry.turn
                        }
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h4 className={`text-xl font-bold ${
                            isModerator ? 'text-yellow-800' : 'text-gray-900'
                          }`}>
                            {entry.politician_name}
                          </h4>
                          {speakingMember && !isModerator && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getPartyColor(speakingMember.party)}`}>
                              {speakingMember.party}
                            </span>
                          )}
                          <span className="text-sm text-gray-500">Turn {entry.turn}</span>
                        </div>
                        <div className={`leading-relaxed whitespace-pre-line ${
                          isModerator ? 'text-yellow-800 font-medium' : 'text-gray-800'
                        }`}>
                          {entry.response}
                        </div>
                      </div>
                    </div>

                    {/* Citations for this turn */}
                    {entry.citations && entry.citations.length > 0 && !isModerator && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-900 mb-2">Sources</h5>
                        <div className="space-y-1">
                          {entry.citations.map((citation, citIndex) => (
                            <div key={citIndex} className="text-xs text-gray-600 p-2 bg-white rounded border border-gray-200">
                              {citation}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Loading indicator */}
              {loading && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mr-3"></div>
                    <span className="text-gray-700 text-lg">Generating next debate turn...</span>
                  </div>
                </div>
              )}

              {/* New Question Form */}
              {showNewQuestionForm && isDebateActive && !loading && (
                <div className="bg-blue-50/90 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-200 p-6">
                  <form onSubmit={handleNewQuestionSubmit} className="space-y-4">
                    {/* Target Selection */}
                    <div>
                      <label htmlFor="questionTarget" className="block text-lg font-semibold text-blue-900 mb-3">
                        🎯 Direct Question To:
                      </label>
                      <select
                        id="questionTarget"
                        value={questionTarget}
                        onChange={(e) => setQuestionTarget(e.target.value)}
                        className="w-full p-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg text-black"
                      >
                        <option value="both">Both Politicians</option>
                        {selectedMembers.map(member => (
                          <option key={member.id} value={member.id}>
                            {member.firstName} {member.lastName} ({member.party}-{member.state})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Question Text */}
                    <div>
                      <label htmlFor="newQuestion" className="block text-lg font-semibold text-blue-900 mb-3">
                        🎙️ Your Question
                      </label>
                      <textarea
                        id="newQuestion"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="Enter your new question here..."
                        className="w-full p-4 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg resize-none text-black"
                        rows={3}
                        maxLength={300}
                        required
                      />
                      <div className="text-sm text-blue-600 mt-2">
                        {newQuestion.length}/300 characters
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewQuestionForm(false);
                          setNewQuestion('');
                          setQuestionTarget('both');
                        }}
                        className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-xl hover:bg-gray-600 transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!newQuestion.trim()}
                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Ask Question
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Control Buttons */}
              <div className="flex justify-center space-x-4 flex-wrap">
                {isDebateActive && !loading && (
                  <>
                    <button
                      onClick={continueDebate}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-800 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-900 transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      Continue Debate
                    </button>
                    
                    {!showNewQuestionForm && (
                      <button
                        onClick={() => setShowNewQuestionForm(true)}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-300 transform hover:scale-105 shadow-lg"
                      >
                        🎙️ Ask New Question
                      </button>
                    )}
                  </>
                )}
                
                <button
                  onClick={resetDebate}
                  className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-semibold rounded-xl hover:from-gray-700 hover:to-gray-900 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  New Debate
                </button>
              </div>
            </div>
          )}

          {/* Sample Topics */}
          {!isDebateActive && debateHistory.length === 0 && (
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Sample Debate Topics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                     onClick={() => setTopic('Federal energy policy and renewable energy investments')}>
                  <p className="text-gray-700 italic">"Federal energy policy and renewable energy investments"</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                     onClick={() => setTopic('Healthcare reform and Medicare for All')}>
                  <p className="text-gray-700 italic">"Healthcare reform and Medicare for All"</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                     onClick={() => setTopic('Infrastructure spending and the federal budget')}>
                  <p className="text-gray-700 italic">"Infrastructure spending and the federal budget"</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                     onClick={() => setTopic('Climate change and environmental regulation')}>
                  <p className="text-gray-700 italic">"Climate change and environmental regulation"</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 text-center">
            <Link
              href="/political-qa"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Try the Q&A Session
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
