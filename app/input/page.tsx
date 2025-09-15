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
    summary?: {
      totalTrades: number;
      netPnl: number;
      winRate: number;
      profitFactor: number;
      maxDrawdown: number;
      days: number;
    };
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
          strategyName: data.strategyName,
          summary: data.summary
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
            <Alert className={`mt-6 ${result.success ? 'border-green-600 bg-green-900/20' : 'border-red-600 bg-red-900/20'}`}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
              <AlertDescription className={result.success ? 'text-green-200' : 'text-red-200'}>
                {result.message}
                {result.runId && (
                  <div className="mt-2 text-sm">
                    <strong>Run ID:</strong> {result.runId} | <strong>Strategy:</strong> {result.strategyName}
                  </div>
                )}
                {result.summary && (
                  <div className="mt-4 p-4 bg-gray-800/50 border border-gray-600 rounded-lg">
                    <h4 className="font-semibold text-white mb-3">Parse Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Total Trades:</span>
                        <div className="font-mono text-white">{result.summary.totalTrades}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Net PNL:</span>
                        <div className={`font-mono ${result.summary.netPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${result.summary.netPnl.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400">Win Rate:</span>
                        <div className="font-mono text-white">{result.summary.winRate.toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Profit Factor:</span>
                        <div className="font-mono text-white">{result.summary.profitFactor.toFixed(2)}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Max Drawdown:</span>
                        <div className="font-mono text-red-400">${result.summary.maxDrawdown.toFixed(2)}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Trading Days:</span>
                        <div className="font-mono text-white">{result.summary.days}</div>
                      </div>
                    </div>
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
