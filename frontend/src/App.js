import React, { useState, useEffect } from 'react';
import './App.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { Alert, AlertDescription } from './components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Progress } from './components/ui/progress';
import { 
  Shield, 
  Search, 
  AlertTriangle, 
  Activity, 
  Database, 
  Eye,
  Zap,
  Globe,
  Lock,
  Skull,
  RefreshCw
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [dashboardStats, setDashboardStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('domain');
  const [searchResults, setSearchResults] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [monitoredDomains, setMonitoredDomains] = useState([]);
  const [newDomain, setNewDomain] = useState('');

  useEffect(() => {
    fetchDashboardStats();
    fetchAlerts();
    fetchMonitoredDomains();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/dashboard/stats`);
      const data = await response.json();
      setDashboardStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/alerts`);
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const fetchMonitoredDomains = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/domains/monitored`);
      const data = await response.json();
      setMonitoredDomains(data.domains || []);
    } catch (error) {
      console.error('Failed to fetch monitored domains:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setSearchResults(null);
    
    try {
      let endpoint;
      if (searchType === 'domain') {
        endpoint = `/api/breaches/domain/${encodeURIComponent(searchQuery)}`;
      } else {
        endpoint = `/api/search/email/${encodeURIComponent(searchQuery)}`;
      }
      
      const response = await fetch(`${BACKEND_URL}${endpoint}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults({ error: 'Search failed' });
    } finally {
      setLoading(false);
    }
  };

  const addDomainMonitor = async () => {
    if (!newDomain.trim()) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/domains/monitor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain, email_patterns: [] })
      });
      
      if (response.ok) {
        setNewDomain('');
        fetchMonitoredDomains();
        fetchDashboardStats();
      }
    } catch (error) {
      console.error('Failed to add domain monitor:', error);
    }
  };

  const runComprehensiveScan = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/scan/comprehensive`, {
        method: 'POST'
      });
      const data = await response.json();
      
      // Refresh all data after scan
      setTimeout(() => {
        fetchDashboardStats();
        fetchAlerts();
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Comprehensive scan failed:', error);
      setLoading(false);
    }
  };

  const dismissAlert = async (alertId) => {
    try {
      await fetch(`${BACKEND_URL}/api/alerts/${alertId}`, { method: 'DELETE' });
      fetchAlerts();
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <header className="border-b border-gray-700 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Shield className="h-8 w-8 text-red-500" />
                <div className="absolute inset-0 h-8 w-8 bg-red-500/20 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-purple-500 bg-clip-text text-transparent">
                  Dark Web Monitor
                </h1>
                <p className="text-xs text-gray-400 font-mono">Created by An0ns4i</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="border-green-500 text-green-400">
                <Activity className="h-3 w-3 mr-1" />
                OPERATIONAL
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-red-900/50 to-red-800/30 border-red-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-100">Total Breaches</CardTitle>
              <Skull className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-300">
                {dashboardStats?.total_breaches || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Monitored Domains</CardTitle>
              <Globe className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-300">
                {dashboardStats?.monitored_domains || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-900/50 to-orange-800/30 border-yellow-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-100">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-300">
                {dashboardStats?.active_alerts || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">System Status</CardTitle>
              <Lock className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-purple-300 uppercase">
                {dashboardStats?.system_status || 'Unknown'}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800/50">
            <TabsTrigger value="search" className="data-[state=active]:bg-red-600">
              <Search className="h-4 w-4 mr-2" />
              Search
            </TabsTrigger>
            <TabsTrigger value="monitor" className="data-[state=active]:bg-blue-600">
              <Eye className="h-4 w-4 mr-2" />
              Monitor
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-yellow-600">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="scan" className="data-[state=active]:bg-purple-600">
              <Zap className="h-4 w-4 mr-2" />
              Scan
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 mr-2 text-red-400" />
                  Dark Web Search
                </CardTitle>
                <CardDescription>
                  Search for compromised domains and email addresses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Enter domain or email address..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-gray-700 border-gray-600"
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <select 
                    value={searchType} 
                    onChange={(e) => setSearchType(e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  >
                    <option value="domain">Domain</option>
                    <option value="email">Email</option>
                  </select>
                  <Button 
                    onClick={handleSearch} 
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </Button>
                </div>

                {searchResults && (
                  <div className="mt-6">
                    {searchResults.error ? (
                      <Alert className="border-red-500 bg-red-900/20">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{searchResults.error}</AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-white">
                            Found {searchResults.count || searchResults.breaches_found || 0} breaches
                          </h3>
                        </div>
                        
                        {(searchResults.breaches || []).map((breach, index) => (
                          <Card key={index} className="bg-gray-700/50 border-gray-600">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold text-red-400">
                                    {breach.Name || breach.breach_name}
                                  </h4>
                                  <p className="text-sm text-gray-300 mt-1">
                                    {breach.Domain || breach.domain}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-2">
                                    {breach.Description || breach.description}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <Badge variant={breach.IsVerified || breach.verified ? "default" : "secondary"}>
                                    {breach.IsVerified || breach.verified ? "Verified" : "Unverified"}
                                  </Badge>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {formatDate(breach.BreachDate || breach.breach_date)}
                                  </p>
                                </div>
                              </div>
                              {(breach.DataClasses || breach.data_classes) && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                  {(breach.DataClasses || breach.data_classes).map((dataClass, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {dataClass}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitor Tab */}
          <TabsContent value="monitor" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="h-5 w-5 mr-2 text-blue-400" />
                  Domain Monitoring
                </CardTitle>
                <CardDescription>
                  Add domains to monitor for credential leaks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <Input
                    placeholder="Enter domain to monitor (e.g., example.com)"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="bg-gray-700 border-gray-600 flex-1"
                  />
                  <Button 
                    onClick={addDomainMonitor}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Add Monitor
                  </Button>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-300">Monitored Domains</h3>
                  {monitoredDomains.length === 0 ? (
                    <p className="text-gray-400 text-sm">No domains being monitored</p>
                  ) : (
                    <div className="grid gap-2">
                      {monitoredDomains.map((domain, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600">
                          <div>
                            <span className="text-white font-medium">{domain.domain}</span>
                            <p className="text-xs text-gray-400">
                              Added: {formatDate(domain.created_at)}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-green-400 border-green-400">
                            Active
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-yellow-400" />
                  Security Alerts
                </CardTitle>
                <CardDescription>
                  Recent breach alerts and notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No active alerts</p>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((alert, index) => (
                      <div key={index} className="flex items-start justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                              {alert.severity}
                            </Badge>
                            <span className="text-sm text-gray-400">{formatDate(alert.created_at)}</span>
                          </div>
                          <h4 className="font-medium text-white mt-1">{alert.breach_name}</h4>
                          <p className="text-sm text-gray-300 mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-400">Domain: {alert.domain}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissAlert(alert.id)}
                          className="text-gray-400 hover:text-white"
                        >
                          Dismiss
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scan Tab */}
          <TabsContent value="scan" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-purple-400" />
                  Comprehensive Scan
                </CardTitle>
                <CardDescription>
                  Run deep scans across all monitored domains
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <Button
                    onClick={runComprehensiveScan}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 px-8 py-3 text-lg"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5 mr-2" />
                        Run Comprehensive Scan
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-gray-400 mt-2">
                    This will scan all monitored domains for new breaches
                  </p>
                </div>

                {loading && (
                  <div className="space-y-2">
                    <Progress value={33} className="bg-gray-700" />
                    <p className="text-sm text-gray-400 text-center">
                      Scanning dark web databases...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-700 bg-black/50 backdrop-blur-xl mt-12">
        <div className="container mx-auto px-6 py-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Dark Web Monitor v1.0 | Created by{' '}
              <span className="text-red-400 font-mono font-semibold">An0ns4i</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Cybersecurity Intelligence Platform for Threat Monitoring
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;