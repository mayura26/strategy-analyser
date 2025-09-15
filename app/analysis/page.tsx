'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, BarChart3, Settings, TrendingUp, Calendar, Trash2, Eye, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [viewingRunDetails, setViewingRunDetails] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<{ [runId: number]: { dailyPnl: boolean; parameters: boolean } }>({});

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
        
        // Fetch daily PNL data for all runs to show date ranges
        data.runs.forEach((run: Run) => {
          if (!dailyPnlData[run.id]) {
            fetchDailyPnl(run.id);
          }
        });
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

  const getDataDateRange = (runId: number) => {
    const dailyPnl = dailyPnlData[runId];
    if (!dailyPnl || dailyPnl.length === 0) {
      return 'Loading...';
    }
    
    const dates = dailyPnl.map(day => new Date(day.date)).sort((a, b) => a.getTime() - b.getTime());
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  };

  const toggleSection = (runId: number, section: 'dailyPnl' | 'parameters') => {
    setExpandedSections(prev => ({
      ...prev,
      [runId]: {
        ...prev[runId],
        [section]: !prev[runId]?.[section]
      }
    }));
  };

  const groupParametersByCategory = (parameters: Parameter[]) => {
    const categories = [
      {
        name: 'Main Parameters',
        keywords: ['Trade Quantity', 'Max Gain', 'Max Loss', 'Max Consecutive Losses', 'Loss Cut Off', 'Full Take Profit', 'Full Stop Loss']
      },
      {
        name: 'Entry Logic',
        keywords: ['Min Distance From Line', 'Max Distance From Line', 'Entry Offset', 'Line Cross Bar Count', 'Upside Short Trades', 'Downside Long Trades']
      },
      {
        name: 'Position Management',
        keywords: ['Dynamic Trim', 'Trim Percent', 'Trim Take Profit', 'SL Adjustment', 'X1', 'X2', 'SL Levels', 'L1', 'L2']
      },
      {
        name: 'Time Parameters',
        keywords: ['Start Time', 'End Time']
      },
      {
        name: 'Protective Functions',
        keywords: ['Trade Completion Protect']
      },
      {
        name: 'Magic Lines',
        keywords: ['Upside Levels', 'Downside Levels', 'Mini Mode', 'Instrument']
      }
    ];

    const groupedCategories = categories.map(category => ({
      name: category.name,
      parameters: parameters.filter(param => 
        category.keywords.some(keyword => 
          param.parameter_name.toLowerCase().includes(keyword.toLowerCase())
        )
      )
    })).filter(category => category.parameters.length > 0);

    // Add any remaining parameters that don't fit into categories
    const categorizedParams = groupedCategories.flatMap(cat => cat.parameters.map(p => p.parameter_name));
    const remainingParams = parameters.filter(param => !categorizedParams.includes(param.parameter_name));
    
    if (remainingParams.length > 0) {
      groupedCategories.push({
        name: 'Other Parameters',
        parameters: remainingParams
      });
    }

    return groupedCategories;
  };

  const handleViewRunDetails = async (runId: number) => {
    setViewingRunDetails(runId);
    
    // Ensure we have the daily PNL data for this run
    if (!dailyPnlData[runId]) {
      await fetchDailyPnl(runId);
    }
    
    // Ensure we have the parameters for this run
    if (!parameters[runId]) {
      await fetchParameters(runId);
    }
  };

  const RunDetailsDialog = ({ run }: { run: Run }) => {
    const runDailyPnl = dailyPnlData[run.id] || [];
    const runParameters = parameters[run.id] || [];
    const isDailyPnlExpanded = expandedSections[run.id]?.dailyPnl || false;
    const isParametersExpanded = expandedSections[run.id]?.parameters || false;
    
    // Calculate additional stats from daily PNL
    const totalTrades = runDailyPnl.reduce((sum, day) => sum + day.trades, 0);
    const bestDay = runDailyPnl.reduce((best, day) => day.pnl > best ? day.pnl : best, 0);
    const worstDay = runDailyPnl.reduce((worst, day) => day.pnl < worst ? day.pnl : worst, 0);
    const winningDays = runDailyPnl.filter(day => day.pnl > 0).length;
    const losingDays = runDailyPnl.filter(day => day.pnl < 0).length;

    return (
      <Dialog open={viewingRunDetails === run.id} onOpenChange={(open) => !open && setViewingRunDetails(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-gray-800 border-gray-700">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-white text-lg">{run.run_name || `Run ${run.id}`}</DialogTitle>
            <DialogDescription className="text-gray-300 text-sm">
              Submitted: {new Date(run.created_at).toLocaleDateString()} • Data: {getDataDateRange(run.id)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Headline Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">Net PNL</div>
                      <div className={`text-xl font-bold ${
                        run.net_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(run.net_pnl)}
                      </div>
                    </div>
                    <TrendingUp className={`h-6 w-6 ${
                      run.net_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">Profit Factor</div>
                      <div className="text-xl font-bold text-blue-400">
                        {run.profit_factor ? run.profit_factor.toFixed(2) : 'N/A'}
                      </div>
                    </div>
                    <BarChart3 className="h-6 w-6 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">Win Rate</div>
                      <div className="text-xl font-bold text-green-400">
                        {run.win_rate ? formatPercentage(run.win_rate) : 'N/A'}
                      </div>
                    </div>
                    <Calendar className="h-6 w-6 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">Total Trades</div>
                      <div className="text-xl font-bold text-white">
                        {run.total_trades || 0}
                      </div>
                    </div>
                    <Settings className="h-6 w-6 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily PNL Section */}
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-600 transition-colors py-3"
                onClick={() => toggleSection(run.id, 'dailyPnl')}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2 text-base">
                    Daily PNL History
                    <Badge variant="outline" className="text-xs">
                      {runDailyPnl.length} days
                    </Badge>
                  </CardTitle>
                  {isDailyPnlExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </CardHeader>
              {isDailyPnlExpanded && (
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="text-left py-3 text-gray-300 font-medium">Date</th>
                          <th className="text-right py-3 text-gray-300 font-medium">PNL</th>
                          <th className="text-right py-3 text-gray-300 font-medium">Trades</th>
                          <th className="text-right py-3 text-gray-300 font-medium">Running Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {runDailyPnl.map((day, index) => (
                          <tr key={index} className="border-b border-gray-600 hover:bg-gray-600/50">
                            <td className="py-3 text-gray-300">{day.date}</td>
                            <td className={`py-3 text-right font-medium ${
                              day.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {formatCurrency(day.pnl)}
                            </td>
                            <td className="py-3 text-right text-gray-300">{day.trades}</td>
                            <td className="py-3 text-right text-gray-300">
                              {formatCurrency(runDailyPnl.slice(0, index + 1).reduce((sum, d) => sum + d.pnl, 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Parameters Section */}
            {runParameters.length > 0 && (
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-600 transition-colors py-3"
                  onClick={() => toggleSection(run.id, 'parameters')}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2 text-base">
                      Strategy Parameters
                      <Badge variant="outline" className="text-xs">
                        {runParameters.length} params
                      </Badge>
                    </CardTitle>
                    {isParametersExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
                {isParametersExpanded && (
                  <CardContent>
                    <div className="space-y-4">
                      {groupParametersByCategory(runParameters).map((category, categoryIndex) => (
                        <div key={categoryIndex}>
                          <h4 className="text-white font-semibold mb-2 pb-1 border-b border-gray-600 text-sm">
                            {category.name}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {category.parameters.map((param, paramIndex) => (
                              <div key={paramIndex} className="flex justify-between items-center py-2 px-3 bg-gray-600 rounded">
                                <span className="text-gray-300 font-medium text-sm">{param.parameter_name}</span>
                                <span className="text-white font-mono bg-gray-800 px-2 py-1 rounded text-xs">
                                  {param.parameter_value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
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
                        <div className="text-sm text-gray-400 space-y-1">
                          <p>Submitted: {new Date(run.created_at).toLocaleDateString()}</p>
                          <p>Data: {getDataDateRange(run.id)}</p>
                        </div>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewRunDetails(run.id);
                          }}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
      
      {/* Run Details Dialogs */}
      {runs.map((run) => (
        <RunDetailsDialog key={run.id} run={run} />
      ))}
    </div>
  );
}
