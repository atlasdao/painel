'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Github, MessageCircle, Mail, ExternalLink, Shield, Code2, FileText, HelpCircle } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    produto: [
      { label: 'Recursos', href: '#features' },
      { label: 'Preços', href: '#pricing' },
      { label: 'Integrações', href: '/devs' },
      { label: 'Status do Sistema', href: '/status' }
    ],
    desenvolvedores: [
      { label: 'Documentação', href: '/devs', icon: FileText },
      { label: 'API Reference', href: '/devs#api' },
      { label: 'SDKs', href: '/devs#sdks' },
      { label: 'Webhooks', href: '/devs#webhooks' }
    ],
    suporte: [
      { label: 'Central de Ajuda', href: '#', icon: HelpCircle },
      { label: 'Telegram', href: 'https://t.me/atlasDAO_support', external: true },
      { label: 'Email', href: 'mailto:suporte@atlas.com.br' },
      { label: 'Termos de Uso', href: '#' }
    ]
  };

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/atlas-logo.jpg"
                alt="Atlas"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="text-xl font-bold">Atlas</span>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Gateway de pagamentos moderno, transparente e sem burocracia.
            </p>
            <div className="flex gap-3">
              <a
                href="https://github.com/atlasdao"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://t.me/atlasDAO_support"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                aria-label="Telegram"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
              <a
                href="mailto:contato@atlas.com.br"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links columns */}
          <div className="lg:col-span-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Produto */}
            <div>
              <h3 className="font-semibold text-white mb-4">Produto</h3>
              <ul className="space-y-2">
                {footerLinks.produto.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('#') ? (
                      <button
                        onClick={() => {
                          const element = document.getElementById(link.href.substring(1));
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-1"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a
                        href={link.href}
                        target={link.external ? '_blank' : undefined}
                        rel={link.external ? 'noopener noreferrer' : undefined}
                        className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-1"
                      >
                        {link.label}
                        {link.external && <ExternalLink className="w-3 h-3" />}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Desenvolvedores */}
            <div>
              <h3 className="font-semibold text-white mb-4">Desenvolvedores</h3>
              <ul className="space-y-2">
                {footerLinks.desenvolvedores.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-1"
                    >
                      {link.icon && <link.icon className="w-3 h-3" />}
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suporte */}
            <div>
              <h3 className="font-semibold text-white mb-4">Suporte</h3>
              <ul className="space-y-2">
                {footerLinks.suporte.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noopener noreferrer' : undefined}
                      className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-1"
                    >
                      {link.icon && <link.icon className="w-3 h-3" />}
                      {link.label}
                      {link.external && <ExternalLink className="w-3 h-3" />}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Security badges */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-wrap items-center justify-center gap-8 mb-8">
            <div className="flex items-center gap-2 text-gray-400">
              <Shield className="w-5 h-5" />
              <span className="text-sm">Segurança garantida</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Code2 className="w-5 h-5" />
              <span className="text-sm">API REST moderna</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm">99.9% uptime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © {currentYear} Atlas. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <a href="/privacidade" className="text-gray-500 hover:text-white transition-colors">
                Privacidade
              </a>
              <a href="/termos" className="text-gray-500 hover:text-white transition-colors">
                Termos
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}