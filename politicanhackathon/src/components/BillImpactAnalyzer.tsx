'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

interface DemographicProfile {
  ageGroup: string;
  incomeLevel: string;
  education: string;
  location: string;
  employment: string;
  familyStatus: string;
  healthStatus?: string;
  housingStatus?: string;
  additionalContext?: string;
}

interface BillInfo {
  id: string;
  title: string;
  chamber: string;
  status: string;
}

interface ImpactAnalysis {
  overallImpact: string;
  specificEffects: string[];
  timeframe: string;
  confidence: string;
  actionItems: string[];
}

interface BillImpactAnalyzerProps {
  bill: BillInfo;
}

export default function BillImpactAnalyzer({ bill }: BillImpactAnalyzerProps) {
  const [demographics, setDemographics] = useState<DemographicProfile>({
    ageGroup: '',
    incomeLevel: '',
    education: '',
    location: '',
    employment: '',
    familyStatus: ''
  });

  const [analysis, setAnalysis] = useState<ImpactAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const ageGroups = [
    { value: '18-25', label: '18-25 years old' },
    { value: '26-35', label: '26-35 years old' },
    { value: '36-45', label: '36-45 years old' },
    { value: '46-55', label: '46-55 years old' },
    { value: '56-65', label: '56-65 years old' },
    { value: '65+', label: '65+ years old' }
  ];

  const incomeLevels = [
    { value: 'under-25k', label: 'Under $25,000' },
    { value: '25k-50k', label: '$25,000 - $50,000' },
    { value: '50k-75k', label: '$50,000 - $75,000' },
    { value: '75k-100k', label: '$75,000 - $100,000' },
    { value: '100k-150k', label: '$100,000 - $150,000' },
    { value: '150k+', label: '$150,000+' }
  ];

  const educationLevels = [
    { value: 'high-school', label: 'High School Diploma' },
    { value: 'some-college', label: 'Some College' },
    { value: 'associates', label: "Associate's Degree" },
    { value: 'bachelors', label: "Bachelor's Degree" },
    { value: 'masters', label: "Master's Degree" },
    { value: 'doctorate', label: 'Doctorate/PhD' },
    { value: 'trade', label: 'Trade/Vocational School' }
  ];

  const locations = [
    { value: 'urban', label: 'Urban/City Center' },
    { value: 'suburban', label: 'Suburban' },
    { value: 'rural', label: 'Rural/Small Town' },
    { value: 'mixed', label: 'Mixed Urban/Rural' }
  ];

  const employmentTypes = [
    { value: 'full-time', label: 'Full-time Employee' },
    { value: 'part-time', label: 'Part-time Employee' },
    { value: 'self-employed', label: 'Self-employed/Freelancer' },
    { value: 'unemployed', label: 'Unemployed' },
    { value: 'student', label: 'Student' },
    { value: 'retired', label: 'Retired' },
    { value: 'disabled', label: 'Unable to work' }
  ];

  const familyStatuses = [
    { value: 'single', label: 'Single, no children' },
    { value: 'single-parent', label: 'Single parent' },
    { value: 'married-no-children', label: 'Married, no children' },
    { value: 'married-with-children', label: 'Married with children' },
    { value: 'widowed', label: 'Widowed' },
    { value: 'divorced', label: 'Divorced' }
  ];

  const healthStatuses = [
    { value: 'excellent', label: 'Excellent health' },
    { value: 'good', label: 'Good health' },
    { value: 'fair', label: 'Fair health' },
    { value: 'chronic-condition', label: 'Chronic health condition' },
    { value: 'disability', label: 'Disability' }
  ];

  const housingStatuses = [
    { value: 'own-home', label: 'Own home' },
    { value: 'rent', label: 'Rent' },
    { value: 'live-with-family', label: 'Live with family' },
    { value: 'homeless', label: 'Homeless/Unstable housing' },
    { value: 'student-housing', label: 'Student housing' }
  ];

  const handleInputChange = (field: keyof DemographicProfile, value: string) => {
    setDemographics(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isFormComplete = () => {
    return demographics.ageGroup && 
           demographics.incomeLevel && 
           demographics.education && 
           demographics.location && 
           demographics.employment && 
           demographics.familyStatus;
  };

  const analyzeBillImpact = async () => {
    if (!isFormComplete()) {
      setError('Please complete all required demographic fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/bill-impact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billId: bill.id,
          demographics
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze bill impact');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact: string) => {
    if (impact.toLowerCase().includes('positive')) return 'text-green-700 bg-green-100';
    if (impact.toLowerCase().includes('negative')) return 'text-red-700 bg-red-100';
    if (impact.toLowerCase().includes('mixed')) return 'text-yellow-700 bg-yellow-100';
    return 'text-blue-700 bg-blue-100';
  };

  const getConfidenceColor = (confidence: string) => {
    if (confidence === 'high') return 'text-green-600';
    if (confidence === 'low') return 'text-red-600';
    return 'text-yellow-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <span className="mr-3">🎯</span>
            Personalized Impact Analysis
          </h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center"
          >
            {showForm ? 'Hide Analysis' : 'Analyze Impact'}
            <span className="ml-2">{showForm ? '↑' : '↓'}</span>
          </button>
        </div>

        <p className="text-gray-600 mb-4">
          See how this legislation might specifically affect someone like you based on your demographic profile.
        </p>

        {showForm && (
          <div className="space-y-6">
            {/* Demographics Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Age Group */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age Group *
                </label>
                <select
                  value={demographics.ageGroup}
                  onChange={(e) => handleInputChange('ageGroup', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="">Select age group</option>
                  {ageGroups.map(group => (
                    <option key={group.value} value={group.value}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Income Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Annual Household Income *
                </label>
                <select
                  value={demographics.incomeLevel}
                  onChange={(e) => handleInputChange('incomeLevel', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="">Select income level</option>
                  {incomeLevels.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Education */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Education Level *
                </label>
                <select
                  value={demographics.education}
                  onChange={(e) => handleInputChange('education', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="">Select education level</option>
                  {educationLevels.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Type *
                </label>
                <select
                  value={demographics.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="">Select location type</option>
                  {locations.map(location => (
                    <option key={location.value} value={location.value}>
                      {location.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employment Status *
                </label>
                <select
                  value={demographics.employment}
                  onChange={(e) => handleInputChange('employment', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="">Select employment status</option>
                  {employmentTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Family Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Family Status *
                </label>
                <select
                  value={demographics.familyStatus}
                  onChange={(e) => handleInputChange('familyStatus', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="">Select family status</option>
                  {familyStatuses.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Health Status (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Health Status (Optional)
                </label>
                <select
                  value={demographics.healthStatus || ''}
                  onChange={(e) => handleInputChange('healthStatus', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="">Select health status</option>
                  {healthStatuses.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Housing Status (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Housing Status (Optional)
                </label>
                <select
                  value={demographics.housingStatus || ''}
                  onChange={(e) => handleInputChange('housingStatus', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="">Select housing status</option>
                  {housingStatuses.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Additional Context (Optional) */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Context (Optional)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Share any specific circumstances, concerns, or details about your situation that might be relevant to how this bill could affect you.
              </p>
              <textarea
                value={demographics.additionalContext || ''}
                onChange={(e) => handleInputChange('additionalContext', e.target.value)}
                placeholder="e.g., 'I'm a small business owner with 5 employees', 'I have a child with special needs', 'I'm planning to buy my first home next year', etc."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black resize-none"
                rows={4}
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-400">
                  This helps provide more personalized analysis
                </span>
                <span className="text-xs text-gray-400">
                  {(demographics.additionalContext || '').length}/500
                </span>
              </div>
            </div>

            {/* Analyze Button */}
            <div className="flex justify-center">
              <button
                onClick={analyzeBillImpact}
                disabled={!isFormComplete() || loading}
                className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 flex items-center ${
                  isFormComplete() && !loading
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transform hover:scale-105 shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🤖</span>
                    Generate Personalized Analysis
                  </>
                )}
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <span className="text-red-600 mr-2">⚠️</span>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Analysis Results */}
            {analysis && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">📊</span>
                  Your Personalized Impact Analysis
                </h4>

                {/* Overall Impact */}
                <div className="mb-4">
                  <h5 className="font-medium text-gray-700 mb-2">Overall Impact:</h5>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getImpactColor(analysis.overallImpact)}`}>
                    {analysis.overallImpact}
                  </span>
                </div>

                {/* Specific Effects */}
                <div className="mb-4">
                  <h5 className="font-medium text-gray-700 mb-2">Specific Effects on Your Situation:</h5>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.specificEffects.map((effect, index) => (
                      <li key={index} className="text-gray-700">{effect}</li>
                    ))}
                  </ul>
                </div>

                {/* Timeframe and Confidence */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">Expected Timeframe:</h5>
                    <p className="text-gray-600">{analysis.timeframe}</p>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">Analysis Confidence:</h5>
                    <span className={`font-medium ${getConfidenceColor(analysis.confidence)}`}>
                      {analysis.confidence.charAt(0).toUpperCase() + analysis.confidence.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Action Items */}
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Recommended Actions:</h5>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.actionItems.map((action, index) => (
                      <li key={index} className="text-gray-700">{action}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 text-xs text-gray-500 border-t pt-3">
                  <p>This analysis is generated by AI based on the demographic information you provided and the bill's content. It should be used for informational purposes only and does not constitute professional advice.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
