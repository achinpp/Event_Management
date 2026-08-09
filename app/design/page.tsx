'use client';

import { useState } from 'react';

export default function DesignGeneratorPage() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    svg: string | null;
    spec: any;
    shapeId: string;
    exportError?: string | null;
    penpotUrl?: string;
    message?: string;
  } | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/design/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate design');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
            AI Event Banner Generator
          </h1>
          <p className="mt-4 text-xl text-gray-500">
            Describe your event and watch AI generate a custom banner directly in Penpot.
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                Event Description
              </label>
              <textarea
                id="prompt"
                rows={3}
                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-lg p-4 border bg-gray-50"
                placeholder="e.g. A cyberpunk themed hackathon in San Francisco on Friday night..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating in Penpot...
                  </>
                ) : (
                  'Generate Banner'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-xl bg-red-50 p-4 border border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error generating design</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="space-y-6">
            {/* Status message */}
            <div className={`rounded-xl p-4 border ${result.svg ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <p className={`text-sm font-medium ${result.svg ? 'text-green-800' : 'text-amber-800'}`}>
                {result.svg ? '✅ ' : '🎨 '}{result.message}
              </p>
              {!result.svg && result.penpotUrl && (
                <a
                  href={result.penpotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Open Penpot to see your design →
                </a>
              )}
            </div>

            {/* SVG Preview (only if export succeeded) */}
            {result.svg && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Generated Result
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Exported from Penpot
                  </span>
                </div>
                
                <div className="p-8 flex justify-center bg-gray-100/50">
                  <div 
                    className="shadow-xl rounded-2xl overflow-hidden bg-white ring-1 ring-gray-900/5"
                    style={{ maxWidth: '100%' }}
                    dangerouslySetInnerHTML={{ __html: result.svg }} 
                  />
                </div>
              </div>
            )}

            {/* Design Spec Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Design Decisions
              </h4>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Extracted Title</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-semibold">{result.spec.title}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Subtitle</dt>
                  <dd className="mt-1 text-sm text-gray-900">{result.spec.subtitle}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Color Palette</dt>
                  <dd className="mt-2 flex space-x-2">
                    <div className="w-8 h-8 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: result.spec.backgroundColor }} title="Background" />
                    <div className="w-8 h-8 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: result.spec.textColor }} title="Text" />
                    <div className="w-8 h-8 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: result.spec.accentColor }} title="Accent" />
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

