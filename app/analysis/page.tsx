'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2,  Settings, Trash2, Eye, GitMerge} from 'lucide-react';
import { toast } from 'sonner';
import {  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts';
import { RunDetailsDialog } from '@/components/RunDetailsDialog';
import { formatDateOnly, formatDateRange, getDateRangeFromStrings, findOverlappingDates } from '@/lib/date-utils';

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
  run_description?: string;
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
  const [showOverlapOnly, setShowOverlapOnly] = useState(false);
  const [showAllParameters, setShowAllParameters] = useState(false);
  const [dateRangeWarnings, setDateRangeWarnings] = useState<string[]>([]);
  const [editingDescription, setEditingDescription] = useState<{ [runId: number]: string }>({});
  const [localDescription, setLocalDescription] = useState<{ [runId: number]: string }>({});
  const [savingDescription, setSavingDescription] = useState<number | null>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeValidation, setMergeValidation] = useState<any>(null);
  const [mergingRuns, setMergingRuns] = useState(false);
  const [mergedRunName, setMergedRunName] = useState('');
  const [mergedRunDescription, setMergedRunDescription] = useState('');

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
      
      // Validate date ranges for the new selection
      if (newSelection.length > 1) {
        const warnings = validateDateRanges(newSelection);
        setDateRangeWarnings(warnings);
      } else {
        setDateRangeWarnings([]);
      }
      
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
        toast.error('Failed to delete run. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting run:', error);
      toast.error('Failed to delete run. Please try again.');
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
    
    const dates = dailyPnl.map(day => day.date);
    const dateRange = getDateRangeFromStrings(dates);
    
    if (!dateRange) return 'Loading...';
    
    return formatDateRange(dateRange.start, dateRange.end);
  };

  const getDateRangeForRun = (runId: number) => {
    const dailyPnl = dailyPnlData[runId];
    if (!dailyPnl || dailyPnl.length === 0) {
      return null;
    }
    
    const dates = dailyPnl.map(day => day.date);
    const dateRange = getDateRangeFromStrings(dates);
    
    if (!dateRange) return null;
    
    return {
      start: dateRange.start,
      end: dateRange.end,
      dates: dates
    };
  };

  const getOverlappingDateRange = (runIds: number[]) => {
    if (runIds.length === 0) return null;
    
    const dateRanges = runIds.map(runId => getDateRangeForRun(runId)).filter(Boolean);
    if (dateRanges.length === 0) return null;
    
    // Find the intersection of all date ranges using string comparison
    const latestStart = dateRanges.reduce((latest, range) => 
      range!.start > latest ? range!.start : latest, dateRanges[0]!.start
    );
    const earliestEnd = dateRanges.reduce((earliest, range) => 
      range!.end < earliest ? range!.end : earliest, dateRanges[0]!.end
    );
    
    if (latestStart > earliestEnd) {
      return null; // No overlap
    }
    
    // Find common dates across all runs
    const allDateArrays = dateRanges.map(range => range!.dates);
    const commonDates = findOverlappingDates(allDateArrays);
    
    return {
      start: latestStart,
      end: earliestEnd,
      dates: commonDates
    };
  };

  const validateDateRanges = (runIds: number[]) => {
    const warnings: string[] = [];
    
    if (runIds.length < 2) return warnings;
    
    const dateRanges = runIds.map(runId => getDateRangeForRun(runId)).filter(Boolean);
    if (dateRanges.length < 2) return warnings;
    
    // Check if all runs have the same date range
    const firstRange = dateRanges[0]!;
    const allSameRange = dateRanges.every(range => 
      range!.start === firstRange.start && 
      range!.end === firstRange.end
    );
    
    if (!allSameRange) {
      warnings.push('Selected runs have different date ranges. Consider enabling "Show Overlap Only" for accurate comparison.');
      
      // Check for no overlap
      const overlap = getOverlappingDateRange(runIds);
      if (!overlap) {
        warnings.push('Selected runs have no overlapping dates. Comparison may not be meaningful.');
      } else {
        const overlapDays = overlap.dates.length;
        const totalDays = Math.max(...dateRanges.map(range => range!.dates.length));
        const overlapPercentage = (overlapDays / totalDays) * 100;
        
        if (overlapPercentage < 50) {
          warnings.push(`Only ${overlapPercentage.toFixed(1)}% of data overlaps. Consider selecting runs with more similar date ranges.`);
        }
      }
    }
    
    return warnings;
  };

  const toggleSection = useCallback((runId: number, section: 'dailyPnl' | 'parameters') => {
    setExpandedSections(prev => ({
      ...prev,
      [runId]: {
        ...prev[runId],
        [section]: !prev[runId]?.[section]
      }
    }));
  }, []);

  const getFilteredChartData = () => {
    if (selectedRuns.length === 0) return [];
    
    let allDates: string[];
    
    if (showOverlapOnly) {
      const overlap = getOverlappingDateRange(selectedRuns);
      if (!overlap) return [];
      allDates = overlap.dates;
    } else {
      // Get all unique dates from selected runs
      const dateSet = new Set<string>();
      selectedRuns.forEach(runId => {
        const data = dailyPnlData[runId] || [];
        data.forEach(day => dateSet.add(day.date));
      });
      allDates = Array.from(dateSet).sort();
    }
    
    // Sort runs by ID for consistent ordering
    const sortedRuns = [...selectedRuns].sort((a, b) => a - b);
    
    return allDates.map(date => {
      const dataPoint: any = { date: formatDateOnly(date) };
      sortedRuns.forEach((runId, index) => {
        const run = runs.find(r => r.id === runId);
        const runData = dailyPnlData[runId] || [];
        const dayData = runData.find(day => day.date === date);
        dataPoint[`run_${runId}`] = dayData ? dayData.pnl : 0;
      });
      return dataPoint;
    });
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

  const compareParameters = (runIds: number[]) => {
    if (runIds.length < 2) return { changed: [], unchanged: [] };

    const allParameters: { [paramName: string]: { [runId: number]: string } } = {};
    
    // Collect all parameters from all runs
    runIds.forEach(runId => {
      const runParams = parameters[runId] || [];
      runParams.forEach(param => {
        if (!allParameters[param.parameter_name]) {
          allParameters[param.parameter_name] = {};
        }
        allParameters[param.parameter_name][runId] = param.parameter_value;
      });
    });

    const changed: string[] = [];
    const unchanged: string[] = [];

    // Compare each parameter across runs
    Object.entries(allParameters).forEach(([paramName, valuesByRun]) => {
      const uniqueValues = new Set(Object.values(valuesByRun));
      if (uniqueValues.size > 1) {
        changed.push(paramName);
      } else {
        unchanged.push(paramName);
      }
    });

    return { changed, unchanged };
  };

  const getParameterValue = (runId: number, paramName: string) => {
    const runParams = parameters[runId] || [];
    const param = runParams.find(p => p.parameter_name === paramName);
    return param ? param.parameter_value : 'N/A';
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

  const handleDescriptionChange = useCallback((runId: number, value: string) => {
    setLocalDescription(prev => ({
      ...prev,
      [runId]: value
    }));
  }, []);

  const handleStartEdit = useCallback((runId: number) => {
    const run = runs.find(r => r.id === runId);
    setEditingDescription(prev => ({
      ...prev,
      [runId]: run?.run_description || ''
    }));
    setLocalDescription(prev => ({
      ...prev,
      [runId]: run?.run_description || ''
    }));
  }, [runs]);

  const handleCancelEdit = useCallback((runId: number) => {
    setEditingDescription(prev => {
      const newState = { ...prev };
      delete newState[runId];
      return newState;
    });
    setLocalDescription(prev => {
      const newState = { ...prev };
      delete newState[runId];
      return newState;
    });
  }, []);

  const handleSaveDescription = useCallback(async (runId: number) => {
    setSavingDescription(runId);
    
    try {
      const response = await fetch('/api/runs', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          runId,
          runDescription: localDescription[runId] || ''
        }),
      });

      if (response.ok) {
        // Update the local runs state
        setRuns(prev => prev.map(run => 
          run.id === runId 
            ? { ...run, run_description: localDescription[runId] || '' }
            : run
        ));
        
        // Clear the editing state
        setEditingDescription(prev => {
          const newState = { ...prev };
          delete newState[runId];
          return newState;
        });
        
        // Clear the local description state
        setLocalDescription(prev => {
          const newState = { ...prev };
          delete newState[runId];
          return newState;
        });
      } else {
        toast.error('Failed to save description. Please try again.');
      }
    } catch (error) {
      console.error('Error saving description:', error);
      toast.error('Failed to save description. Please try again.');
    } finally {
      setSavingDescription(null);
    }
  }, [localDescription]);

  const handleMergeRuns = useCallback(async () => {
    if (selectedRuns.length < 2) {
      toast.error('Please select at least 2 runs to merge.');
      return;
    }

    setMergingRuns(true);
    
    try {
      // First validate the merge
      const validationResponse = await fetch('/api/runs/merge/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runIds: selectedRuns }),
      });

      const validation = await validationResponse.json();
      
      if (!validationResponse.ok) {
        setMergeValidation(validation);
        setShowMergeDialog(true);
        return;
      }

      // If validation passes, proceed with merge
      const mergeResponse = await fetch('/api/runs/merge/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          runIds: selectedRuns,
          mergedRunName: mergedRunName || `Merged Run (${selectedRuns.join(', ')})`,
          mergedRunDescription: mergedRunDescription || `Merged from runs: ${selectedRuns.join(', ')}`
        }),
      });

      const mergeResult = await mergeResponse.json();
      
      if (mergeResponse.ok) {
        // Refresh the runs list
        await fetchRuns(selectedStrategy);
        
        // Clear selection and merge dialog
        setSelectedRuns([]);
        setShowMergeDialog(false);
        setMergeValidation(null);
        setMergedRunName('');
        setMergedRunDescription('');
        
        toast.success(`Successfully merged runs into run #${mergeResult.mergedRunId}`);
      } else {
        toast.error(`Failed to merge runs: ${mergeResult.error}`);
      }
    } catch (error) {
      console.error('Error merging runs:', error);
      toast.error('Failed to merge runs. Please try again.');
    } finally {
      setMergingRuns(false);
    }
  }, [selectedRuns, selectedStrategy, mergedRunName, mergedRunDescription]);

  const handleValidateMerge = useCallback(async () => {
    if (selectedRuns.length < 2) {
      setMergeValidation({ error: 'Please select at least 2 runs to merge.' });
      setShowMergeDialog(true);
      return;
    }

    try {
      const response = await fetch('/api/runs/merge/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runIds: selectedRuns }),
      });

      const validation = await response.json();
      setMergeValidation(validation);
      setShowMergeDialog(true);
    } catch (error) {
      console.error('Error validating merge:', error);
      setMergeValidation({ error: 'Failed to validate merge. Please try again.' });
      setShowMergeDialog(true);
    }
  }, [selectedRuns]);


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
          {/* Merge Controls for Runs Overview */}
          {selectedRuns.length >= 2 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-semibold">Merge Runs</h4>
                    <p className="text-gray-400 text-sm">
                      {selectedRuns.length} runs selected for merging
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={handleValidateMerge}
                      className="border-blue-500 text-blue-300 hover:bg-blue-900/20"
                    >
                      <GitMerge className="h-4 w-4 mr-2" />
                      Validate Merge
                    </Button>
                    <Button
                      onClick={handleMergeRuns}
                      disabled={mergingRuns}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {mergingRuns ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Merging...
                        </>
                      ) : (
                        <>
                          <GitMerge className="h-4 w-4 mr-2" />
                          Merge Runs
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Strategy Runs</CardTitle>
              <CardDescription className="text-gray-300">
                Select runs to compare their performance and parameters. Select 2 or more runs to enable merging.
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
                        <div className="flex items-center gap-3 mb-2">
                          <Badge 
                            variant="outline" 
                            className="bg-blue-600/20 border-blue-500 text-blue-300 font-bold text-sm px-3 py-1"
                          >
                            Run #{run.id}
                          </Badge>
                        <h3 className="font-semibold text-white">
                          {run.run_name || `Run ${run.id}`}
                        </h3>
                        </div>
                        <div className="text-sm text-gray-400 space-y-1">
                          <p>Submitted: {formatDateOnly(run.created_at)}</p>
                          <p>Data: {getDataDateRange(run.id)}</p>
                          {run.run_description && (
                            <p className="text-gray-300 text-xs leading-relaxed mt-2 p-2 bg-gray-700/30 rounded border border-gray-600">
                              {run.run_description}
                            </p>
                          )}
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
            <div className="space-y-6">
              {/* Merge Controls */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-semibold">Merge Runs</h4>
                      <p className="text-gray-400 text-sm">
                        {selectedRuns.length} runs selected for merging
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={handleValidateMerge}
                        className="border-blue-500 text-blue-300 hover:bg-blue-900/20"
                      >
                        <GitMerge className="h-4 w-4 mr-2" />
                        Validate Merge
                      </Button>
                      <Button
                        onClick={handleMergeRuns}
                        disabled={mergingRuns}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {mergingRuns ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Merging...
                          </>
                        ) : (
                          <>
                            <GitMerge className="h-4 w-4 mr-2" />
                            Merge Runs
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Date Range Warnings */}
              {dateRangeWarnings.length > 0 && (
                <Card className="bg-yellow-900/20 border-yellow-600">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-yellow-400 mt-0.5">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-yellow-400 font-semibold mb-2">Date Range Warning</h4>
                        <ul className="text-yellow-200 text-sm space-y-1">
                          {dateRangeWarnings.map((warning, index) => (
                            <li key={index}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Parameter Changes Summary */}
              {selectedRuns.length > 1 && (() => {
                const paramComparison = compareParameters(selectedRuns);
                return (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        {showAllParameters ? 'Parameter Overview' : 'Parameter Changes Summary'}
                      </CardTitle>
                      <CardDescription className="text-gray-300">
                        {showAllParameters 
                          ? 'Overview of all parameters across selected runs'
                          : 'Overview of parameter differences between selected runs'
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {showAllParameters ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-blue-400 flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                Total Parameters ({paramComparison.changed.length + paramComparison.unchanged.length})
                              </h4>
                              <p className="text-sm text-gray-400">
                                All parameters from selected runs
                              </p>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-red-400 flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                Changed Parameters ({paramComparison.changed.length})
                              </h4>
                              <p className="text-sm text-gray-400">
                                Parameters with different values
                              </p>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-green-400 flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                Unchanged Parameters ({paramComparison.unchanged.length})
                              </h4>
                              <p className="text-sm text-gray-400">
                                Parameters with same values
                              </p>
                            </div>
                          </div>
                          {paramComparison.changed.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-red-400 flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                Changed Parameters List
                              </h4>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {paramComparison.changed.map((paramName, index) => (
                                  <div key={index} className="text-sm text-red-300 bg-red-900/20 px-2 py-1 rounded border border-red-800">
                                    {paramName}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-red-400 flex items-center gap-2">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              Changed Parameters ({paramComparison.changed.length})
                            </h4>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {paramComparison.changed.length > 0 ? (
                                paramComparison.changed.map((paramName, index) => (
                                  <div key={index} className="text-sm text-red-300 bg-red-900/20 px-2 py-1 rounded border border-red-800">
                                    {paramName}
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-gray-400 italic">No parameter changes detected</p>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-green-400 flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              Unchanged Parameters ({paramComparison.unchanged.length})
                            </h4>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {paramComparison.unchanged.length > 0 ? (
                                paramComparison.unchanged.map((paramName, index) => (
                                  <div key={index} className="text-sm text-green-300 bg-green-900/20 px-2 py-1 rounded border border-green-800">
                                    {paramName}
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-gray-400 italic">No unchanged parameters</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Display Options */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-white font-semibold">Display Options</h4>
                      <p className="text-gray-400 text-sm">
                        {showOverlapOnly 
                          ? 'Showing only overlapping dates for accurate comparison'
                          : 'Showing all dates from selected runs'
                        }
                        {selectedRuns.length > 1 && (
                          <span className="block">
                            {showAllParameters 
                              ? 'Showing all parameters for each run'
                              : 'Showing only changed parameters between runs'
                            }
                          </span>
                        )}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Chart Display Option */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-300">
                            Show Overlap Only
                          </label>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${showOverlapOnly ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'border-gray-600 text-gray-400'}`}
                          >
                            {showOverlapOnly ? 'ON' : 'OFF'}
                          </Badge>
                        </div>
                        <div className="relative">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="1"
                            value={showOverlapOnly ? 1 : 0}
                            onChange={(e) => setShowOverlapOnly(e.target.value === '1')}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                            style={{
                              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${showOverlapOnly ? '100%' : '0%'}, #374151 ${showOverlapOnly ? '100%' : '0%'}, #374151 100%)`
                            }}
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>All Dates</span>
                            <span>Overlap Only</span>
                          </div>
                        </div>
                        {getOverlappingDateRange(selectedRuns) && (
                          <div className="text-xs text-blue-400">
                            {getOverlappingDateRange(selectedRuns)?.dates.length} overlapping days available
                          </div>
                        )}
                      </div>

                      {/* Parameter Display Option */}
                      {selectedRuns.length > 1 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-300">
                              Show All Parameters
                            </label>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${showAllParameters ? 'bg-green-600/20 border-green-500 text-green-300' : 'border-gray-600 text-gray-400'}`}
                            >
                              {showAllParameters ? 'ON' : 'OFF'}
                            </Badge>
                          </div>
                          <div className="relative">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="1"
                              value={showAllParameters ? 1 : 0}
                              onChange={(e) => setShowAllParameters(e.target.value === '1')}
                              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                              style={{
                                background: `linear-gradient(to right, #10b981 0%, #10b981 ${showAllParameters ? '100%' : '0%'}, #374151 ${showAllParameters ? '100%' : '0%'}, #374151 100%)`
                              }}
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>Changes Only</span>
                              <span>All Parameters</span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400">
                            {showAllParameters ? 'Viewing complete parameter sets' : 'Focusing on differences'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {selectedRuns.map((runId) => {
                const run = runs.find(r => r.id === runId);
                const runParameters = parameters[runId] || [];
                
                return (
                  <Card key={runId} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge 
                          variant="outline" 
                          className="bg-blue-600/20 border-blue-500 text-blue-300 font-bold text-sm px-3 py-1"
                        >
                          Run #{runId}
                        </Badge>
                        <CardTitle className="text-white">{run?.run_name || `Run ${runId}`}</CardTitle>
                      </div>
                      <CardDescription className="text-gray-300">
                        {run && formatDateOnly(run.created_at)}
                      </CardDescription>
                      {run?.run_description && (
                        <div className="mt-2 p-2 bg-gray-700/30 rounded border border-gray-600">
                          <p className="text-gray-300 text-xs leading-relaxed">{run.run_description}</p>
                        </div>
                      )}
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
                      
                      {runParameters.length > 0 && (() => {
                        const paramComparison = selectedRuns.length > 1 ? compareParameters(selectedRuns) : { changed: [], unchanged: [] };
                        
                        let parametersToShow: Parameter[];
                        if (selectedRuns.length === 1 || showAllParameters) {
                          parametersToShow = runParameters;
                        } else {
                          parametersToShow = runParameters.filter(param => 
                            paramComparison.changed.includes(param.parameter_name)
                          );
                        }
                        
                        if (parametersToShow.length === 0) {
                          return (
                            <div>
                              <h4 className="font-medium text-sm text-muted-foreground mb-2">Parameters</h4>
                              <p className="text-sm text-gray-400 italic">
                                {selectedRuns.length > 1 && !showAllParameters 
                                  ? 'No parameter changes detected' 
                                  : 'No parameters available'
                                }
                              </p>
                            </div>
                          );
                        }
                        
                        return (
                          <div>
                            <h4 className="font-medium text-sm text-muted-foreground mb-2">
                              {selectedRuns.length > 1 && !showAllParameters ? 'Changed Parameters' : 'Parameters'}
                            </h4>
                            <div className="space-y-1 max-h-64 overflow-y-auto">
                              {parametersToShow.map((param, index) => {
                                const isChanged = selectedRuns.length > 1 && paramComparison.changed.includes(param.parameter_name);
                                const isUnchanged = selectedRuns.length > 1 && paramComparison.unchanged.includes(param.parameter_name);
                                
                                let bgColor, borderColor, textColor;
                                if (selectedRuns.length === 1 || showAllParameters) {
                                  // When showing all parameters or single run, use neutral styling
                                  bgColor = 'bg-gray-900/20';
                                  borderColor = 'border-gray-700';
                                  textColor = 'text-gray-300';
                                } else if (isChanged) {
                                  // Changed parameters - red styling
                                  bgColor = 'bg-red-900/20';
                                  borderColor = 'border-red-800';
                                  textColor = 'text-red-300';
                                } else {
                                  // This shouldn't happen when showAllParameters is false, but just in case
                                  bgColor = 'bg-gray-900/20';
                                  borderColor = 'border-gray-700';
                                  textColor = 'text-gray-300';
                                }
                                
                                return (
                                  <div 
                                    key={index} 
                                    className={`flex justify-between text-sm p-2 rounded ${bgColor} border ${borderColor} ${textColor}`}
                                  >
                                    <span className="font-semibold">
                                      {param.parameter_name}:
                                    </span>
                                    <span className="font-mono">{param.parameter_value}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                );
              })}
              </div>
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
            <div className="space-y-6">
              {/* Chart Controls */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-semibold">Chart Display Options</h4>
                      <p className="text-gray-400 text-sm">
                        {showOverlapOnly 
                          ? 'Showing only overlapping dates for accurate comparison'
                          : 'Showing all dates from selected runs'
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={showOverlapOnly}
                          onChange={(e) => setShowOverlapOnly(e.target.checked)}
                          className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                        />
                        Show Overlap Only
                      </label>
                      {getOverlappingDateRange(selectedRuns) && (
                        <Badge variant="outline" className="text-xs">
                          {getOverlappingDateRange(selectedRuns)?.dates.length} overlapping days
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily PNL Comparison</CardTitle>
                <CardDescription>
                  Compare daily performance across selected runs.
                    {showOverlapOnly && getOverlappingDateRange(selectedRuns) && (
                      <span className="block text-blue-400 mt-1">
                        Showing {getOverlappingDateRange(selectedRuns)?.dates.length} overlapping days
                      </span>
                    )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="h-96 bg-gray-900/50 rounded-lg p-4">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getFilteredChartData()}>
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#374151"
                        strokeOpacity={0.5}
                      />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        axisLine={{ stroke: '#374151' }}
                        tickLine={{ stroke: '#374151' }}
                      />
                      <YAxis 
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        axisLine={{ stroke: '#374151' }}
                        tickLine={{ stroke: '#374151' }}
                        tickFormatter={(value) => formatCurrency(value)}
                      />
                      <Legend 
                        wrapperStyle={{
                          color: '#f9fafb',
                          fontSize: '14px',
                          paddingTop: '20px'
                        }}
                        iconType="rect"
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#f9fafb'
                        }}
                        labelStyle={{
                          color: '#f9fafb',
                          fontWeight: '600'
                        }}
                        formatter={(value: any, name: string) => {
                          const runId = name.replace('run_', '');
                          const run = runs.find(r => r.id === parseInt(runId));
                          const displayName = run?.run_description 
                            ? `Run ${runId} - ${run.run_description}`
                            : run?.run_name || `Run ${runId}`;
                          return [formatCurrency(value), displayName];
                        }}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      {selectedRuns.sort((a, b) => a - b).map((runId, index) => {
                        const run = runs.find(r => r.id === runId);
                        const colors = [
                          { positive: '#10b981', negative: '#ef4444' }, // Green/Red
                          { positive: '#3b82f6', negative: '#dc2626' }, // Blue/Red
                          { positive: '#8b5cf6', negative: '#b91c1c' }, // Purple/Red
                          { positive: '#f59e0b', negative: '#dc2626' }, // Amber/Red
                          { positive: '#06b6d4', negative: '#dc2626' }, // Cyan/Red
                        ];
                        const colorScheme = colors[index % colors.length];
                        
                        return (
                          <Bar
                            key={runId}
                            dataKey={`run_${runId}`}
                            name={run?.run_description 
                              ? `Run ${runId} - ${run.run_description}`
                              : run?.run_name || `Run ${runId}`}
                            fill={colorScheme.positive}
                            radius={[2, 2, 0, 0]}
                          >
                            {(() => {
                              const chartData = getFilteredChartData();
                              
                              return chartData.map((dataPoint, dateIndex) => {
                                const value = dataPoint[`run_${runId}`] || 0;
                                const color = value >= 0 ? colorScheme.positive : colorScheme.negative;
                                
                                return (
                                  <Cell key={`cell-${runId}-${dateIndex}`} fill={color} />
                                );
                              });
                            })()}
                          </Bar>
                        );
                      })}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            </div>
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
        <RunDetailsDialog 
          key={run.id} 
          run={run}
          runDailyPnl={dailyPnlData[run.id] || []}
          runParameters={parameters[run.id] || []}
          isOpen={viewingRunDetails === run.id}
          onClose={() => setViewingRunDetails(null)}
          onSaveDescription={handleSaveDescription}
          onDescriptionChange={handleDescriptionChange}
          localDescription={localDescription}
          savingDescription={savingDescription}
        />
      ))}

      {/* Merge Dialog */}
      <AlertDialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <AlertDialogContent className="max-w-2xl bg-gray-800 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <GitMerge className="h-5 w-5" />
              Merge Runs
            </AlertDialogTitle>
          </AlertDialogHeader>
          
          {mergeValidation?.error ? (
            <div className="space-y-4">
              <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
                <h4 className="text-red-400 font-semibold mb-2">Cannot Merge Runs</h4>
                <p className="text-red-300 text-sm">{mergeValidation.error}</p>
                
                {mergeValidation.details && (
                  <div className="mt-3 space-y-2">
                    {mergeValidation.details.overlaps && (
                      <div>
                        <h5 className="text-red-400 font-medium text-sm">Date Overlaps:</h5>
                        <ul className="text-red-300 text-xs space-y-1">
                          {mergeValidation.details.overlaps.map((overlap: any, index: number) => (
                            <li key={index}>
                              Runs {overlap.run1} and {overlap.run2}: {overlap.overlap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {mergeValidation.details.parameterDifferences && (
                      <div>
                        <h5 className="text-red-400 font-medium text-sm">Parameter Differences:</h5>
                        <ul className="text-red-300 text-xs space-y-1">
                          {mergeValidation.details.parameterDifferences.map((diff: any, index: number) => (
                            <li key={index}>
                              {diff.parameter}: {diff.differences.map((d: any) => `Run ${d.runId}=${d.value}`).join(', ')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowMergeDialog(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          ) : mergeValidation?.canMerge ? (
            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
                <h4 className="text-green-400 font-semibold mb-2">Runs Can Be Merged</h4>
                <p className="text-green-300 text-sm">
                  The selected runs have no date overlaps and matching parameters.
                </p>
                
                <div className="mt-3 space-y-2">
                  <h5 className="text-green-400 font-medium text-sm">Runs to Merge:</h5>
                  <ul className="text-green-300 text-xs space-y-1">
                    {mergeValidation.runs.map((run: any) => (
                      <li key={run.id}>
                        Run #{run.id}: {run.name} ({run.dateRange?.startDate} to {run.dateRange?.endDate})
                      </li>
                    ))}
                  </ul>
                  
                  <h5 className="text-green-400 font-medium text-sm">Merged Date Range:</h5>
                  <p className="text-green-300 text-xs">
                    {mergeValidation.mergedDateRange?.startDate} to {mergeValidation.mergedDateRange?.endDate}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Merged Run Name
                  </label>
                  <input
                    type="text"
                    value={mergedRunName}
                    onChange={(e) => setMergedRunName(e.target.value)}
                    placeholder={`Merged Run (${selectedRuns.join(', ')})`}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Merged Run Description
                  </label>
                  <textarea
                    value={mergedRunDescription}
                    onChange={(e) => setMergedRunDescription(e.target.value)}
                    placeholder={`Merged from runs: ${selectedRuns.join(', ')}`}
                    rows={3}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 resize-none"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button
                  onClick={() => setShowMergeDialog(false)}
                  variant="outline"
                  className="border-gray-500 text-gray-300 hover:bg-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMergeRuns}
                  disabled={mergingRuns}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {mergingRuns ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Merging...
                    </>
                  ) : (
                    <>
                      <GitMerge className="h-4 w-4 mr-2" />
                      Merge Runs
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-4">
              Validating merge...
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
