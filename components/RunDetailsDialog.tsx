'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart3, Settings, Calendar, Activity, Target, FileText, Star } from 'lucide-react';
import { formatDateOnly } from '@/lib/date-utils';

interface Run {
  id: number;
  run_name: string;
  run_description?: string;
  net_pnl: number;
  total_trades: number;
  win_rate: number;
  profit_factor: number;
  created_at: string;
  strategy_name: string;
  is_baseline?: boolean;
}

interface DailyPnl {
  date: string;
  pnl: number;
  trades: number;
  highest_intraday_pnl?: number;
  lowest_intraday_pnl?: number;
}

interface Parameter {
  parameter_name: string;
  parameter_value: string;
}

interface Metric {
  metric_name: string;
  metric_value: number;
  metric_description?: string;
}

interface DetailedEvent {
  date: string;
  time: string;
  tradeId?: string;
  direction: string;
  target?: string;
  closestDistance: string;
  reason?: string;
  trigger?: string;
  adjustment?: string;
}

interface DetailedTrade {
  tradeId: string;
  date: string;
  time: string;
  direction: string;
  line: string;
  entry: number;
  high: number;
  low: number;
  maxProfit: number;
  maxLoss: number;
  actualPnl: number;
  bars: number;
  maxProfitVsTarget: number;
  maxLossVsStop: number;
  profitEfficiency: number;
}

interface RunDetailsDialogProps {
  run: Run;
  runDailyPnl: DailyPnl[];
  runParameters: Parameter[];
  isOpen: boolean;
  onClose: () => void;
  onSaveDescription?: (runId: number) => Promise<void>;
  onDescriptionChange?: (runId: number, value: string) => void;
  localDescription?: { [runId: number]: string };
  savingDescription?: number | null;
  onBaselineChange?: (runId: number, isBaseline: boolean) => Promise<void>;
}

