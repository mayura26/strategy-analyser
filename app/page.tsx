import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Upload, TrendingUp } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">
            Strategy Analyzer
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Analyze and compare your NinjaTrader strategy performance. Parse raw data, 
            track metrics, and optimize your trading strategies.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/input">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                <Upload className="mr-2 h-5 w-5" />
                Upload Data
              </Button>
            </Link>
            <Link href="/analysis">
              <Button size="lg" variant="outline">
                <BarChart3 className="mr-2 h-5 w-5" />
                View Analysis
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-blue-400" />
              </div>
              <CardTitle className="text-white">Upload Raw Data</CardTitle>
              <CardDescription className="text-gray-300">
                Paste your NinjaTrader strategy run data and let our system automatically 
                parse and extract all relevant metrics and parameters.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-green-400" />
              </div>
              <CardTitle className="text-white">Compare Performance</CardTitle>
              <CardDescription className="text-gray-300">
                Compare different strategy runs side-by-side to identify what 
                parameters lead to better performance and reduced risk.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">Track Metrics</CardTitle>
              <CardDescription className="text-gray-300">
                Monitor key performance indicators including net PNL, win rate, 
                drawdown, and custom strategy-specific metrics over time.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-sm font-bold">1</div>
              <h3 className="font-semibold mb-2 text-white">Upload Data</h3>
              <p className="text-sm text-gray-300">Paste your raw strategy output data</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-sm font-bold">2</div>
              <h3 className="font-semibold mb-2 text-white">Auto Parse</h3>
              <p className="text-sm text-gray-300">System detects strategy type and extracts metrics</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-sm font-bold">3</div>
              <h3 className="font-semibold mb-2 text-white">Store & Organize</h3>
              <p className="text-sm text-gray-300">Data is stored in a flexible database structure</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-sm font-bold">4</div>
              <h3 className="font-semibold mb-2 text-white">Analyze & Compare</h3>
              <p className="text-sm text-gray-300">Compare runs and identify optimization opportunities</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
