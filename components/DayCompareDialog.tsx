'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { formatDateOnly } from '@/lib/date-utils';

interface Run {
  id: number;
  run_name: string;
  run_description?: string;
  created_at: string;
  strategy_name: string;
  is_baseline?: boolean;
}

interface DayCompareDialogProps {
  run1: Run;
  run2: Run;
  children: React.ReactNode;
}

interface DayData {
  date: string;
  pnl: number;
  trades: number;
  highestIntradayPnl?: number;
  lowestIntradayPnl?: number;
  rawData?: string;
}

interface ComparisonData {
  run1: DayData | null;
  run2: DayData | null;
  run1RawData: string | null;
  run2RawData: string | null;
}

export const DayCompareDialog = ({ run1, run2, children }: DayCompareDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get available dates from both runs
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchAvailableDates();
    }
  }, [open, run1.id, run2.id]);

  const fetchAvailableDates = async () => {
    try {
      const [run1Response, run2Response] = await Promise.all([
        fetch(`/api/runs/${run1.id}/daily-pnl`),
        fetch(`/api/runs/${run2.id}/daily-pnl`)
      ]);

      const [run1Data, run2Data] = await Promise.all([
        run1Response.json(),
        run2Response.json()
      ]);

      if (run1Data.success && run2Data.success) {
        const run1Dates = run1Data.dailyPnl.map((d: any) => d.date);
        const run2Dates = run2Data.dailyPnl.map((d: any) => d.date);
        
        // Find overlapping dates
        const overlappingDates = run1Dates.filter((date: string) => run2Dates.includes(date));
        setAvailableDates(overlappingDates.sort());
        
        // Set the first available date as default
        if (overlappingDates.length > 0) {
          setSelectedDate(overlappingDates[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching available dates:', error);
      setError('Failed to fetch available dates');
    }
  };

  const fetchDayComparison = async (date: string) => {
    if (!date) return;

    setLoading(true);
    setError(null);

    try {
      const [run1Response, run2Response] = await Promise.all([
        fetch(`/api/runs/${run1.id}/daily-pnl?date=${date}`),
        fetch(`/api/runs/${run2.id}/daily-pnl?date=${date}`)
      ]);

      const [run1Data, run2Data] = await Promise.all([
        run1Response.json(),
        run2Response.json()
      ]);

      if (run1Data.success && run2Data.success) {
        const run1DayData = run1Data.dailyPnl[0] || null;
        const run2DayData = run2Data.dailyPnl[0] || null;

        // Fetch date-specific raw data for both runs
        const [run1RawResponse, run2RawResponse] = await Promise.all([
          fetch(`/api/runs/${run1.id}/raw-data/date/${date}`),
          fetch(`/api/runs/${run2.id}/raw-data/date/${date}`)
        ]);

        const [run1RawData, run2RawData] = await Promise.all([
          run1RawResponse.json(),
          run2RawResponse.json()
        ]);

        setComparisonData({
          run1: run1DayData,
          run2: run2DayData,
          run1RawData: run1RawData.success ? run1RawData.dateSpecificRawData?.join('\n') || 'No data for this date' : null,
          run2RawData: run2RawData.success ? run2RawData.dateSpecificRawData?.join('\n') || 'No data for this date' : null
        });
      } else {
        setError('Failed to fetch day data');
      }
    } catch (error) {
      console.error('Error fetching day comparison:', error);
      setError('Failed to fetch comparison data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    fetchDayComparison(date);
  };

  const getPerformanceIcon = (pnl: number) => {
    if (pnl > 0) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (pnl < 0) return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  const formatPnl = (pnl: number) => {
    return pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
  };

  const getPnlColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-400';
    if (pnl < 0) return 'text-red-400';
    return 'text-yellow-400';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className={`${selectedDate && comparisonData ? 'max-w-[95vw] sm:max-w-[95vw]' : 'max-w-2xl sm:max-w-2xl'} max-h-[90vh] bg-gray-800 border-gray-700 flex flex-col transition-all duration-300`}>
        <DialogHeader>
          <DialogTitle className="text-white">Day Comparison</DialogTitle>
          <DialogDescription className="text-gray-300">
            Compare detailed performance for a specific day between {run1.run_description || run1.run_name} and {run2.run_description || run2.run_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 flex-1 overflow-y-auto">
          {/* Date Selection */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Select Date</CardTitle>
              <CardDescription className="text-gray-300">
                Choose a date to compare performance between the two runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Calendar className="h-5 w-5 text-gray-400" />
                <select
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2 min-w-[200px]"
                  disabled={loading}
                >
                  <option value="">Select a date</option>
                  {availableDates.map((date) => (
                    <option key={date} value={date}>
                      {formatDateOnly(date)}
                    </option>
                  ))}
                </select>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
              </div>
              {availableDates.length === 0 && !loading && (
                <p className="text-yellow-400 text-sm mt-2">
                  No overlapping dates found between the selected runs
                </p>
              )}
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="bg-red-900/20 border-red-500">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comparison Results */}
          {comparisonData && selectedDate && (
            <div className="space-y-6">
              {/* Performance Summary */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Performance Summary - {formatDateOnly(selectedDate)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Run 1 Performance */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-blue-400 border-blue-400">
                          Run 1
                        </Badge>
                        <span className="text-white font-medium">
                          {run1.run_description || run1.run_name}
                        </span>
                      </div>
                      
                      {comparisonData.run1 ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-300">Daily P&L:</span>
                            <div className="flex items-center space-x-2">
                              {getPerformanceIcon(comparisonData.run1.pnl)}
                              <span className={`font-semibold ${getPnlColor(comparisonData.run1.pnl)}`}>
                                {formatPnl(comparisonData.run1.pnl)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-gray-300">Trades:</span>
                            <span className="text-white font-medium">{comparisonData.run1.trades}</span>
                          </div>
                          
                          {comparisonData.run1.highestIntradayPnl !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-300">Highest Intraday:</span>
                              <span className="text-green-400 font-medium">
                                {formatPnl(comparisonData.run1.highestIntradayPnl)}
                              </span>
                            </div>
                          )}
                          
                          {comparisonData.run1.lowestIntradayPnl !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-300">Lowest Intraday:</span>
                              <span className="text-red-400 font-medium">
                                {formatPnl(comparisonData.run1.lowestIntradayPnl)}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-yellow-400 text-sm">
                          No data available for this date
                        </div>
                      )}
                    </div>

                    {/* Run 2 Performance */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-purple-400 border-purple-400">
                          Run 2
                        </Badge>
                        <span className="text-white font-medium">
                          {run2.run_description || run2.run_name}
                        </span>
                      </div>
                      
                      {comparisonData.run2 ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-300">Daily P&L:</span>
                            <div className="flex items-center space-x-2">
                              {getPerformanceIcon(comparisonData.run2.pnl)}
                              <span className={`font-semibold ${getPnlColor(comparisonData.run2.pnl)}`}>
                                {formatPnl(comparisonData.run2.pnl)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-gray-300">Trades:</span>
                            <span className="text-white font-medium">{comparisonData.run2.trades}</span>
                          </div>
                          
                          {comparisonData.run2.highestIntradayPnl !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-300">Highest Intraday:</span>
                              <span className="text-green-400 font-medium">
                                {formatPnl(comparisonData.run2.highestIntradayPnl)}
                              </span>
                            </div>
                          )}
                          
                          {comparisonData.run2.lowestIntradayPnl !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-300">Lowest Intraday:</span>
                              <span className="text-red-400 font-medium">
                                {formatPnl(comparisonData.run2.lowestIntradayPnl)}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-yellow-400 text-sm">
                          No data available for this date
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Winner Comparison */}
                  {comparisonData.run1 && comparisonData.run2 && (
                    <div className="mt-6 pt-4 border-t border-gray-700">
                      <div className="text-center">
                        <h3 className="text-white font-semibold mb-2">Winner</h3>
                        {comparisonData.run1.pnl > comparisonData.run2.pnl ? (
                          <div className="flex items-center justify-center space-x-2 text-green-400">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-semibold">
                              Run 1 wins by {formatPnl(comparisonData.run1.pnl - comparisonData.run2.pnl)}
                            </span>
                          </div>
                        ) : comparisonData.run2.pnl > comparisonData.run1.pnl ? (
                          <div className="flex items-center justify-center space-x-2 text-green-400">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-semibold">
                              Run 2 wins by {formatPnl(comparisonData.run2.pnl - comparisonData.run1.pnl)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2 text-yellow-400">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-semibold">Tie</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Raw Data Comparison */}
              {(comparisonData.run1RawData || comparisonData.run2RawData) && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Raw Data Comparison - {formatDateOnly(selectedDate)}</CardTitle>
                    <CardDescription className="text-gray-300">
                      Detailed trading activity and events for both runs on this date
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`grid gap-8 min-w-0 ${selectedDate && comparisonData ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                      {/* Run 1 Raw Data */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-3">
                          <Badge variant="outline" className="text-blue-400 border-blue-400">
                            Run 1: {run1.run_description || run1.run_name}
                          </Badge>
                        </div>
                        <div className="bg-gray-900 rounded-md p-4 max-h-[60vh] overflow-y-auto">
                          {comparisonData.run1RawData && comparisonData.run1RawData !== 'No data for this date' ? (
                            <div className="space-y-1">
                              {comparisonData.run1RawData.split('\n').map((line, index) => {
                                if (!line.trim()) return null;
                                
                                // Color code different types of events
                                let lineColor = 'text-gray-300';
                                if (line.includes('SL Adjustment')) lineColor = 'text-yellow-400';
                                else if (line.includes('TP Near Miss') || line.includes('TRIM TP NEAR MISS')) lineColor = 'text-orange-400';
                                else if (line.includes('TRADE SUMMARY')) lineColor = 'text-green-400';
                                else if (line.includes('PNL UPDATE') || line.includes('COMPLETED TRADE PnL')) lineColor = 'text-blue-400';
                                else if (line.includes('TRADE COMPLETION')) lineColor = 'text-purple-400';
                                
                                return (
                                  <div key={index} className={`text-xs font-mono ${lineColor}`}>
                                    {line}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-gray-500 text-sm italic">No raw data available for this date</div>
                          )}
                        </div>
                      </div>

                      {/* Run 2 Raw Data */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-3">
                          <Badge variant="outline" className="text-purple-400 border-purple-400">
                            Run 2: {run2.run_description || run2.run_name}
                          </Badge>
                        </div>
                        <div className="bg-gray-900 rounded-md p-4 max-h-[60vh] overflow-y-auto">
                          {comparisonData.run2RawData && comparisonData.run2RawData !== 'No data for this date' ? (
                            <div className="space-y-1">
                              {comparisonData.run2RawData.split('\n').map((line, index) => {
                                if (!line.trim()) return null;
                                
                                // Color code different types of events
                                let lineColor = 'text-gray-300';
                                if (line.includes('SL Adjustment')) lineColor = 'text-yellow-400';
                                else if (line.includes('TP Near Miss') || line.includes('TRIM TP NEAR MISS')) lineColor = 'text-orange-400';
                                else if (line.includes('TRADE SUMMARY')) lineColor = 'text-green-400';
                                else if (line.includes('PNL UPDATE') || line.includes('COMPLETED TRADE PnL')) lineColor = 'text-blue-400';
                                else if (line.includes('TRADE COMPLETION')) lineColor = 'text-purple-400';
                                
                                return (
                                  <div key={index} className={`text-xs font-mono ${lineColor}`}>
                                    {line}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-gray-500 text-sm italic">No raw data available for this date</div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <h4 className="text-sm font-medium text-white mb-2">Event Legend:</h4>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-xs">
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                          <span className="text-gray-300">SL Adjustments</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-orange-400 rounded"></div>
                          <span className="text-gray-300">TP Near Misses</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-green-400 rounded"></div>
                          <span className="text-gray-300">Trade Summaries</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-blue-400 rounded"></div>
                          <span className="text-gray-300">PnL Updates</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-purple-400 rounded"></div>
                          <span className="text-gray-300">Trade Completions</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
