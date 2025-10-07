#!/bin/bash

echo "🧪 Testando Filtros de Transações - Atlas Painel"
echo "==============================================="

# Verificar se o frontend está rodando
echo "📡 Verificando se o frontend está rodando..."
if ! curl -s http://localhost:11337/ > /dev/null; then
    echo "❌ Frontend não está rodando na porta 11337"
    exit 1
fi
echo "✅ Frontend está rodando"

# Verificar se o backend está rodando
echo "📡 Verificando se o backend está rodando..."
if ! curl -s http://localhost:19997/ > /dev/null; then
    echo "❌ Backend não está rodando na porta 19997"
    exit 1
fi
echo "✅ Backend está rodando"

echo ""
echo "🔧 Correções Implementadas:"
echo "============================="

echo "1. ✅ Corrigido pixService.getTransactions() para aceitar filtros type e status"
echo "   - Adicionado type?: string; no parâmetro"
echo "   - Adicionado status?: string; no parâmetro"
echo "   - Parâmetros são enviados para a API"

echo ""
echo "2. ✅ Corrigido useCallback dependências"
echo "   - Removido transactions.length das dependências para evitar loops"
echo "   - Mantido selectedPeriod, typeFilter, statusFilter, itemsPerPage"

echo ""
echo "3. ✅ Corrigido cálculo de períodos"
echo "   - Função getPeriodOptions() para datas frescas"
echo "   - Correção: 7 dias agora usa -7 dias (era -6)"
echo "   - Correção: 30 dias agora usa -30 dias (era -29)"
echo "   - Correção: 90 dias agora usa -90 dias (era -89)"

echo ""
echo "4. ✅ Melhorado handlePeriodChange"
echo "   - Agora usa datas frescas do getPeriodOptions()"
echo "   - Garante que o período selecionado tem datas atualizadas"

echo ""
echo "5. ✅ Corrigido useEffect de filtros"
echo "   - Agora inclui loadTransactions nas dependências"
echo "   - Remove condição if (!loading) que podia bloquear recarregamento"

echo ""
echo "📋 Para Testar os Filtros:"
echo "========================="
echo "1. Acesse http://localhost:11337/transactions (após login)"
echo "2. Teste filtro de TIPO:"
echo "   - Selecione 'Saques' - deve mostrar apenas WITHDRAW"
echo "   - Selecione 'Depósitos' - deve mostrar apenas DEPOSIT"
echo "   - Selecione 'Transferências' - deve mostrar apenas TRANSFER"
echo ""
echo "3. Teste filtro de STATUS:"
echo "   - Selecione 'Completado' - deve mostrar apenas COMPLETED"
echo "   - Selecione 'Pendente' - deve mostrar apenas PENDING"
echo "   - Selecione 'Processando' - deve mostrar apenas PROCESSING"
echo ""
echo "4. Teste filtro de PERÍODO:"
echo "   - Selecione 'Últimas 24h' - deve mostrar apenas últimas 24 horas"
echo "   - Selecione 'Últimos 7 dias' - deve mostrar apenas últimos 7 dias"
echo "   - Selecione 'Últimos 30 dias' - deve mostrar apenas últimos 30 dias"

echo ""
echo "🔍 Como Verificar se Funcionou:"
echo "==============================="
echo "1. Abra Ferramentas do Desenvolvedor (F12)"
echo "2. Vá para aba Network"
echo "3. Mude um filtro (ex: Tipo para 'Saques')"
echo "4. Procure por requisição para '/pix/transactions'"
echo "5. Verifique se os parâmetros incluem:"
echo "   - type=WITHDRAW (para Saques)"
echo "   - status=COMPLETED (para Completado)"
echo "   - startDate e endDate (para períodos)"

echo ""
echo "🚀 Status: Correções Implementadas e Prontas para Teste"
echo "🎯 Próximo Passo: Teste manual pelo usuário"