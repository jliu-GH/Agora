'use client';

import { useState, useEffect } from 'react';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  chamber: string;
  state: string;
  party: string;
}

interface ModeratorDebateState {
  mode: 'MODERATED_DEBATE';
  memberA?: {
    id: string;
    name: string;
    chamber: string;
    state: string;
    district?: string;
    party: string;
  };
  memberB?: {
    id: string;
    name: string;
    chamber: string;
    state: string;
    district?: string;
    party: string;
  };
  topic: string;
  currentQuestion?: {
    id: string;
    question: string;
    context: string;
    category: string;
  };
  debateHistory: Array<{
    id: string;
    speaker: 'moderator' | 'memberA' | 'memberB' | 'user';
    content: string;
    timestamp: string;
    isPaused?: boolean;
  }>;
  isPaused: boolean;
  currentPhase: string;
  questionIndex: number;
  totalQuestions: number;
}

export default function ModeratorDebatePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberA, setSelectedMemberA] = useState('');
  const [selectedMemberB, setSelectedMemberB] = useState('');
  const [topic, setTopic] = useState('');
  const [userQuestion, setUserQuestion] = useState('');
  const [debateState, setDebateState] = useState<ModeratorDebateState | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [isDebateRunning, setIsDebateRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchMembers();
    fetchDebateState();
    
    // Cleanup on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  useEffect(() => {
    if (debateState) {
      setIsDebateRunning(debateState.isRunning || false);
      setIsPaused(debateState.isPaused || false);
    }
  }, [debateState]);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members');
      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchDebateState = async () => {
    try {
      const response = await fetch('/api/moderator-debate');
      const data = await response.json();
      setDebateState(data.state);
    } catch (error) {
      console.error('Error fetching debate state:', error);
    }
  };

  const sendCommand = async (action: string, data: any = {}) => {
    setLoading(true);
    try {
      const response = await fetch('/api/moderator-debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data })
      });
      const result = await response.json();
      
      if (result.state) {
        setDebateState(result.state);
      }
      
      if (result.error) {
        console.error('API Error:', result.error);
        alert(`Error: ${result.error}`);
        return false;
      }
      
      return result;
    } catch (error) {
      console.error('Error sending command:', error);
      alert('Network error - please check your connection');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeDebate = async () => {
    if (!selectedMemberA || !selectedMemberB || !topic) {
      alert('Please select both representatives and set a topic');
      return;
    }

    await sendCommand('initialize', {
      memberAId: selectedMemberA,
      memberBId: selectedMemberB,
      topic
    });
  };

  const handleStartFreeFlowingDebate = async () => {
    // First initialize if not already done
    if (!debateState?.memberA || !debateState?.memberB || !debateState?.topic) {
      if (!selectedMemberA || !selectedMemberB || !topic) {
        alert('Please select both representatives and set a topic first');
        return;
      }
      
      // Auto-initialize first
      await sendCommand('initialize', {
        memberAId: selectedMemberA,
        memberBId: selectedMemberB,
        topic
      });
      
      // Small delay to let initialization complete
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Then start free-flowing debate
    const result = await sendCommand('start_free_flowing', {});
    if (result) {
      // Start polling for updates when debate begins
      startPolling();
    }
  };

  const handlePauseDebate = async () => {
    await sendCommand('pause', {});
    stopPolling();
  };

  const handleResumeDebate = async () => {
    await sendCommand('resume', {});
    startPolling();
  };

  const startPolling = () => {
    if (pollingInterval) clearInterval(pollingInterval);
    
    const interval = setInterval(async () => {
      if (!isPaused && isDebateRunning) {
        await fetchDebateState();
      }
    }, 2000); // Poll every 2 seconds
    
    setPollingInterval(interval);
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  const handleMemberResponse = async (speaker: 'memberA' | 'memberB') => {
    setIsGeneratingResponse(true);
    setLoading(true);
    
    try {
      await sendCommand('respond', {
        speaker
      });
    } finally {
      setIsGeneratingResponse(false);
      setLoading(false);
    }
  };

  const handleUserInterjection = async () => {
    if (!userQuestion.trim()) {
      alert('Please enter your question');
      return;
    }
    if (!isPaused) {
      alert('Please pause the debate before asking a question.');
      return;
    }

    setLoading(true);
    try {
      const result = await sendCommand('user_interject', {
        userQuestion
      });
      
      if (result) {
        // Force refresh the debate state to show the new responses
        await fetchDebateState();
        setUserQuestion('');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleEndDebate = async () => {
    await sendCommand('end');
    stopPolling();
  };

  const handleResetDebate = async () => {
    if (confirm('Are you sure you want to reset the conversation? This will clear all debate history and start fresh.')) {
      await sendCommand('reset');
      stopPolling();
      // Reset local state as well
      setSelectedMemberA('');
      setSelectedMemberB('');
      setTopic('');
      setUserQuestion('');
      setIsDebateRunning(false);
      setIsPaused(false);
    }
  };

  const getSpeakerName = (speaker: string) => {
    if (speaker === 'moderator') return '🎭 Moderator';
    if (speaker === 'user') return '👤 You';
    if (speaker === 'memberA') return `🏛️ ${debateState?.memberA?.name || 'Representative A'}`;
    if (speaker === 'memberB') return `🏛️ ${debateState?.memberB?.name || 'Representative B'}`;
    return speaker;
  };

  const getSpeakerColor = (speaker: string) => {
    if (speaker === 'moderator') return 'bg-purple-100 border-purple-300 text-purple-900';
    if (speaker === 'user') return 'bg-blue-100 border-blue-300 text-blue-900';
    if (speaker === 'memberA') return 'bg-green-100 border-green-300 text-green-900';
    if (speaker === 'memberB') return 'bg-red-100 border-red-300 text-red-900';
    return 'bg-gray-100 border-gray-300 text-gray-900';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🎭</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Moderated Political Debate</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Watch a professional moderator guide a structured debate between two representatives. 
            Pause anytime to ask your own questions!
          </p>
        </div>

        {/* Setup Section */}
        {!debateState?.memberA && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Setup Your Moderated Debate</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label htmlFor="member-a" className="block text-lg font-semibold text-gray-900 mb-3">
                  🏛️ Choose Representative A
                </label>
                <select
                  id="member-a"
                  value={selectedMemberA}
                  onChange={(e) => setSelectedMemberA(e.target.value)}
                  className="block w-full px-4 py-3 border-2 border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                >
                  <option value="">Select Member A</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName} ({member.party}) - {member.state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="member-b" className="block text-lg font-semibold text-gray-900 mb-3">
                  🏛️ Choose Representative B
                </label>
                <select
                  id="member-b"
                  value={selectedMemberB}
                  onChange={(e) => setSelectedMemberB(e.target.value)}
                  className="block w-full px-4 py-3 border-2 border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                >
                  <option value="">Select Member B</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName} ({member.party}) - {member.state}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8">
              <label htmlFor="topic" className="block text-lg font-semibold text-gray-900 mb-3">
                🎯 Set Debate Topic
              </label>
              <div className="flex gap-4">
                <input
                  type="text"
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., climate change, healthcare reform, tax legislation..."
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                />
                <button
                  onClick={handleInitializeDebate}
                  disabled={loading || !selectedMemberA || !selectedMemberB || !topic}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 font-semibold"
                >
                  Start Debate
                </button>
                {(debateState?.debateHistory && debateState.debateHistory.length > 0) && (
                  <button
                    onClick={handleResetDebate}
                    disabled={loading}
                    className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-semibold"
                  >
                    🔄 Reset Conversation
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Current State Display */}
        {debateState?.memberA && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 mb-8 border border-purple-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Current Debate Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">Topic:</p>
                <p className="text-lg font-bold text-purple-600">{debateState.topic}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Phase:</p>
                <p className="text-lg font-bold text-blue-600 capitalize">{debateState.currentPhase.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Progress:</p>
                <p className="text-lg font-bold text-green-600">{debateState.questionIndex + 1} / {debateState.totalQuestions}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">Representative A:</p>
                <p className="text-lg font-bold text-green-600">{debateState.memberA?.name} ({debateState.memberA?.party})</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Representative B:</p>
                <p className="text-lg font-bold text-red-600">{debateState.memberB?.name} ({debateState.memberB?.party})</p>
              </div>
            </div>
          </div>
        )}

        {/* Debate History */}
        {debateState?.debateHistory && debateState.debateHistory.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Debate Transcript</h2>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {debateState.debateHistory.map((turn, index) => (
                <div key={turn.id} className={`rounded-lg p-4 border-2 ${getSpeakerColor(turn.speaker)}`}>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm">{getSpeakerName(turn.speaker)}</h4>
                    <span className="text-xs opacity-75">
                      {new Date(turn.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{turn.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Automatic Response Interface */}
        {debateState?.memberA && debateState.currentPhase !== 'setup' && !debateState.isPaused && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">AI-Generated Responses</h2>
            
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                Representatives will respond automatically based on their personality profiles, 
                voting records, and recent statements from social media and speeches.
              </p>
              
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => handleMemberResponse('memberA')}
                  disabled={loading || isGeneratingResponse}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 font-semibold"
                >
                  {isGeneratingResponse ? 'Generating...' : `${debateState.memberA?.name} Responds`}
                </button>
                
                <button
                  onClick={() => handleMemberResponse('memberB')}
                  disabled={loading || isGeneratingResponse}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 font-semibold"
                >
                  {isGeneratingResponse ? 'Generating...' : `${debateState.memberB?.name} Responds`}
                </button>
              </div>
              
              <div className="text-sm text-gray-500">
                <p>✨ Responses are generated using:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Individual personality profiles</li>
                  <li>Web scraping of social media and speeches</li>
                  <li>Voting records and committee work</li>
                  <li>Recent statements and positions</li>
                  <li>Google Gemini 1.5 Flash AI model</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* User Interjection Interface */}
        {debateState?.memberA && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Your Questions</h2>
            
            {!isPaused && isDebateRunning ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">
                  <div className="text-4xl mb-2">⏸️</div>
                  <p className="text-lg font-semibold">Debate is currently running</p>
                  <p className="text-sm">Pause the debate above to ask your own questions</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    {isPaused ? 'The debate is paused - ask your question!' : 'Ask a question or make a comment'}
                  </label>
                  <textarea
                    value={userQuestion}
                    onChange={(e) => setUserQuestion(e.target.value)}
                    placeholder={isPaused ? "What would you like to ask the representatives?" : "Ask a follow-up question or share your thoughts..."}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium h-24 resize-none"
                  />
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={handleUserInterjection}
                    disabled={loading || !userQuestion.trim()}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 font-semibold"
                  >
                    {isPaused ? '🗣️ Ask Both Representatives' : 'Ask Question'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Control Panel */}
        {(selectedMemberA && selectedMemberB && topic) && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🎛️ Free-Flowing Debate Controls</h3>
            
            {!isDebateRunning ? (
              <div className="text-center space-y-4">
                <p className="text-gray-600 mb-4">
                  Ready to start! The debate will flow automatically with representatives responding to each other and the moderator.
                </p>
                <button
                  onClick={handleStartFreeFlowingDebate}
                  disabled={loading}
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 font-semibold text-lg"
                >
                  🎭 Start Free-Flowing Debate
                </button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`}></div>
                  <span className="font-semibold text-gray-700">
                    {isPaused ? 'Debate Paused' : 'Debate Running'}
                  </span>
                </div>
                
                <div className="flex gap-4 justify-center">
                  {isPaused ? (
                    <button
                      onClick={handleResumeDebate}
                      disabled={loading}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 transition-all duration-300 font-semibold"
                    >
                      ▶️ Resume Debate
                    </button>
                  ) : (
                    <button
                      onClick={handlePauseDebate}
                      disabled={loading}
                      className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl hover:from-yellow-700 hover:to-orange-700 transition-all duration-300 font-semibold"
                    >
                      ⏸️ Pause Debate
                    </button>
                  )}
                      <button
                        onClick={handleEndDebate}
                        disabled={loading}
                        className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold"
                      >
                        🛑 End Debate
                      </button>
                      <button
                        onClick={handleResetDebate}
                        disabled={loading}
                        className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-semibold"
                      >
                        🔄 Reset
                      </button>
                </div>
                
                <p className="text-sm text-gray-600">
                  {isPaused 
                    ? 'Use the pause time to ask your own questions below.' 
                    : 'Click pause anytime to interject with your own questions.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">💡 How Moderated Debates Work</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Moderator Role:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Asks structured, balanced questions</li>
                <li>• Manages time and speaking order</li>
                <li>• Keeps debate focused and civil</li>
                <li>• Provides neutral summaries</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Your Role:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Pause debate anytime to ask questions</li>
                <li>• Submit responses for representatives</li>
                <li>• Guide the conversation direction</li>
                <li>• End debate when satisfied</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
