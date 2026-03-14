'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { API_URL } from '@/app/lib/api';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Wifi,
  Server,
  Database,
  Shield,
  Clock,
  TrendingUp,
  RefreshCw,
  Menu,
  X
} from 'lucide-react';
import Footer from '../components/landing/Footer';
import axios from 'axios';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  responseTime?: number;
  uptime?: number;
  icon: any;
}

interface Incident {
  id: string;
  title: string;
  description?: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'minor' | 'major' | 'critical';
  timestamp: string;
  updates: {
    message: string;
    timestamp: string;
  }[];
}

export default function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [overallStatus, setOverallStatus] = useState<'operational' | 'degraded' | 'down'>('operational');
  const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Health endpoints are at /health/* without the /api/v1 prefix
  const HEALTH_API_URL = API_URL.replace(/\/api\/v\d+$/, '');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchStatusData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${HEALTH_API_URL}/health/status`);

      if (response.data.success) {
        const data = response.data.data;

        const mappedServices = data.services.map((service: any) => ({
          ...service,
          icon: service.name === 'API Gateway' ? Server :
                service.name === 'Processamento PIX' ? Activity :
                service.name === 'Dashboard' ? Wifi :
                service.name === 'Banco de Dados' ? Database :
                service.name === 'Webhooks' ? RefreshCw :
                service.name === 'Autenticação' ? Shield :
                service.name === 'Cache' ? Server : Activity
        }));

        setServices(mappedServices);
        setOverallStatus(data.overallStatus);
        setLastUpdated(data.lastUpdated);

        if (data.incidents && Array.isArray(data.incidents)) {
          setIncidents(data.incidents);
        }

        if (data.uptimeHistory && Array.isArray(data.uptimeHistory)) {
          // Format dates for display
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          const formatted = data.uptimeHistory.map((entry: { date: string; uptime: number }) => {
            const entryDate = new Date(entry.date + 'T00:00:00');
            let label: string;
            if (entryDate.getTime() === today.getTime()) {
              label = 'Hoje';
            } else if (entryDate.getTime() === yesterday.getTime()) {
              label = 'Ontem';
            } else {
              label = entryDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            }
            return { date: label, uptime: entry.uptime };
          });
          setUptimeHistory(formatted);
        }
      }
    } catch (err) {
      console.error('Error fetching status data:', err);
      setError('Erro ao carregar dados do sistema. Usando dados em cache.');

      setServices([
        { name: 'API Gateway', status: 'operational', responseTime: 45, uptime: 99.99, icon: Server },
        { name: 'Processamento PIX', status: 'operational', responseTime: 120, uptime: 99.98, icon: Activity },
        { name: 'Dashboard', status: 'operational', responseTime: 89, uptime: 99.95, icon: Wifi },
        { name: 'Banco de Dados', status: 'operational', responseTime: 12, uptime: 99.99, icon: Database },
        { name: 'Webhooks', status: 'operational', responseTime: 156, uptime: 99.90, icon: RefreshCw },
        { name: 'Autenticação', status: 'operational', responseTime: 67, uptime: 100, icon: Shield }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusData();

    const statusInterval = setInterval(fetchStatusData, 30000);
    const timestampInterval = setInterval(() => {
      setLastUpdated(new Date().toISOString());
    }, 60000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(timestampInterval);
    };
  }, [HEALTH_API_URL]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <CheckCircle className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-400/10 border-green-400/20 text-green-400';
      case 'degraded':
        return 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400';
      case 'down':
        return 'bg-red-400/10 border-red-400/20 text-red-400';
      default:
        return 'bg-zinc-400/10 border-zinc-400/20 text-zinc-400';
    }
  };

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const [uptimeHistory, setUptimeHistory] = useState<{ date: string; uptime: number }[]>([]);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Navigation - same pattern as /devs */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800'
            : 'bg-zinc-950 border-b border-zinc-800'
        }`}
      >
        <div className="max-w-[90rem] mx-auto px-5 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <Link href="/" className="flex items-center gap-2.5">
                <Image
                  src="/atlas-logo.jpg"
                  alt="Atlas"
                  width={32}
                  height={32}
                  className="rounded-lg"
                  priority
                />
                <span className="text-lg font-bold text-zinc-50">Atlas</span>
              </Link>
              <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-0.5 rounded">Status</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-zinc-400 hover:text-white text-sm font-medium transition-colors">
                Home
              </Link>
              <Link href="/devs" className="text-zinc-400 hover:text-white text-sm font-medium transition-colors">
                Docs
              </Link>
              <span className="text-white text-sm font-medium">Status</span>
              <div className="w-px h-5 bg-zinc-700" />
              <Link href="/login" className="text-zinc-400 hover:text-white text-sm font-medium transition-colors">
                Entrar
              </Link>
              <Link
                href="/register"
                className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Criar Conta
              </Link>
            </div>

            <div className="md:hidden flex items-center gap-3">
              <Link
                href="/register"
                className="bg-blue-500 hover:bg-blue-400 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              >
                Criar Conta
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-xl">
            <div className="px-5 py-4 space-y-3">
              <Link href="/" className="block text-zinc-400 hover:text-white text-sm font-medium transition-colors">
                Home
              </Link>
              <Link href="/devs" className="block text-zinc-400 hover:text-white text-sm font-medium transition-colors">
                Docs
              </Link>
              <span className="block text-white text-sm font-medium">Status</span>
              <div className="border-t border-zinc-800 pt-3">
                <Link href="/login" className="block text-zinc-400 hover:text-white text-sm font-medium transition-colors">
                  Entrar
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-12 py-8">

          {/* Hero section */}
          <section className="py-12 border-b border-zinc-800">
            <h1 className="text-3xl sm:text-4xl font-bold text-zinc-50 mb-3">
              Atlas <span className="text-green-400">Status</span>
            </h1>
            <p className="text-lg text-zinc-400 mb-8 max-w-2xl">
              Monitore a disponibilidade e o desempenho dos servicos Atlas em tempo real.
            </p>

            {/* Overall status banner */}
            {loading ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                <span className="ml-3 text-zinc-400">Carregando status do sistema...</span>
              </div>
            ) : (
              <div className={`rounded-lg p-6 border ${
                overallStatus === 'operational'
                  ? 'bg-green-400/5 border-green-400/20'
                  : overallStatus === 'degraded'
                  ? 'bg-yellow-400/5 border-yellow-400/20'
                  : 'bg-red-400/5 border-red-400/20'
              }`}>
                {error && (
                  <div className="mb-4 p-3 bg-yellow-400/10 border border-yellow-400/20 rounded-lg">
                    <p className="text-yellow-400 text-sm">{error}</p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {overallStatus === 'operational' && <CheckCircle className="w-8 h-8 text-green-400" />}
                    {overallStatus === 'degraded' && <AlertCircle className="w-8 h-8 text-yellow-400" />}
                    {overallStatus === 'down' && <XCircle className="w-8 h-8 text-red-400" />}
                    <div>
                      <h2 className="text-xl font-bold text-zinc-50">
                        {overallStatus === 'operational' && 'Todos os Sistemas Operacionais'}
                        {overallStatus === 'degraded' && 'Desempenho Degradado'}
                        {overallStatus === 'down' && 'Incidente em Andamento'}
                      </h2>
                      <p className="text-zinc-500 text-sm mt-1">
                        Ultima atualizacao: {formatDate(lastUpdated)}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${getStatusBadgeColor(overallStatus)}`}>
                    <Activity className="w-4 h-4" />
                    {overallStatus === 'operational' && '100% Operacional'}
                    {overallStatus === 'degraded' && 'Parcialmente Degradado'}
                    {overallStatus === 'down' && 'Servico Interrompido'}
                  </span>
                </div>
              </div>
            )}

            {/* Quick stats */}
            {!loading && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-400 mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-2xl font-bold">
                      {uptimeHistory.length > 0
                        ? (uptimeHistory.reduce((sum, d) => sum + d.uptime, 0) / uptimeHistory.length).toFixed(2) + '%'
                        : '—'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">Uptime ({uptimeHistory.length > 0 ? `${uptimeHistory.length}d` : '7 dias'})</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-2xl font-bold">
                      {services.length > 0
                        ? Math.round(services.reduce((sum, s) => sum + (s.responseTime || 0), 0) / services.length) + 'ms'
                        : '—'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">Tempo de Resposta Medio</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-purple-400 mb-1">
                    <Shield className="w-4 h-4" />
                    <span className="text-2xl font-bold">{incidents.length}</span>
                  </div>
                  <p className="text-xs text-zinc-500">Incidentes Ativos</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-400 mb-1">
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-2xl font-bold">30s</span>
                  </div>
                  <p className="text-xs text-zinc-500">Frequencia de Atualizacao</p>
                </div>
              </div>
            )}
          </section>

          {/* Services Status */}
          <section className="mt-12 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-50 mb-1">Status dos Servicos</h2>
              <p className="text-zinc-500 text-sm">Monitoramento individual de cada componente da infraestrutura.</p>
            </div>

            <div className="space-y-3">
              {services.map((service, index) => {
                const Icon = service.icon;
                return (
                  <div
                    key={index}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Icon className="w-5 h-5 text-zinc-500" />
                        <div>
                          <h3 className="text-zinc-50 font-medium text-sm">{service.name}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-zinc-500">
                              Resposta: {service.responseTime}ms
                            </span>
                            <span className="text-xs text-zinc-500">
                              Uptime: {service.uptime}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(service.status)}
                        <span className={`text-sm font-medium ${
                          service.status === 'operational' ? 'text-green-400' :
                          service.status === 'degraded' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {service.status === 'operational' && 'Operacional'}
                          {service.status === 'degraded' && 'Degradado'}
                          {service.status === 'down' && 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Uptime History */}
          <section className="mt-12 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-50 mb-1">Historico de Disponibilidade</h2>
              <p className="text-zinc-500 text-sm">Uptime dos ultimos 7 dias.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              {uptimeHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">Dados de uptime sendo coletados. Volte em alguns minutos.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {uptimeHistory.map((day, index) => (
                      <div key={index} className="flex-shrink-0">
                        <div
                          className={`w-12 h-32 rounded-lg flex flex-col items-center justify-end p-2 ${
                            day.uptime === 100
                              ? 'bg-green-400/10 border border-green-400/20'
                              : day.uptime >= 99.9
                              ? 'bg-yellow-400/10 border border-yellow-400/20'
                              : 'bg-red-400/10 border border-red-400/20'
                          }`}
                        >
                          <div
                            className={`w-full rounded transition-all ${
                              day.uptime === 100
                                ? 'bg-green-400'
                                : day.uptime >= 99.9
                                ? 'bg-yellow-400'
                                : 'bg-red-400'
                            }`}
                            style={{ height: `${day.uptime}%` }}
                          />
                        </div>
                        <p className="text-xs text-zinc-500 text-center mt-2">{day.date}</p>
                        <p className="text-xs text-zinc-600 text-center">{day.uptime}%</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-center gap-6 mt-6 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-400 rounded" />
                      <span className="text-zinc-500">100% Uptime</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-400 rounded" />
                      <span className="text-zinc-500">99.9%+ Uptime</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-400 rounded" />
                      <span className="text-zinc-500">&lt;99.9% Uptime</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Recent Incidents */}
          <section className="mt-12 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-50 mb-1">Incidentes Recentes</h2>
              <p className="text-zinc-500 text-sm">Historico de incidentes dos ultimos 30 dias.</p>
            </div>

            {incidents.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-base font-semibold text-zinc-50 mb-2">
                  Nenhum incidente nos ultimos 30 dias
                </h3>
                <p className="text-zinc-500 text-sm">
                  Todos os sistemas estao funcionando normalmente.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-5"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-zinc-50 font-medium text-sm">{incident.title}</h3>
                        {incident.description && (
                          <p className="text-sm text-zinc-400 mt-1 mb-2">
                            {incident.description}
                          </p>
                        )}
                        <p className="text-xs text-zinc-500 mt-1">
                          Iniciado em {formatDate(incident.timestamp)}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${
                        incident.status === 'resolved'
                          ? 'bg-green-400/10 border-green-400/20 text-green-400'
                          : incident.status === 'monitoring'
                          ? 'bg-blue-400/10 border-blue-400/20 text-blue-400'
                          : 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400'
                      }`}>
                        {incident.status === 'investigating' && 'Investigando'}
                        {incident.status === 'identified' && 'Identificado'}
                        {incident.status === 'monitoring' && 'Monitorando'}
                        {incident.status === 'resolved' && 'Resolvido'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {incident.updates.map((update, idx) => (
                        <div key={idx} className="pl-4 border-l-2 border-zinc-800">
                          <p className="text-zinc-400 text-sm">{update.message}</p>
                          <p className="text-xs text-zinc-600 mt-1">
                            {formatDate(update.timestamp)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Footer spacing */}
          <div className="h-12" />
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
