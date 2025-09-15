'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, BarChart3, Settings, TrendingUp, Calendar, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Strategy {
  id: number;
  name: string;
  description: string;
  run_count: number;
  avg_net_pnl: number;
  best_net_pnl: number;
  worst_net_pnl: number;
}

interface Run {
  id: number;
  run_name: string;
  net_pnl: number;
  total_trades: number;
  win_rate: number;
  profit_factor: number;
  max_drawdown: number;
  sharpe_ratio: number;
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
  parameter_type: string;
}

export default function AnalysisPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [selectedRuns, setSelectedRuns] = useState<number[]>([]);
  const [dailyPnlData, setDailyPnlData] = useState<{ [runId: number]: DailyPnl[] }>({});
  const [parameters, setParameters] = useState<{ [runId: number]: Parameter[] }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [deletingRun, setDeletingRun] = useState<number | null>(null);

  useEffect(() => {
    fetchStrategies();
  }, []);

  useEffect(() => {
    if (selectedStrategy) {
      fetchRuns(selectedStrategy);
    }
  }, [selectedStrategy]);

  const fetchStrategies = async () => {
    try {
      const response = await fetch('/api/strategies');
      const data = await response.json();
      if (data.success) {
        setStrategies(data.strategies);
      }
    } catch (error) {
      console.error('Error fetching strategies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRuns = async (strategyId: string) => {
    try {
      const response = await fetch(`/api/runs?strategyId=${strategyId}`);
      const data = await response.json();
      if (data.success) {
        setRuns(data.runs);
      }
    } catch (error) {
      console.error('Error fetching runs:', error);
    }
  };

  const fetchDailyPnl = async (runId: number) => {
    try {
      const response = await fetch(`/api/runs/${runId}/daily-pnl`);
      const data = await response.json();
      if (data.success) {
        setDailyPnlData(prev => ({
          ...prev,
          [runId]: data.dailyPnl
        }));
      }
    } catch (error) {
      console.error('Error fetching daily PNL:', error);
    }
  };

  const fetchParameters = async (runId: number) => {
    try {
      const response = await fetch(`/api/runs/${runId}/parameters`);
      const data = await response.json();
      if (data.success) {
        setParameters(prev => ({
          ...prev,
          [runId]: data.parameters
        }));
      }
    } catch (error) {
      console.error('Error fetching parameters:', error);
    }
  };

  const handleRunSelect = (runId: number) => {
    setSelectedRuns(prev => {
      const newSelection = prev.includes(runId) 
        ? prev.filter(id => id !== runId)
        : [...prev, runId];
      
      // Fetch data for newly selected runs
      newSelection.forEach(id => {
        if (!dailyPnlData[id]) {
          fetchDailyPnl(id);
        }
        if (!parameters[id]) {
          fetchParameters(id);
        }
      });
      
      return newSelection;
    });
  };

  const handleDeleteRun = async (runId: number) => {
    setDeletingRun(runId);
    
    try {
      const response = await fetch(`/api/runs?runId=${runId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setRuns(prev => prev.filter(run => run.id !== runId));
        setSelectedRuns(prev => prev.filter(id => id !== runId));
        
        // Clean up related data
        const newDailyPnlData = { ...dailyPnlData };
        delete newDailyPnlData[runId];
        setDailyPnlData(newDailyPnlData);
        
        const newParameters = { ...parameters };
        delete newParameters[runId];
        setParameters(newParameters);
      } else {
        alert('Failed to delete run. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting run:', error);
      alert('Failed to delete run. Please try again.');
    } finally {
      setDeletingRun(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-white">Strategy Analysis</h1>
        <p className="text-gray-300">
          Compare strategy runs and analyze performance metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white">Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
              <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-600">
                {strategies.map((strategy) => (
                  <SelectItem key={strategy.id} value={strategy.id.toString()} className="text-white">
                    {strategy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{runs.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white">Avg Net PNL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {runs.length > 0 ? formatCurrency(runs.reduce((sum, run) => sum + run.net_pnl, 0) / runs.length) : '$0.00'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white">Selected Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{selectedRuns.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="runs" className="space-y-6">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="runs" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">Runs Overview</TabsTrigger>
          <TabsTrigger value="comparison" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">Run Comparison</TabsTrigger>
          <TabsTrigger value="charts" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">Performance Charts</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Strategy Runs</CardTitle>
              <CardDescription className="text-gray-300">
                Select runs to compare their performance and parameters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {runs.map((run) => (
                  <div
                    key={run.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      selectedRuns.includes(run.id)
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => handleRunSelect(run.id)}
                      >
                        <h3 className="font-semibold text-white">
                          {run.run_name || `Run ${run.id}`}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {new Date(run.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            run.net_pnl >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(run.net_pnl)}
                          </div>
                          <div className="text-sm text-gray-400">
                            {run.total_trades} trades
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Run</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{run.run_name || `Run ${run.id}`}"? 
                                This action cannot be undone and will permanently remove all data 
                                associated with this run including daily PNL, parameters, and metrics.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteRun(run.id)}
                                disabled={deletingRun === run.id}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {deletingRun === run.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  'Delete Run'
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Badge variant="outline">
                        Win Rate: {run.win_rate ? formatPercentage(run.win_rate) : 'N/A'}
                      </Badge>
                      <Badge variant="outline">
                        Profit Factor: {run.profit_factor ? run.profit_factor.toFixed(2) : 'N/A'}
                      </Badge>
                      <Badge variant="outline">
                        Max DD: {run.max_drawdown ? formatCurrency(run.max_drawdown) : 'N/A'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          {selectedRuns.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {selectedRuns.map((runId) => {
                const run = runs.find(r => r.id === runId);
                const runParameters = parameters[runId] || [];
                
                return (
                  <Card key={runId}>
                    <CardHeader>
                      <CardTitle>{run?.run_name || `Run ${runId}`}</CardTitle>
                      <CardDescription>
                        {run && new Date(run.created_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Net PNL</h4>
                          <p className={`text-lg font-bold ${
                            (run?.net_pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {run ? formatCurrency(run.net_pnl) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Total Trades</h4>
                          <p className="text-lg font-bold">{run?.total_trades || 'N/A'}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Win Rate</h4>
                          <p className="text-lg font-bold">
                            {run?.win_rate ? formatPercentage(run.win_rate) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Profit Factor</h4>
                          <p className="text-lg font-bold">{run?.profit_factor?.toFixed(2) || 'N/A'}</p>
                        </div>
                      </div>
                      
                      {runParameters.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Parameters</h4>
                          <div className="space-y-1">
                            {runParameters.map((param, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{param.parameter_name}:</span>
                                <span className="font-mono">{param.parameter_value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Select runs to compare their performance and parameters.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          {selectedRuns.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Daily PNL Comparison</CardTitle>
                <CardDescription>
                  Compare daily performance across selected runs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(value), 'PNL']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      {selectedRuns.map((runId, index) => {
                        const run = runs.find(r => r.id === runId);
                        const data = dailyPnlData[runId] || [];
                        const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];
                        
                        return (
                          <Line
                            key={runId}
                            type="monotone"
                            dataKey="pnl"
                            data={data}
                            stroke={colors[index % colors.length]}
                            strokeWidth={2}
                            name={run?.run_name || `Run ${runId}`}
                            connectNulls={false}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Select runs to view performance charts.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
