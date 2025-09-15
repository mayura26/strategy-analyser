'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, CheckCircle, XCircle } from 'lucide-react';

export default function InputPage() {
  const [rawData, setRawData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    runId?: number;
    strategyName?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rawData.trim()) {
      setResult({
        success: false,
        message: 'Please enter some raw data to parse'
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rawData }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: data.message,
          runId: data.runId,
          strategyName: data.strategyName
        });
        setRawData(''); // Clear the form
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to parse data'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-white">Strategy Data Input</h1>
        <p className="text-gray-300">
          Paste your raw strategy run data below to analyze and compare performance.
        </p>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Raw Data Input</CardTitle>
          <CardDescription className="text-gray-300">
            Paste the raw text output from your NinjaTrader strategy run. The system will automatically
            detect the strategy type and extract all relevant metrics and parameters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="rawData" className="text-white">Strategy Run Data</Label>
              <Textarea
                id="rawData"
                placeholder="Paste your raw strategy data here..."
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
                className="min-h-[400px] font-mono text-sm bg-gray-900 border-gray-600 text-white placeholder-gray-400"
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing Data...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Parse & Save Data
                </>
              )}
            </Button>
          </form>

          {result && (
            <Alert className={`mt-6 ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
                {result.message}
                {result.runId && (
                  <div className="mt-2 text-sm">
                    <strong>Run ID:</strong> {result.runId} | <strong>Strategy:</strong> {result.strategyName}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Supported Data Formats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-300">
            <p>• Strategy name in the header</p>
            <p>• Net PNL and performance metrics</p>
            <p>• Daily PNL breakdown</p>
            <p>• Strategy parameters and settings</p>
            <p>• Custom metrics specific to each strategy type</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
