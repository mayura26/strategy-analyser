'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart3, Settings, Calendar, Activity, Target } from 'lucide-react';

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
}

interface DailyPnl {
  date: string;
  pnl: number;
  trades: number;
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
  savingDescription
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

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  // Fetch data when dialog opens
  useEffect(() => {
    if (isOpen && run.id) {
      fetchMetrics();
      fetchEvents();
      fetchTrades();
    }
  }, [isOpen, run.id]);

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

  const handleSave = async () => {
    if (!onSaveDescription) return;
    await onSaveDescription(run.id);
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
      'Magic Lines': [],
      'Other': []
    };

    runParameters.forEach(param => {
      const name = param.parameter_name.toLowerCase();
      
      if (name.includes('trade quantity') || name.includes('max gain') || name.includes('max loss') || 
          name.includes('consecutive') || name.includes('loss cut') || name.includes('take profit') || 
          name.includes('stop loss')) {
        categories['Main Parameters'].push(param);
      } else if (name.includes('distance') || name.includes('offset') || name.includes('bar count') || 
                 name.includes('upside') || name.includes('downside')) {
        categories['Entry Logic'].push(param);
      } else if (name.includes('trim') || name.includes('adjustment') || name.includes('x1') || 
                 name.includes('x2') || name.includes('l1') || name.includes('l2')) {
        categories['Position Management'].push(param);
      } else if (name.includes('time') || name.includes('start') || name.includes('end')) {
        categories['Time Parameters'].push(param);
      } else if (name.includes('level') || name.includes('mini mode') || name.includes('instrument')) {
        categories['Magic Lines'].push(param);
      } else {
        categories['Other'].push(param);
      }
    });

    // Remove empty categories
    return Object.fromEntries(
      Object.entries(categories).filter(([_, params]) => params.length > 0)
    );
  };

  const parameterCategories = organizeParametersByCategory();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] bg-gray-800 border-gray-700 flex flex-col">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-blue-600/20 border-blue-500 text-blue-300 text-xs px-2 py-0.5">
              Run #{run.id}
            </Badge>
            <DialogTitle className="text-white text-base">{run.run_name || `Run ${run.id}`}</DialogTitle>
          </div>
          <p className="text-gray-300 text-xs">
            Submitted: {formatDate(run.created_at)}
          </p>
          
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
        
        <Tabs defaultValue="overview" className="w-full flex flex-col flex-1 min-h-0">
          <TabsList className="grid w-full grid-cols-6 bg-gray-700 flex-shrink-0">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="lines" className="text-xs">Magic Lines</TabsTrigger>
            <TabsTrigger value="events" className="text-xs">Events</TabsTrigger>
            <TabsTrigger value="trades" className="text-xs">Trade Analysis</TabsTrigger>
            <TabsTrigger value="daily" className="text-xs">Daily PNL</TabsTrigger>
            <TabsTrigger value="params" className="text-xs">Parameters</TabsTrigger>
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
                {Object.entries(lineMetrics).map(([lineName, metrics]) => (
                  <Card key={lineName} className="bg-gray-700 border-gray-600">
              <CardContent className="p-3">
                      <h3 className="text-white flex items-center gap-2 text-sm mb-3">
                        <Target className="h-4 w-4" />
                        {lineName}
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {metrics.map((metric, index) => {
                          const metricType = metric.metric_name.split(' - ')[1];
                          const isPercentage = metricType.includes('Rate');
                          const isCurrency = metricType.includes('PNL') || metricType.includes('Profit') || metricType.includes('Loss');
                          
                          return (
                            <div key={index} className="flex justify-between items-center py-1.5 px-2 bg-gray-600 rounded">
                              <span className="text-gray-300 text-xs">{metricType}</span>
                              <span className="text-white font-mono bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                                {isPercentage ? formatPercentage(metric.metric_value) : 
                                 isCurrency ? formatCurrency(metric.metric_value) : 
                                 metric.metric_value}
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
                        <th className="text-right py-1 text-gray-300 font-medium">PNL</th>
                        <th className="text-right py-1 text-gray-300 font-medium">Trades</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runDailyPnl.map((day, index) => (
                        <tr key={index} className="border-b border-gray-600 hover:bg-gray-600/50">
                          <td className="py-1 text-gray-300">{day.date}</td>
                          <td className={`py-1 text-right font-medium ${day.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatCurrency(day.pnl)}
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
                        {parameters.map((param, index) => (
                      <div key={index} className="flex justify-between items-center py-1.5 px-2 bg-gray-600 rounded">
                        <span className="text-gray-300 text-xs">{param.parameter_name}</span>
                        <span className="text-white font-mono bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                          {param.parameter_value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
            </Card>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-4">No parameters available</div>
          )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
