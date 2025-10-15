'use client';

import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Store, FileText, AlertCircle, Building, Users, Globe, Package, DollarSign, Target, MessageCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/app/lib/api';

interface CommerceApplicationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  productOrService: string;
  averagePrices: string;
  monthlyPixSales: string;
  marketTime: string;
  references: string;
  refundRate: string;
  refundProcess: string;
  businessProof: string;
  contactInfo: string;
  acceptTerms: boolean;
}

const questions = [
  {
    id: 'productOrService',
    label: 'Qual produto ou serviço você vende?',
    placeholder: 'Ex: Roupas femininas, Consultoria em marketing, Cursos online...',
    type: 'textarea',
    icon: Package,
    helper: 'Descreva detalhadamente seus produtos ou serviços'
  },
  {
    id: 'averagePrices',
    label: 'Quais são os valores médios dos seus produtos ou serviços?',
    placeholder: 'Ex: Produtos de R$ 50 a R$ 300, Consultorias de R$ 500 a R$ 2.000',
    type: 'text',
    icon: DollarSign,
    helper: 'Informe a faixa de preços dos seus produtos/serviços'
  },
  {
    id: 'monthlyPixSales',
    label: 'Qual a quantidade e volume mensal médio de vendas via Pix?',
    placeholder: 'Ex: 150 vendas por mês, totalizando R$ 25.000',
    type: 'textarea',
    icon: DollarSign,
    helper: 'Quantidade de transações e valor total mensal via Pix'
  },
  {
    id: 'marketTime',
    label: 'Quanto tempo de mercado você/sua empresa tem?',
    placeholder: 'Ex: 2 anos como pessoa física, 6 meses como empresa',
    type: 'text',
    icon: Building,
    helper: 'Tempo de experiência no mercado ou desde a abertura da empresa'
  },
  {
    id: 'references',
    label: 'Você tem grupos, comunidades ou páginas de referência?',
    placeholder: 'Ex: Google My Business com 4.8 estrelas, Trustpilot, grupo no Telegram com 500 membros',
    type: 'textarea',
    icon: Users,
    helper: 'Links para avaliações, comunidades ou páginas que comprovem sua reputação'
  },
  {
    id: 'refundRate',
    label: 'Qual é sua taxa de reembolso?',
    placeholder: 'Ex: 2% das vendas, menos de 1%, praticamente zero',
    type: 'text',
    icon: Target,
    helper: 'Percentual aproximado de vendas que resultam em reembolso'
  },
  {
    id: 'refundProcess',
    label: 'Como você resolve reembolsos e disputas (MEDs)?',
    placeholder: 'Ex: Reembolso imediato via Pix, troca do produto, crédito para próxima compra',
    type: 'textarea',
    icon: MessageCircle,
    helper: 'Descreva seu processo para resolver problemas e disputas'
  },
  {
    id: 'businessProof',
    label: 'Como podemos comprovar que este negócio pertence a você?',
    placeholder: 'Ex: Posso enviar email do domínio da empresa, mostrar painel admin, fornecer CNPJ',
    type: 'textarea',
    icon: FileText,
    helper: 'Método para verificarmos a propriedade do negócio (será solicitado após aprovação)'
  },
  {
    id: 'contactInfo',
    label: 'Tem Telegram ou SimpleX para contato mais rápido em caso de aprovação?',
    placeholder: 'Ex: @meu_usuario_telegram ou SimpleX ID',
    type: 'text',
    icon: MessageCircle,
    helper: 'Fornece um meio de contato direto para comunicação rápida'
  }
];

