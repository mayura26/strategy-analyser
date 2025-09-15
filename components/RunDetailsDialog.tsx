'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart3, Settings, TrendingUp, Calendar, ChevronDown, ChevronRight, Edit2, Save, X } from 'lucide-react';

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
  const [showDailyPnl, setShowDailyPnl] = useState(false);
  const [showParameters, setShowParameters] = useState(false);

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  const handleSave = async () => {
    if (!onSaveDescription) return;
    await onSaveDescription(run.id);
  };

  const isEditing = localDescription && localDescription[run.id] !== undefined;
  const isSaving = savingDescription === run.id;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-gray-800 border-gray-700">
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
        
        <div className="space-y-3">
          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-2">
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400">Net PNL</div>
                    <div className={`text-lg font-bold ${run.net_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(run.net_pnl)}
                    </div>
                  </div>
                  <TrendingUp className={`h-4 w-4 ${run.net_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400">Profit Factor</div>
                    <div className="text-lg font-bold text-blue-400">
                      {run.profit_factor?.toFixed(2) || 'N/A'}
                    </div>
                  </div>
                  <BarChart3 className="h-4 w-4 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400">Win Rate</div>
                    <div className="text-lg font-bold text-green-400">
                      {run.win_rate ? formatPercentage(run.win_rate) : 'N/A'}
                    </div>
                  </div>
                  <Calendar className="h-4 w-4 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400">Total Trades</div>
                    <div className="text-lg font-bold text-white">{run.total_trades || 0}</div>
                  </div>
                  <Settings className="h-4 w-4 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily PNL Section */}
          <Card className="bg-gray-700 border-gray-600">
            <div 
              className="cursor-pointer hover:bg-gray-600 transition-colors p-3"
              onClick={() => setShowDailyPnl(!showDailyPnl)}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-white flex items-center gap-2 text-sm">
                  Daily PNL History
                  <Badge variant="outline" className="text-xs">{runDailyPnl.length} days</Badge>
                </h3>
                {showDailyPnl ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
              </div>
            </div>
            {showDailyPnl && (
              <CardContent className="pt-0 pb-3">
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
            )}
          </Card>

          {/* Parameters Section */}
          {runParameters.length > 0 && (
            <Card className="bg-gray-700 border-gray-600">
              <div 
                className="cursor-pointer hover:bg-gray-600 transition-colors p-3"
                onClick={() => setShowParameters(!showParameters)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-white flex items-center gap-2 text-sm">
                    Strategy Parameters
                    <Badge variant="outline" className="text-xs">{runParameters.length} params</Badge>
                  </h3>
                  {showParameters ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
                </div>
              </div>
              {showParameters && (
                <CardContent className="pt-0 pb-3">
                  <div className="grid grid-cols-1 gap-1">
                    {runParameters.map((param, index) => (
                      <div key={index} className="flex justify-between items-center py-1.5 px-2 bg-gray-600 rounded">
                        <span className="text-gray-300 text-xs">{param.parameter_name}</span>
                        <span className="text-white font-mono bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                          {param.parameter_value}
                        </span>
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
