'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  chamber: string;
  state: string;
  party: string;
}

interface DebateState {
  mode: 'SOLO' | 'TRIAD';
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
  turns: number;
  maxWords: { opening: number; rebuttal: number; closing: number };
  currentRound: number;
}

export default function DebatePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberA, setSelectedMemberA] = useState('');
  const [selectedMemberB, setSelectedMemberB] = useState('');
  const [topic, setTopic] = useState('');
  const [userInput, setUserInput] = useState('');
  const [userStance, setUserStance] = useState('');
  const [debateState, setDebateState] = useState<DebateState | null>(null);
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const [qaHistory, setQaHistory] = useState<Array<{role: 'user' | 'politician', message: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCitations, setExpandedCitations] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchMembers();
    fetchDebateState();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await apiFetch('/api/members');
      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchDebateState = async () => {
    try {
      const response = await apiFetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'get_state' })
      });
      const data = await response.json();
      setDebateState(data.state);
    } catch (error) {
      console.error('Error fetching debate state:', error);
    }
  };

  const sendCommand = async (command: string, data: any = {}) => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, ...data })
      });
      const result = await response.json();
      
      if (result.result) {
        setChatHistory(prev => [...prev, result.result]);
      }
      if (result.state) {
        setDebateState(result.state);
      }
    } catch (error) {
      console.error('Error sending command:', error);
      setChatHistory(prev => [...prev, 'Error: Failed to process command']);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    
    const currentInput = userInput;
    setUserInput(''); // Clear input immediately for better UX
    
    // Check if we're in Q&A mode (SOLO with one member selected)
    if (debateState?.mode === 'SOLO' && selectedMemberA && !selectedMemberB) {
      await handleQAMessage(currentInput);
    } else {
      // Regular debate mode
      const userMessage = `[USER] ${currentInput}`;
      setChatHistory(prev => [...prev, userMessage]);
      await sendCommand('chat', { userInput: currentInput, userStance });
    }
  };
  
  const handleQAMessage = async (message: string) => {
    setLoading(true);
    try {
      // Add user message to Q&A history
      const newUserEntry = { role: 'user' as const, message };
      const updatedHistory = [...qaHistory, newUserEntry];
      setQaHistory(updatedHistory);
      
      // Add to display chat history
      setChatHistory(prev => [...prev, `[YOU] ${message}`]);
      
      // Send to interaction API with conversation history
      const response = await apiFetch('/api/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'qa',
          politician_id: selectedMemberA,
          query: message,
          conversation_history: qaHistory // Send existing history (not including current message)
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        setChatHistory(prev => [...prev, `[ERROR] ${data.error}`]);
        return;
      }
      
      const politicianName = data.politicians?.[0]?.name || 'Representative';
      const aiResponse = data.response;
      
      // Add AI response to Q&A history
      const newAIEntry = { role: 'politician' as const, message: aiResponse };
      setQaHistory(prev => [...prev, newUserEntry, newAIEntry]);
      
      // Add to display chat history
      setChatHistory(prev => [...prev, `[${politicianName.toUpperCase()}] ${aiResponse}`]);
      
      // Add citations if available
      if (data.citations && data.citations.length > 0) {
        setChatHistory(prev => [...prev, `[SOURCES] ${data.citations.join('; ')}`]);
      }
      
    } catch (error) {
      console.error('Error in Q&A:', error);
      setChatHistory(prev => [...prev, '[ERROR] Failed to get response']);
    } finally {
      setLoading(false);
    }
  };

  const handleChooseRep = async () => {
    if (!selectedMemberA) return;
    // Clear Q&A history when choosing a new representative
    setQaHistory([]);
    setChatHistory([]);
    await sendCommand('choose_rep', { memberId: selectedMemberA });
  };

  const handleAddRep = async () => {
    if (!selectedMemberB) return;
    await sendCommand('add_rep', { memberId: selectedMemberB });
  };

  const handleSetTopic = async () => {
    if (!topic) return;
    await sendCommand('topic', { topic });
  };


  const handleEndDebate = async () => {
    await sendCommand('end_debate');
  };

  const handleClearConversation = () => {
    setQaHistory([]);
    setChatHistory([]);
  };

  const handleStartQA = async () => {
    if (!selectedMemberA) return;
    // Clear second member to enter Q&A mode
    setSelectedMemberB('');
    setQaHistory([]);
    setChatHistory([]);
    // Update debate state to SOLO mode with only one member
    await sendCommand('choose_rep', { memberId: selectedMemberA });
  };

  const toggleCitation = (index: number) => {
    const newExpanded = new Set(expandedCitations);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedCitations(newExpanded);
  };

  const parseMessage = (message: string) => {
    // Check if it's a user message
    if (message.startsWith('[USER]')) {
      return { 
        mainText: message.replace('[USER]', '').trim(), 
        citations: [], 
        isUser: true 
      };
    }
    
    // Check if it's a moderator message
    if (message.startsWith('[MOD]')) {
      return { 
        mainText: message.replace('[MOD]', '').trim(), 
        citations: [], 
        isModerator: true 
      };
    }
    
    // Parse representative messages with citations
    const parts = message.split('CITATIONS=');
    const mainText = parts[0].trim();
    let citations = [];
    
    if (parts[1]) {
      try {
        citations = JSON.parse(parts[1]);
      } catch (e) {
        console.error('Error parsing citations:', e);
      }
    }
    
    return { mainText, citations, isUser: false, isModerator: false };
  };

  const getMemberName = (id: string) => {
    const member = members.find(m => m.id === id);
    return member ? `${member.firstName} ${member.lastName}` : 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">💬</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">AI Political Debate System</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Engage in SOLO CHAT with one legislator or moderate TRIAD DEBATE between two legislators.
          </p>
        </div>

        {/* Setup Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Setup Your Debate</h2>
          
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
              <div className="flex gap-3 mt-3">
                <button
                  onClick={handleChooseRep}
                  disabled={loading || !selectedMemberA}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Choose Rep A
                </button>
                <button
                  onClick={handleStartQA}
                  disabled={loading || !selectedMemberA}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  title="Start Q&A conversation with this representative"
                >
                  Start Q&A
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="member-b" className="block text-lg font-semibold text-gray-900 mb-3">
                🏛️ Add Representative B (Optional)
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
              <button
                onClick={handleAddRep}
                disabled={loading || !selectedMemberB}
                className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Add Rep B
              </button>
            </div>
          </div>

          <div className="mt-8">
            <label htmlFor="topic" className="block text-lg font-semibold text-gray-900 mb-3">
              🎯 Set Topic
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
                onClick={handleSetTopic}
                disabled={loading || !topic}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                Set Topic
              </button>
            </div>
          </div>

          {debateState?.mode === 'TRIAD' && (
            <div className="mt-6 text-center">
              <button
                onClick={handleEndDebate}
                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold"
              >
                End TRIAD Debate
              </button>
            </div>
          )}
        </div>

        {/* Current State Display */}
        {debateState && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-8 border border-blue-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Current Debate State</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">Mode:</p>
                <p className="text-lg font-bold text-blue-600">{debateState.mode}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Topic:</p>
                <p className="text-lg font-bold text-purple-600">{debateState.topic || 'Not set'}</p>
              </div>
              {debateState.memberA && (
                <div>
                  <p className="text-sm font-semibold text-gray-700">Member A:</p>
                  <p className="text-lg font-bold text-green-600">{debateState.memberA.name}</p>
                </div>
              )}
              {debateState.memberB && (
                <div>
                  <p className="text-sm font-semibold text-gray-700">Member B:</p>
                  <p className="text-lg font-bold text-orange-600">{debateState.memberB.name}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Interface */}
        {debateState?.memberA && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {debateState.mode === 'SOLO' ? '💬 SOLO CHAT' : '🎭 TRIAD DEBATE'}
              </h2>
              {debateState.mode === 'SOLO' && selectedMemberA && !selectedMemberB && (
                <p className="text-green-600 font-medium">
                  🔄 Q&A Mode: Ask follow-up questions and have a conversation!
                </p>
              )}
              {debateState.mode === 'SOLO' && selectedMemberA && selectedMemberB && (
                <p className="text-blue-600 font-medium">
                  🎭 Debate Mode: Two representatives will debate the topic
                </p>
              )}
            </div>
            
            {/* Chat History */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6 max-h-96 overflow-y-auto">
              {chatHistory.length === 0 ? (
                <p className="text-gray-500 text-center">Start a conversation by typing a message below...</p>
              ) : (
                <div className="space-y-4">
                  {chatHistory.map((message, index) => {
                    const { mainText, citations, isUser, isModerator } = parseMessage(message);
                    
                    // Determine message styling based on type
                    let messageClass = "bg-white rounded-lg p-4 shadow-sm border border-gray-200";
                    let textClass = "text-gray-800 font-medium whitespace-pre-wrap";
                    let headerClass = "text-sm font-semibold text-gray-600 mb-2";
                    let headerText = "";
                    
                    if (isUser) {
                      messageClass = "bg-blue-100 rounded-lg p-4 shadow-sm border border-blue-300";
                      textClass = "text-blue-900 font-semibold whitespace-pre-wrap";
                      headerClass = "text-sm font-bold text-blue-800 mb-2";
                      headerText = "👤 You";
                    } else if (isModerator) {
                      messageClass = "bg-purple-100 rounded-lg p-4 shadow-sm border border-purple-300";
                      textClass = "text-purple-900 font-medium whitespace-pre-wrap";
                      headerClass = "text-sm font-bold text-purple-800 mb-2";
                      headerText = "🎭 Moderator";
                    } else if (message.includes('[REP A]')) {
                      messageClass = "bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 shadow-sm border border-blue-300";
                      textClass = "text-blue-900 font-medium whitespace-pre-wrap";
                      headerClass = "text-sm font-bold text-blue-800 mb-2";
                      headerText = `🏛️ ${debateState?.memberA?.name || 'Representative A'} (${debateState?.memberA?.party || 'R'})`;
                    } else if (message.includes('[REP B]')) {
                      messageClass = "bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4 shadow-sm border border-red-300";
                      textClass = "text-red-900 font-medium whitespace-pre-wrap";
                      headerClass = "text-sm font-bold text-red-800 mb-2";
                      headerText = `🏛️ ${debateState?.memberB?.name || 'Representative B'} (${debateState?.memberB?.party || 'D'})`;
                    }
                    
                    return (
                      <div key={index} className={messageClass}>
                        {headerText && <div className={headerClass}>{headerText}</div>}
                        <div className="prose prose-sm max-w-none">
                          <p className={textClass}>{mainText}</p>
                        </div>
                        {citations.length > 0 && (
                          <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-800 mb-2">📚 Sources & Citations</h4>
                            <div className="space-y-1">
                              {citations.map((citation: any, citationIndex: number) => (
                                <div key={citationIndex} className="text-xs">
                                  <button
                                    onClick={() => toggleCitation(index * 100 + citationIndex)}
                                    className="text-blue-700 hover:text-blue-900 font-medium hover:underline"
                                  >
                                    [{citation.marker}] {citation.title}
                                  </button>
                                  {expandedCitations.has(index * 100 + citationIndex) && (
                                    <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                                      <p className="text-xs text-gray-600 mb-1"><strong>Publisher:</strong> {citation.publisher}</p>
                                      <p className="text-xs text-gray-600 mb-1"><strong>URL:</strong> <a href={citation.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{citation.url}</a></p>
                                      <p className="text-xs text-gray-600 mb-1"><strong>Retrieved:</strong> {new Date(citation.retrieved_at).toLocaleString()}</p>
                                      {citation.as_of && (
                                        <p className="text-xs text-gray-600"><strong>As of:</strong> {new Date(citation.as_of).toLocaleString()}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* User Input */}
            <div className="space-y-4">
              <div>
                <label htmlFor="user-stance" className="block text-sm font-bold text-gray-900 mb-2">
                  Your Stance (Optional)
                </label>
                <input
                  type="text"
                  id="user-stance"
                  value={userStance}
                  onChange={(e) => setUserStance(e.target.value)}
                  placeholder="Briefly describe your position on this topic..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium placeholder-gray-500"
                />
              </div>
              
              <div className="flex gap-4">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Type your message or question..."
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium placeholder-gray-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                {/* Show Clear Conversation button in Q&A mode */}
                {debateState?.mode === 'SOLO' && selectedMemberA && !selectedMemberB && qaHistory.length > 0 && (
                  <button
                    onClick={handleClearConversation}
                    className="px-4 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all duration-300 font-semibold"
                    title="Clear conversation history"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={handleSendMessage}
                  disabled={loading || !userInput.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 font-semibold"
                >
                  {loading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">💡 How to Use</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">SOLO CHAT Mode:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Choose one representative</li>
                <li>• Set a topic for discussion</li>
                <li>• Ask questions or share your views</li>
                <li>• Get responses based on their voting record</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">TRIAD DEBATE Mode:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Add a second representative</li>
                <li>• Set a debate topic</li>
                <li>• Watch them debate turn-by-turn</li>
                <li>• Interject with questions anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