export const RunDetailsDialog = ({ 
  run, 
  runDailyPnl, 
  runParameters, 
  isOpen, 
  onClose, 
  onSaveDescription,
  onDescriptionChange,
  localDescription,
  savingDescription,
  onBaselineChange
}: RunDetailsDialogProps) => {
  const [runMetrics, setRunMetrics] = useState<Metric[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [detailedEvents, setDetailedEvents] = useState<{
    tpNearMisses: DetailedEvent[];
    fillNearMisses: DetailedEvent[];
    slAdjustments: DetailedEvent[];
  }>({ tpNearMisses: [], fillNearMisses: [], slAdjustments: [] });
  const [detailedTrades, setDetailedTrades] = useState<DetailedTrade[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [rawData, setRawData] = useState<string | null>(null);
  const [loadingRawData, setLoadingRawData] = useState(false);
  const [rawDataError, setRawDataError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isBaseline, setIsBaseline] = useState(run.is_baseline || false);
  const [updatingBaseline, setUpdatingBaseline] = useState(false);

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return `$${value.toFixed(2)}`;
  };
  const formatPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return `${(value * 100).toFixed(1)}%`;
  };

  // Fetch data when dialog opens
  useEffect(() => {
    if (isOpen && run.id) {
      fetchMetrics();
      fetchEvents();
      fetchTrades();
      fetchRawData();
    }
  }, [isOpen, run.id]);

  // Update baseline state when run changes
  useEffect(() => {
    setIsBaseline(run.is_baseline || false);
  }, [run.is_baseline]);

  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const response = await fetch(`/api/runs/${run.id}/metrics`);
      const data = await response.json();
      if (data.success) {
        setRunMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const response = await fetch(`/api/runs/${run.id}/events`);
      const data = await response.json();
      if (data.success) {
        setDetailedEvents(data.events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchTrades = async () => {
    setLoadingTrades(true);
    try {
      const response = await fetch(`/api/runs/${run.id}/trades`);
      const data = await response.json();
      if (data.success) {
        setDetailedTrades(data.trades);
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoadingTrades(false);
    }
  };

  const fetchRawData = async () => {
    setLoadingRawData(true);
    setRawDataError(null);
    try {
      const response = await fetch(`/api/runs/${run.id}/raw-data`);
      const data = await response.json();
      if (data.success) {
        setRawData(data.rawData);
        setRawDataError(null);
      } else {
        // Handle API errors gracefully
        console.warn('Failed to fetch raw data:', data.error);
        setRawData(null);
        setRawDataError(data.error || 'Failed to fetch raw data');
      }
    } catch (error) {
      console.error('Error fetching raw data:', error);
      setRawData(null);
      setRawDataError('Network error while fetching raw data');
    } finally {
      setLoadingRawData(false);
    }
  };

  const handleSave = async () => {
    if (!onSaveDescription) return;
    await onSaveDescription(run.id);
  };

  const handleBaselineToggle = async () => {
    if (!onBaselineChange) return;
    
    setUpdatingBaseline(true);
    try {
      await onBaselineChange(run.id, !isBaseline);
      setIsBaseline(!isBaseline);
    } catch (error) {
      console.error('Error updating baseline status:', error);
    } finally {
      setUpdatingBaseline(false);
    }
  };

  const isEditing = localDescription && localDescription[run.id] !== undefined;
  const isSaving = savingDescription === run.id;

  // Organize metrics by line
  const organizeMetricsByLine = () => {
    const lineMetrics: { [lineName: string]: Metric[] } = {};
    const generalMetrics: Metric[] = [];

    runMetrics.forEach(metric => {
      if (metric.metric_name.includes(' - ')) {
        const [lineName] = metric.metric_name.split(' - ');
        if (!lineMetrics[lineName]) {
          lineMetrics[lineName] = [];
        }
        lineMetrics[lineName].push(metric);
      } else {
        generalMetrics.push(metric);
      }
    });

    return { lineMetrics, generalMetrics };
  };

  const { lineMetrics, generalMetrics } = organizeMetricsByLine();

  // Organize parameters by category
  const organizeParametersByCategory = () => {
    const categories: { [category: string]: Parameter[] } = {
      'Main Parameters': [],
      'Entry Logic': [],
      'Position Management': [],
      'Time Parameters': [],
      'Protective Functions': [],
      'Magic Lines': [],
      'Morning Lines': [],
      'Other': []
    };

    runParameters.forEach(param => {
      const name = param.parameter_name.toLowerCase();
      
      if (name.includes('trade quantity') || name.includes('max gain') || name.includes('max loss') || 
          name.includes('consecutive') || name.includes('loss cut') || name.includes('take profit') || 
          name.includes('stop loss') || name.includes('early finish')) {
        categories['Main Parameters'].push(param);
      } else if (name.includes('min distance from line') || name.includes('max distance from line') || 
                 name.includes('entry offset') || name.includes('bar count') || 
                 name.includes('upside') || name.includes('downside')) {
        categories['Entry Logic'].push(param);
      } else if (name.includes('trim') || name.includes('adjustment') || name.includes('x1') || 
                 name.includes('x2') || name.includes('l1') || name.includes('l2') || 
                 name.includes('sl time-based') || name.includes('level l') || 
                 name.includes('sl adjustment') || name.includes('sl levels') || 
                 name.includes('sl high/low') || name.includes('tp adjustment') || 
                 name.includes('tp levels') || name.includes('tp x1') || name.includes('tp x2') ||
                 name.includes('trim tp near miss') || name.includes('trim distance') || 
                 name.includes('trim offset') || (name === 'distance') || (name === 'offset')) {
        categories['Position Management'].push(param);
      } else if (name.includes('time') || name.includes('start') || name.includes('end')) {
        categories['Time Parameters'].push(param);
      } else if (name.includes('trade completion protect') || name.includes('max profit delay') || 
                 name.includes('max loss delay')) {
        categories['Protective Functions'].push(param);
      } else if (name.includes('morning lines') || name.includes('duration') || name.includes('morning levels')) {
        categories['Morning Lines'].push(param);
      } else if (name.includes('level') || name.includes('mini mode') || name.includes('instrument') || 
                 name.includes('upside levels') || name.includes('downside levels')) {
        categories['Magic Lines'].push(param);
      } else {
        categories['Other'].push(param);
      }
    });

    // Remove empty categories
    return Object.fromEntries(
      Object.entries(categories).filter(([, params]) => params.length > 0)
    );
  };

  const parameterCategories = organizeParametersByCategory();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`${activeTab === 'lines' || activeTab === 'raw' ? 'max-w-[95vw] sm:max-w-[95vw]' : 'max-w-4xl sm:max-w-4xl'} max-h-[90vh] bg-gray-800 border-gray-700 flex flex-col`}>
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-blue-600/20 border-blue-500 text-blue-300 text-xs px-2 py-0.5">
              Run #{run.id}
            </Badge>
            <DialogTitle className="text-white text-base">{run.run_name || `Run ${run.id}`}</DialogTitle>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-gray-300 text-xs">
              Submitted: {formatDateOnly(run.created_at)}
            </p>
            
            {/* Baseline Toggle - In header */}
            {onBaselineChange && (
              <div className="flex items-center gap-2">
                <Star className={`h-4 w-4 ${isBaseline ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`} />
                {isBaseline && (
                  <Badge variant="outline" className="bg-yellow-600/20 border-yellow-500 text-yellow-300 text-xs px-2 py-0.5">
                    Active
                  </Badge>
                )}
                <Button
                  size="sm"
                  onClick={handleBaselineToggle}
                  disabled={updatingBaseline}
                  className={`h-6 px-2 text-xs ${
                    isBaseline 
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                      : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                  }`}
                >
                  {updatingBaseline ? 'Updating...' : (isBaseline ? 'Remove' : 'Set')}
                </Button>
              </div>
            )}
          </div>

          <div className="mt-2 p-2 bg-gray-700/50 rounded border border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white text-xs font-medium">Description</h4>
              {onSaveDescription && onDescriptionChange && (
                <div className="flex gap-1">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-6 px-2 text-xs"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDescriptionChange && onDescriptionChange(run.id, run.run_description || '')}
                        className="border-gray-500 text-gray-300 hover:bg-gray-600 h-6 px-2 text-xs"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDescriptionChange && onDescriptionChange(run.id, run.run_description || '')}
                      className="border-gray-500 text-gray-300 hover:bg-gray-600 h-6 px-2 text-xs"
                    >
                      Edit
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {isEditing ? (
              <textarea
                value={localDescription?.[run.id] || ''}
                onChange={(e) => onDescriptionChange && onDescriptionChange(run.id, e.target.value)}
                placeholder="Enter a description for this run..."
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 resize-none text-xs"
                rows={2}
              />
            ) : (
              <p className="text-gray-300 text-xs min-h-[32px]">
                {run.run_description || 'No description provided. Click Edit to add one.'}
              </p>
            )}
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1 min-h-0">
          <TabsList className="grid w-full grid-cols-7 bg-gray-700 flex-shrink-0">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="lines" className="text-xs">Magic Lines</TabsTrigger>
            <TabsTrigger value="events" className="text-xs">Events</TabsTrigger>
            <TabsTrigger value="trades" className="text-xs">Trade Analysis</TabsTrigger>
            <TabsTrigger value="daily" className="text-xs">Daily PNL</TabsTrigger>
            <TabsTrigger value="params" className="text-xs">Parameters</TabsTrigger>
            <TabsTrigger value="raw" className="text-xs">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3 mt-3 flex-1 overflow-y-auto">
            {/* Enhanced Metrics */}
            {generalMetrics.length > 0 ? (
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-3">
                  <h3 className="text-white flex items-center gap-2 text-sm mb-3">
                    <Activity className="h-4 w-4" />
                    Trading Performance Metrics
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {generalMetrics.map((metric, index) => {
                      // Format different types of metrics appropriately
                      const isDuration = metric.metric_name.includes('Duration');
                      const isConsecutive = metric.metric_name.includes('Consecutive');
                      const isCount = metric.metric_name.includes('Adjustments') || 
                                     metric.metric_name.includes('Near Misses') || 
                                     metric.metric_name.includes('Misses');
                      
                      let displayValue;
                      if (isDuration) {
                        displayValue = `${metric.metric_value} bars`;
                      } else if (isConsecutive) {
                        displayValue = metric.metric_value;
                      } else if (isCount) {
                        displayValue = metric.metric_value;
                      } else {
                        displayValue = metric.metric_value;
                      }
                      
                      return (
                        <div key={index} className="flex justify-between items-center py-1.5 px-2 bg-gray-600 rounded">
                          <span className="text-gray-300 text-xs">{metric.metric_name}</span>
                          <span className="text-white font-mono bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                            {displayValue}
                          </span>
                    </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
            ) : (
              <div className="text-center text-gray-400 py-4">No performance metrics available</div>
            )}
          </TabsContent>

          <TabsContent value="lines" className="space-y-3 mt-3 flex-1 overflow-y-auto">
            {loadingMetrics ? (
              <div className="text-center text-gray-400 py-4">Loading line statistics...</div>
            ) : Object.keys(lineMetrics).length > 0 ? (
              <div className="space-y-3">
                <Card className="bg-gray-700 border-gray-600">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-full">
                        <thead className="bg-gray-800 border-b border-gray-600">
                          <tr>
                            <th className="text-left py-3 px-4 text-white font-medium text-sm">Magic Line</th>
                            <th className="text-right py-3 px-4 text-white font-medium text-sm">Total Trades</th>
                            <th className="text-right py-3 px-4 text-white font-medium text-sm">Win Rate</th>
                            <th className="text-right py-3 px-4 text-white font-medium text-sm">Net PNL</th>
                            <th className="text-right py-3 px-4 text-white font-medium text-sm">Avg PNL</th>
                            <th className="text-right py-3 px-4 text-white font-medium text-sm">Gross Profit</th>
                            <th className="text-right py-3 px-4 text-white font-medium text-sm">Gross Loss</th>
                            <th className="text-right py-3 px-4 text-white font-medium text-sm">Profit Factor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(lineMetrics)
                            .sort(([a], [b]) => {
                              // Extract direction and numeric values
                              const aIsUp = a.includes('UP');
                              const bIsUp = b.includes('UP');
                              const aNum = parseFloat(a.replace(/[^\d.-]/g, ''));
                              const bNum = parseFloat(b.replace(/[^\d.-]/g, ''));
                              
                              // First sort by direction: UP lines first, then DOWN lines
                              if (aIsUp && !bIsUp) return -1;
                              if (!aIsUp && bIsUp) return 1;
                              
                              // Within same direction, sort by numeric value
                              return aNum - bNum;
                            })
                            .map(([lineName, metrics]) => {
                              // Extract specific metrics for this line
                              const totalTrades = metrics.find(m => m.metric_name.includes('Total Trades'))?.metric_value || 0;
                              const winRate = metrics.find(m => m.metric_name.includes('Win Rate'))?.metric_value || 0;
                              const netPnl = metrics.find(m => m.metric_name.includes('Net PNL'))?.metric_value || 0;
                              const avgPnl = metrics.find(m => m.metric_name.includes('Avg PNL'))?.metric_value || 0;
                              const grossProfit = metrics.find(m => m.metric_name.includes('Gross Profit'))?.metric_value || 0;
                              const grossLoss = metrics.find(m => m.metric_name.includes('Gross Loss'))?.metric_value || 0;
                              const profitFactor = metrics.find(m => m.metric_name.includes('Profit Factor'))?.metric_value || 0;
                          
                          return (
                                <tr key={lineName} className="border-b border-gray-600 hover:bg-gray-600/50">
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <Target className="h-4 w-4 text-blue-400" />
                                      <span className="text-white font-medium text-sm">{lineName}</span>
                                    </div>
                                  </td>
                                  <td className="text-right py-3 px-4">
                                    <span className="text-white font-mono text-sm">{totalTrades}</span>
                                  </td>
                                  <td className="text-right py-3 px-4">
                                    <span className="text-white font-mono text-sm">{formatPercentage(winRate)}</span>
                                  </td>
                                  <td className="text-right py-3 px-4">
                                    <span className={`font-mono text-sm ${netPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {formatCurrency(netPnl)}
                                    </span>
                                  </td>
                                  <td className="text-right py-3 px-4">
                                    <span className={`font-mono text-sm ${avgPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {formatCurrency(avgPnl)}
                              </span>
                                  </td>
                                  <td className="text-right py-3 px-4">
                                    <span className="text-green-400 font-mono text-sm">{formatCurrency(grossProfit)}</span>
                                  </td>
                                  <td className="text-right py-3 px-4">
                                    <span className="text-red-400 font-mono text-sm">{formatCurrency(grossLoss)}</span>
                                  </td>
                                  <td className="text-right py-3 px-4">
                                    <span className="text-white font-mono text-sm">{profitFactor.toFixed(2)}</span>
                                  </td>
                                </tr>
                          );
                        })}
                        </tbody>
                      </table>
                </div>
              </CardContent>
            </Card>
          </div>
            ) : (
              <div className="text-center text-gray-400 py-4">No line-specific metrics available</div>
            )}
          </TabsContent>

          <TabsContent value="events" className="space-y-3 mt-3 flex-1 overflow-y-auto">
            {loadingEvents ? (
              <div className="text-center text-gray-400 py-4">Loading events...</div>
            ) : (
              <div className="space-y-3">
                {/* TP Near Misses */}
                {detailedEvents.tpNearMisses.length > 0 && (
                  <Card className="bg-gray-700 border-gray-600">
                    <CardContent className="p-3">
                      <h3 className="text-white flex items-center gap-2 text-sm mb-3">
                        <Target className="h-4 w-4" />
                        TP Near Misses ({detailedEvents.tpNearMisses.length})
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {detailedEvents.tpNearMisses.map((event, index) => (
                          <div key={index} className="bg-gray-600 rounded p-2 text-xs">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-white font-medium">
                                Trade #{event.tradeId} - {event.direction}
                              </span>
                              <span className="text-red-400 font-mono">
                                {event.closestDistance}pts
                              </span>
                            </div>
                            <div className="text-gray-300">
                              Target: {event.target} | Reason: {event.reason}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {event.date} {event.time}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Fill Near Misses */}
                {detailedEvents.fillNearMisses.length > 0 && (
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-3">
                      <h3 className="text-white flex items-center gap-2 text-sm mb-3">
                        <Target className="h-4 w-4" />
                        Fill Near Misses ({detailedEvents.fillNearMisses.length})
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {detailedEvents.fillNearMisses.map((event, index) => (
                          <div key={index} className="bg-gray-600 rounded p-2 text-xs">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-white font-medium">
                                {event.direction} Fill Miss
                              </span>
                              <span className="text-red-400 font-mono">
                                {event.closestDistance}pts
                              </span>
                            </div>
                            <div className="text-gray-400 text-xs">
                              {event.date} {event.time}
                    </div>
                  </div>
                        ))}
                </div>
              </CardContent>
            </Card>
                )}

                {/* SL Adjustments */}
                {detailedEvents.slAdjustments.length > 0 && (
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-3">
                      <h3 className="text-white flex items-center gap-2 text-sm mb-3">
                        <Settings className="h-4 w-4" />
                        SL Adjustments ({detailedEvents.slAdjustments.length})
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {detailedEvents.slAdjustments.map((event, index) => (
                          <div key={index} className="bg-gray-600 rounded p-2 text-xs">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-white font-medium">
                                Trade #{event.tradeId} - {event.direction}
                              </span>
                              <span className="text-yellow-400 font-mono">
                                {event.trigger}
                              </span>
                            </div>
                            <div className="text-gray-300">
                              Adjustment: {event.adjustment}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {event.date} {event.time}
                            </div>
                  </div>
                        ))}
                </div>
              </CardContent>
            </Card>
                )}

                {detailedEvents.tpNearMisses.length === 0 && 
                 detailedEvents.fillNearMisses.length === 0 && 
                 detailedEvents.slAdjustments.length === 0 && (
                  <div className="text-center text-gray-400 py-4">No events recorded</div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="trades" className="space-y-3 mt-3 flex-1 overflow-y-auto">
            {loadingTrades ? (
              <div className="text-center text-gray-400 py-4">Loading trade analysis...</div>
            ) : detailedTrades.length > 0 ? (
              <Card className="bg-gray-700 border-gray-600">
                <CardContent className="p-3">
                  <h3 className="text-white flex items-center gap-2 text-sm mb-3">
                    <BarChart3 className="h-4 w-4" />
                    Trade Analysis ({detailedTrades.length} trades)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="text-left py-1 text-gray-300 font-medium">Trade</th>
                          <th className="text-left py-1 text-gray-300 font-medium">Line</th>
                          <th className="text-right py-1 text-gray-300 font-medium">Max Profit</th>
                          <th className="text-right py-1 text-gray-300 font-medium">Max Loss</th>
                          <th className="text-right py-1 text-gray-300 font-medium">Actual PNL</th>
                          <th className="text-right py-1 text-gray-300 font-medium">Profit vs Target</th>
                          <th className="text-right py-1 text-gray-300 font-medium">Loss vs Stop</th>
                          <th className="text-right py-1 text-gray-300 font-medium">Efficiency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailedTrades.map((trade, index) => (
                          <tr key={index} className="border-b border-gray-600 hover:bg-gray-600/50">
                            <td className="py-1 text-gray-300">
                              #{trade.tradeId}<br />
                              <span className="text-gray-400 text-xs">{trade.direction}</span>
                            </td>
                            <td className="py-1 text-gray-300 text-xs">{trade.line}</td>
                            <td className={`py-1 text-right font-medium ${trade.maxProfit > 0 ? 'text-green-500' : 'text-gray-400'}`}>
                              {trade.maxProfit.toFixed(1)}pts
                            </td>
                            <td className={`py-1 text-right font-medium ${trade.maxLoss < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                              {trade.maxLoss.toFixed(1)}pts
                            </td>
                            <td className={`py-1 text-right font-medium ${trade.actualPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {formatCurrency(trade.actualPnl)}
                            </td>
                            <td className={`py-1 text-right font-medium ${trade.maxProfitVsTarget > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                              {trade.maxProfitVsTarget > 0 ? `+${trade.maxProfitVsTarget.toFixed(1)}` : '0.0'}
                            </td>
                            <td className={`py-1 text-right font-medium ${trade.maxLossVsStop > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                              {trade.maxLossVsStop > 0 ? `+${trade.maxLossVsStop.toFixed(1)}` : '0.0'}
                            </td>
                            <td className={`py-1 text-right font-medium ${trade.profitEfficiency > 0.8 ? 'text-green-400' : trade.profitEfficiency > 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {formatPercentage(trade.profitEfficiency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
          </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center text-gray-400 py-4">No trade analysis available</div>
            )}
          </TabsContent>

          <TabsContent value="daily" className="space-y-3 mt-3 flex-1 overflow-y-auto">
          <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-3">
                <h3 className="text-white flex items-center gap-2 text-sm mb-3">
                  <Calendar className="h-4 w-4" />
                  Daily PNL History
                  <Badge variant="outline" className="text-xs">{runDailyPnl.length} days</Badge>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="text-left py-1 text-gray-300 font-medium">Date</th>
                        <th className="text-right py-1 text-gray-300 font-medium">Final PNL</th>
                        <th className="text-right py-1 text-gray-300 font-medium">Intraday High</th>
                        <th className="text-right py-1 text-gray-300 font-medium">Intraday Low</th>
                        <th className="text-right py-1 text-gray-300 font-medium">Trades</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runDailyPnl.map((day, index) => (
                        <tr key={index} className="border-b border-gray-600 hover:bg-gray-600/50">
                          <td className="py-1 text-gray-300">{formatDateOnly(day.date)}</td>
                          <td className={`py-1 text-right font-medium ${day.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatCurrency(day.pnl)}
                          </td>
                          <td className={`py-1 text-right font-medium ${day.highest_intraday_pnl !== null && day.highest_intraday_pnl !== undefined && day.highest_intraday_pnl >= 0 ? 'text-green-400' : day.highest_intraday_pnl !== null && day.highest_intraday_pnl !== undefined ? 'text-red-400' : 'text-gray-400'}`}>
                            {formatCurrency(day.highest_intraday_pnl)}
                          </td>
                          <td className={`py-1 text-right font-medium ${day.lowest_intraday_pnl !== null && day.lowest_intraday_pnl !== undefined && day.lowest_intraday_pnl >= 0 ? 'text-green-400' : day.lowest_intraday_pnl !== null && day.lowest_intraday_pnl !== undefined ? 'text-red-400' : 'text-gray-400'}`}>
                            {formatCurrency(day.lowest_intraday_pnl)}
                          </td>
                          <td className="py-1 text-right text-gray-300">{day.trades}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="params" className="space-y-3 mt-3 flex-1 overflow-y-auto">
            {Object.keys(parameterCategories).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(parameterCategories).map(([categoryName, parameters]) => (
                  <Card key={categoryName} className="bg-gray-700 border-gray-600">
                    <CardContent className="p-3">
                      <h3 className="text-white flex items-center gap-2 text-sm mb-3">
                        <Settings className="h-4 w-4" />
                        {categoryName}
                        <Badge variant="outline" className="text-xs">{parameters.length} params</Badge>
                  </h3>
                  <div className="grid grid-cols-1 gap-1">
                        {parameters.map((param, index) => {
                          // Special styling for Morning Lines enabled/disabled
                          const isMorningLinesEnabled = param.parameter_name === 'Morning Lines' && param.parameter_value === 'True';
                          const isMorningLinesDisabled = param.parameter_name === 'Morning Lines' && param.parameter_value === 'False';
                          
                          return (
                            <div key={index} className={`flex justify-between items-center py-1.5 px-2 rounded ${
                              isMorningLinesEnabled ? 'bg-green-900/30 border border-green-600' :
                              isMorningLinesDisabled ? 'bg-red-900/30 border border-red-600' :
                              'bg-gray-600'
                            }`}>
                              <span className={`text-xs ${
                                isMorningLinesEnabled ? 'text-green-300' :
                                isMorningLinesDisabled ? 'text-red-300' :
                                'text-gray-300'
                              }`}>
                                {param.parameter_name}
                              </span>
                              <span className={`font-mono px-1.5 py-0.5 rounded text-xs ${
                                isMorningLinesEnabled ? 'bg-green-800 text-green-200' :
                                isMorningLinesDisabled ? 'bg-red-800 text-red-200' :
                                'bg-gray-800 text-white'
                              }`}>
                                {param.parameter_value}
                              </span>
                            </div>
                          );
                        })}
                  </div>
                </CardContent>
            </Card>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-4">No parameters available</div>
          )}
          </TabsContent>

          <TabsContent value="raw" className="space-y-3 mt-3 flex-1 overflow-y-auto">
            {loadingRawData ? (
              <div className="text-center text-gray-400 py-4">Loading raw data...</div>
            ) : rawDataError ? (
              <div className="text-center text-red-400 py-4">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Error loading raw data</p>
                <p className="text-xs text-red-300 mt-1">{rawDataError}</p>
              </div>
            ) : rawData ? (
              <Card className="bg-gray-700 border-gray-600">
                <CardContent className="p-3">
                  <h3 className="text-white flex items-center gap-2 text-sm mb-3">
                    <FileText className="h-4 w-4" />
                    Original Raw Data
                    <Badge variant="outline" className="text-xs">
                      {rawData.length} characters
                    </Badge>
                  </h3>
                  <div className="bg-gray-900 border border-gray-600 rounded p-3 max-h-96 overflow-y-auto">
                    <pre className="text-gray-300 text-xs whitespace-pre-wrap font-mono leading-relaxed">
                      {rawData}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center text-gray-400 py-4">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No raw data available</p>
                <p className="text-xs text-gray-500 mt-1">
                  This run was created before raw data storage was implemented
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
