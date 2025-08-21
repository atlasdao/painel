'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Shield, 
  Key, 
  Globe, 
  Code, 
  CheckCircle, 
  Calendar,
  Search,
  Copy,
  Check,
  ExternalLink,
  Mail,
  Github,
  MessageCircle,
  ChevronRight
} from 'lucide-react';

export default function Home() {
  const [copied, setCopied] = useState(false);
  const donationAddress = 'VJLBCUaw6GL8AuyjsrwpwTYNCUfUxPVTfxxffNTEZMKEjSwamWL6YqUUWLvz89ts1scTDKYoTF8oruMX';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(donationAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const principles = [
    {
      icon: Shield,
      title: 'Soberania do Usuário',
      description: 'O controle sobre as chaves privadas e, consequentemente, os fundos, permanece com o usuário.'
    },
    {
      icon: Key,
      title: 'Minimização de Confiança',
      description: 'Arquitetura projetada para reduzir a dependência de intermediários, incluindo a própria Atlas DAO.'
    },
    {
      icon: Globe,
      title: 'Resistência à Censura',
      description: 'Design descentralizado que visa maximizar a resiliência contra tentativas de bloqueio ou controle.'
    },
    {
      icon: Code,
      title: 'Código Aberto (GPLv3)',
      description: 'Código fonte publicado para garantir as liberdades de usar, estudar, modificar e distribuir o software.'
    }
  ];

  const roadmap = [
    {
      status: 'completed',
      title: 'MVP Alfa: Conversão de Pix para DePix',
      description: 'Permite que usuários gerem cobranças Pix e recebam DePix em uma carteira Liquid não custodial.'
    },
    {
      status: 'planned',
      title: 'Pagamentos Pix com DePix (Saída)',
      description: 'Capacidade de utilizar saldo DePix para realizar pagamentos para qualquer chave ou QR Code Pix.'
    },
    {
      status: 'planned',
      title: 'Suporte a DePix na Lightning Network',
      description: 'Utilização de DePix via Taproot Assets para transações instantâneas e taxas reduzidas.'
    },
    {
      status: 'research',
      title: 'Opções de "Top-up" Ampliadas',
      description: 'Adicionar saldo utilizando Bitcoin (on-chain e Lightning Network) e Monero.'
    },
    {
      status: 'research',
      title: 'Modo Custodial Opcional',
      description: 'Uma alternativa para usuários iniciantes que preferem não gerenciar chaves privadas inicialmente.'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-green-600 text-sm font-semibold">
            <CheckCircle className="w-4 h-4" />
            Concluído
          </span>
        );
      case 'planned':
        return (
          <span className="flex items-center gap-1 text-blue-600 text-sm font-semibold">
            <Calendar className="w-4 h-4" />
            Planejado
          </span>
        );
      case 'research':
        return (
          <span className="flex items-center gap-1 text-purple-600 text-sm font-semibold">
            <Search className="w-4 h-4" />
            Pesquisa
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-gray-900/80 backdrop-blur-md border-b border-gray-700 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Image
                src="/atlas-logo.jpg"
                alt="Atlas DAO"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="text-xl font-bold text-white">Atlas DAO</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-gray-300 hover:text-white font-medium"
              >
                Login
              </Link>
              <a
                href="https://t.me/atlas_bridge_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Testar o Bot
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <Image
            src="/atlas-logo.jpg"
            alt="Atlas DAO"
            width={120}
            height={120}
            className="mx-auto rounded-lg shadow-lg mb-8"
          />
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            A Ponte para Sua<br />
            <span className="text-blue-400">Soberania Financeira</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            O Atlas Bridge é a primeira iniciativa da Atlas DAO: uma interface de minimização 
            de confiança entre o sistema Pix e a Liquid Network, projetada para a sua autonomia.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://t.me/atlas_bridge_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-lg px-8 py-3 flex items-center justify-center gap-2"
            >
              Acesse a Versão Alfa
              <ChevronRight className="w-5 h-5" />
            </a>
            <Link
              href="/dashboard"
              className="btn-secondary text-lg px-8 py-3"
            >
              Painel de Controle
            </Link>
          </div>
        </div>
      </section>

      {/* Principles Section */}
      <section className="py-20 px-4 bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-6">
            Uma Base de Princípios Sólidos
          </h2>
          <p className="text-center text-gray-300 mb-12 max-w-3xl mx-auto">
            O desenvolvimento do Atlas Bridge é guiado por preceitos inegociáveis.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {principles.map((principle, index) => (
              <div key={index} className="bg-gray-700 p-6 rounded-lg border border-gray-600 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                  <principle.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {principle.title}
                </h3>
                <p className="text-gray-300 text-sm">
                  {principle.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-6">
            Roteiro de Desenvolvimento
          </h2>
          <p className="text-center text-gray-300 mb-12 max-w-3xl mx-auto">
            O nosso trabalho é contínuo e focado em ampliar a soberania financeira.
          </p>
          <div className="space-y-6 max-w-4xl mx-auto">
            {roadmap.map((item, index) => (
              <div key={index} className="bg-gray-700 p-6 rounded-lg border border-gray-600 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-300">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            O Próximo Passo na Sua Jornada de Soberania
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            O Atlas Bridge é mais do que um software; é uma declaração de autonomia. 
            Junte-se à nossa comunidade, teste a versão alfa e ajude a construir as 
            ferramentas para um futuro financeiro mais livre e descentralizado.
          </p>
          <a
            href="https://t.me/atlas_bridge_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Explorar o Bridge no Telegram
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src="/atlas-logo.jpg"
                  alt="Atlas DAO"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
                <span className="text-xl font-bold">Atlas DAO</span>
              </div>
              <p className="text-gray-400">
                Desenvolvendo ferramentas de código aberto para a soberania financeira individual.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Contato & Comunidade</h3>
              <div className="space-y-2">
                <a href="mailto:contato@atlasdao.info" className="flex items-center gap-2 text-gray-400 hover:text-white">
                  <Mail className="w-4 h-4" />
                  E-mail
                </a>
                <a href="https://github.com/atlasdao" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-white">
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
                <a href="https://t.me/atlas_bridge_bot" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-white">
                  <MessageCircle className="w-4 h-4" />
                  Telegram
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Apoie o Projeto</h3>
              <p className="text-gray-400 text-sm mb-3">
                Doações (Liquid: L-BTC, DePix):
              </p>
              <div className="bg-gray-800 rounded-lg p-3">
                <code className="text-xs text-blue-400 break-all">
                  {donationAddress}
                </code>
                <button
                  onClick={copyToClipboard}
                  className="mt-2 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>© 2025 Atlas DAO. Lançado sob a licença GPLv3.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}