export default function CommerceApplicationForm({ isOpen, onClose, onSuccess }: CommerceApplicationFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    productOrService: '',
    averagePrices: '',
    monthlyPixSales: '',
    marketTime: '',
    references: '',
    refundRate: '',
    refundProcess: '',
    businessProof: '',
    contactInfo: '',
    acceptTerms: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentQuestion = questions[currentStep];
  const isLastQuestion = currentStep === questions.length - 1;
  const isReviewStep = currentStep === questions.length;

  const handleNext = () => {
    const fieldId = currentQuestion.id as keyof FormData;
    const value = formData[fieldId];

    if (!value || value === '') {
      toast.error('Por favor, responda a pergunta antes de continuar');
      return;
    }

    if (isLastQuestion) {
      setCurrentStep(questions.length); // Go to review step
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInputChange = (value: string) => {
    const fieldId = currentQuestion.id as keyof FormData;
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // For text inputs, Enter always goes to next question
      if (currentQuestion.type === 'text') {
        e.preventDefault();
        handleNext();
      }
      // For textarea, only Enter (without Shift) goes to next question
      // Shift+Enter allows new lines in textarea
      else if (currentQuestion.type === 'textarea' && !e.shiftKey) {
        e.preventDefault();
        handleNext();
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.acceptTerms) {
      toast.error('Você precisa aceitar os termos para continuar');
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit application to backend with correct field mapping
      const response = await api.post('/admin/requests', {
        businessName: formData.productOrService.substring(0, 100), // Use first 100 chars as business name
        productOrService: formData.productOrService,
        averagePrices: formData.averagePrices,
        monthlyPixSales: formData.monthlyPixSales,
        marketTime: formData.marketTime,
        references: formData.references,
        refundRate: formData.refundRate,
        refundProcess: formData.refundProcess,
        businessProof: formData.businessProof,
        contactInfo: formData.contactInfo,
        acceptTerms: formData.acceptTerms
      });

      toast.success('Aplicação enviada com sucesso!');
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast.error(error.response?.data?.message || 'Erro ao enviar aplicação');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-bounce-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {isReviewStep ? 'Revisar Aplicação' : 'Aplicação para Modo Comércio'}
              </h2>
              <p className="text-white/80 text-sm">
                {isReviewStep
                  ? 'Revise suas respostas antes de enviar'
                  : `Pergunta ${currentStep + 1} de ${questions.length}`
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Progress Bar */}
          {!isReviewStep && (
            <div className="mt-4">
              <div className="bg-white/20 rounded-full h-2">
                <div
                  className="bg-white rounded-full h-2 transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {!isReviewStep ? (
            // Question Step
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <currentQuestion.icon className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <label className="block text-lg font-medium text-white mb-2">
                    {currentQuestion.label}
                  </label>
                  <p className="text-gray-400 text-sm mb-4">
                    {currentQuestion.helper}
                  </p>

                  {currentQuestion.type === 'textarea' ? (
                    <textarea
                      value={formData[currentQuestion.id as keyof FormData] as string}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={currentQuestion.placeholder}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      rows={4}
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData[currentQuestion.id as keyof FormData] as string}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={currentQuestion.placeholder}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Review Step
            <div className="space-y-6">
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-6">
                <p className="text-blue-400 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Revise suas informações antes de enviar
                </p>
              </div>

              {questions.map((question, index) => (
                <div key={question.id} className="pb-4 border-b border-gray-700 last:border-0">
                  <div className="flex items-start gap-3">
                    <question.icon className="w-5 h-5 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-gray-400 text-sm mb-1">{question.label}</p>
                      <p className="text-white">{formData[question.id as keyof FormData] || 'Não respondido'}</p>
                    </div>
                    <button
                      onClick={() => setCurrentStep(index)}
                      className="text-purple-400 hover:text-purple-300 text-sm"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              ))}

              {/* Deposit Information */}
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <h3 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Depósito de Garantia Necessário
                </h3>
                <p className="text-gray-300 text-sm">
                  Após a aprovação, será necessário um depósito de <strong>100.000 satoshis</strong> como garantia.
                  Este valor será devolvido após 3 meses e 200 transações bem-sucedidas.
                </p>
              </div>

              {/* Terms Acceptance */}
              <div className="flex items-start gap-3 p-4 bg-gray-800 rounded-lg">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, acceptTerms: e.target.checked }))}
                  className="mt-1"
                />
                <label htmlFor="acceptTerms" className="text-gray-300 text-sm">
                  Declaro que todas as informações fornecidas são verdadeiras e aceito os termos do Modo Comércio.
                  Entendo que informações falsas podem resultar na suspensão permanente da minha conta.
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-700">
          <div className="flex justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentStep === 0 || isSubmitting}
            >
              <ChevronLeft className="w-5 h-5" />
              Voltar
            </button>

            {!isReviewStep ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all hover:scale-105"
              >
                {isLastQuestion ? 'Revisar' : 'Próxima'}
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.acceptTerms}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Enviar Aplicação
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}