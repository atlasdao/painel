#!/usr/bin/env node

/**
 * Backup Manager - Utilitário de gerenciamento
 *
 * Comandos:
 *   node backup-manager.js status    - Ver status dos backups
 *   node backup-manager.js list      - Listar todos os backups
 *   node backup-manager.js run       - Executar backup manual
 *   node backup-manager.js restore   - Restaurar backup específico
 *   node backup-manager.js verify    - Verificar integridade de backup
 *   node backup-manager.js disk      - Verificar espaço em disco
 *   node backup-manager.js cleanup   - Forçar limpeza de backups antigos
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BACKUP_ROOT = '/home/cmo/backups/automated';
const PROJECT_BACKUP_DIR = path.join(BACKUP_ROOT, 'painel-atlas');

// Cores para terminal
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(date) {
    return new Date(date).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getDirSize(dir) {
    let size = 0;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                size += getDirSize(filePath);
            } else {
                size += stats.size;
            }
        }
    } catch (e) {}
    return size;
}

function getAllBackups() {
    const backups = [];

    if (!fs.existsSync(PROJECT_BACKUP_DIR)) {
        return backups;
    }

    function scanDir(dir) {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const itemPath = path.join(dir, item);
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory()) {
                const manifestPath = path.join(itemPath, 'manifest.json');
                if (fs.existsSync(manifestPath)) {
                    try {
                        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                        backups.push({
                            path: itemPath,
                            manifest,
                            size: getDirSize(itemPath)
                        });
                    } catch (e) {}
                } else {
                    scanDir(itemPath);
                }
            }
        }
    }

    scanDir(PROJECT_BACKUP_DIR);
    return backups.sort((a, b) => new Date(b.manifest.timestamp) - new Date(a.manifest.timestamp));
}

function calculateSHA256(filePath) {
    return new Promise((resolve, reject) => {
        try {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);

            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        } catch (error) {
            reject(error);
        }
    });
}

function showStatus() {
    console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}         SISTEMA DE BACKUP INTELIGENTE - STATUS${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);

    const backups = getAllBackups();
    const totalSize = backups.reduce((acc, b) => acc + b.size, 0);

    // PM2 Status
    try {
        const pm2Status = execSync('pm2 jlist', { encoding: 'utf8' });
        const processes = JSON.parse(pm2Status);
        const backupProcess = processes.find(p => p.name === 'atlas-backup-scheduler');

        if (backupProcess) {
            console.log(`${colors.green}✓${colors.reset} PM2 Process: ${colors.bright}${backupProcess.pm2_env.status}${colors.reset}`);
            console.log(`  Cron: ${backupProcess.pm2_env.cron_restart || 'N/A'}`);
            console.log(`  Restarts: ${backupProcess.pm2_env.restart_time}`);
        } else {
            console.log(`${colors.red}✗${colors.reset} PM2 Process: ${colors.red}NÃO ENCONTRADO${colors.reset}`);
        }
    } catch (e) {
        console.log(`${colors.yellow}?${colors.reset} PM2 Status: Não foi possível verificar`);
    }

    // Disk Space
    console.log();
    try {
        const output = execSync('df -h /home', { encoding: 'utf8' });
        const lines = output.trim().split('\n');
        if (lines.length >= 2) {
            const parts = lines[1].split(/\s+/);
            const used = parts[2];
            const avail = parts[3];
            const usePercent = parts[4];
            const availPercent = 100 - parseInt(usePercent);

            let diskColor = colors.green;
            if (availPercent <= 10) diskColor = colors.red;
            else if (availPercent <= 20) diskColor = colors.yellow;

            console.log(`${colors.bright}Espaço em Disco:${colors.reset}`);
            console.log(`  Usado: ${used} | Disponível: ${diskColor}${avail} (${availPercent}%)${colors.reset}`);
        }
    } catch (e) {
        console.log(`${colors.yellow}?${colors.reset} Disco: Não foi possível verificar`);
    }

    console.log();
    console.log(`${colors.bright}Estatísticas de Backup:${colors.reset}`);
    console.log(`  Total de backups: ${colors.cyan}${backups.length}${colors.reset}`);
    console.log(`  Espaço total usado: ${colors.cyan}${formatBytes(totalSize)}${colors.reset}`);
    console.log(`  Retenção: ${colors.cyan}14 dias${colors.reset}`);
    console.log(`  Frequência: ${colors.cyan}A cada 3 horas${colors.reset}`);

    if (backups.length > 0) {
        const newest = backups[0];
        const oldest = backups[backups.length - 1];

        console.log();
        console.log(`${colors.bright}Último backup:${colors.reset}`);
        console.log(`  Data: ${colors.green}${formatDate(newest.manifest.timestamp)}${colors.reset}`);
        console.log(`  Tamanho: ${formatBytes(newest.size)}`);
        console.log(`  Status: ${newest.manifest.success ? colors.green + '✓ SUCESSO' : colors.red + '✗ FALHA'}${colors.reset}`);

        // Verificar se tem checksums
        const checksumFile = path.join(newest.path, 'checksums.sha256');
        if (fs.existsSync(checksumFile)) {
            console.log(`  Checksums: ${colors.green}✓ Disponível${colors.reset}`);
        }

        console.log();
        console.log(`${colors.bright}Backup mais antigo:${colors.reset}`);
        console.log(`  Data: ${colors.yellow}${formatDate(oldest.manifest.timestamp)}${colors.reset}`);
    }

    console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);
}

function listBackups() {
    console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}                    LISTA DE BACKUPS DISPONÍVEIS${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════════════${colors.reset}\n`);

    const backups = getAllBackups();

    if (backups.length === 0) {
        console.log(`${colors.yellow}Nenhum backup encontrado.${colors.reset}\n`);
        return;
    }

    console.log(`${colors.bright}#    Data/Hora            Tamanho    Status    DB    Code   SHA256${colors.reset}`);
    console.log('─'.repeat(75));

    backups.forEach((backup, index) => {
        const m = backup.manifest;
        const date = formatDate(m.timestamp);
        const size = formatBytes(backup.size).padEnd(10);
        const status = m.success ? `${colors.green}OK${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
        const db = m.database?.success ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
        const code = m.code?.success ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;

        // Verificar checksums
        const checksumFile = path.join(backup.path, 'checksums.sha256');
        const hasChecksums = fs.existsSync(checksumFile);
        const sha = hasChecksums ? `${colors.green}✓${colors.reset}` : `${colors.yellow}-${colors.reset}`;

        console.log(`${String(index + 1).padStart(2)}   ${date}   ${size}   ${status}     ${db}     ${code}      ${sha}`);
    });

    console.log();
    console.log(`Total: ${colors.cyan}${backups.length}${colors.reset} backups\n`);
}

function runBackup() {
    console.log(`\n${colors.bright}${colors.cyan}Iniciando backup manual...${colors.reset}\n`);

    try {
        execSync('node "/home/cmo/Painel Atlas/backup-system/backup.js"', {
            stdio: 'inherit'
        });
    } catch (e) {
        console.log(`\n${colors.red}Erro ao executar backup.${colors.reset}\n`);
    }
}

function restoreBackup(backupIndex) {
    const backups = getAllBackups();

    if (backups.length === 0) {
        console.log(`${colors.red}Nenhum backup disponível para restauração.${colors.reset}`);
        return;
    }

    const index = parseInt(backupIndex) - 1;

    if (isNaN(index) || index < 0 || index >= backups.length) {
        console.log(`${colors.yellow}Uso: node backup-manager.js restore <número>${colors.reset}`);
        console.log('Execute "node backup-manager.js list" para ver backups disponíveis.');
        return;
    }

    const backup = backups[index];

    console.log(`\n${colors.bright}${colors.yellow}⚠️  ATENÇÃO: RESTAURAÇÃO DE BACKUP${colors.reset}\n`);
    console.log(`Backup selecionado: ${formatDate(backup.manifest.timestamp)}`);
    console.log(`Caminho: ${backup.path}`);
    console.log();
    console.log(`${colors.bright}Arquivos disponíveis para restauração:${colors.reset}`);

    const files = fs.readdirSync(backup.path);
    files.forEach(file => {
        const filePath = path.join(backup.path, file);
        const stats = fs.statSync(filePath);
        console.log(`  - ${file} (${formatBytes(stats.size)})`);
    });

    console.log();
    console.log(`${colors.bright}Para restaurar manualmente:${colors.reset}`);
    console.log();

    if (backup.manifest.database?.success) {
        console.log(`${colors.cyan}Banco de dados:${colors.reset}`);
        console.log(`  gunzip -c "${backup.path}/database.sql.gz" > /tmp/restore.sql`);
        console.log(`  PGPASSWORD="xxx" psql -h localhost -p 5433 -U atlas -d fi_atlas_db -f /tmp/restore.sql`);
        console.log();
    }

    if (backup.manifest.code?.success) {
        console.log(`${colors.cyan}Código:${colors.reset}`);
        console.log(`  tar -xzf "${backup.path}/code.tar.gz" -C /home/cmo/Painel\\ Atlas/`);
        console.log();
    }

    console.log(`${colors.yellow}⚠️  Restauração deve ser feita com cuidado! Faça backup do estado atual antes.${colors.reset}\n`);
}

async function verifyBackup(backupIndex) {
    const backups = getAllBackups();

    if (backups.length === 0) {
        console.log(`${colors.red}Nenhum backup disponível para verificação.${colors.reset}`);
        return;
    }

    let index = 0;
    if (backupIndex) {
        index = parseInt(backupIndex) - 1;
        if (isNaN(index) || index < 0 || index >= backups.length) {
            console.log(`${colors.yellow}Uso: node backup-manager.js verify [número]${colors.reset}`);
            console.log('Execute "node backup-manager.js list" para ver backups disponíveis.');
            return;
        }
    }

    const backup = backups[index];

    console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}           VERIFICAÇÃO DE INTEGRIDADE (SHA256)${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);

    console.log(`Backup: ${formatDate(backup.manifest.timestamp)}`);
    console.log(`Caminho: ${backup.path}\n`);

    const checksumFile = path.join(backup.path, 'checksums.sha256');

    if (!fs.existsSync(checksumFile)) {
        console.log(`${colors.yellow}⚠️  Arquivo de checksums não encontrado.${colors.reset}`);
        console.log(`Este backup foi criado antes da implementação de checksums.\n`);
        return;
    }

    const content = fs.readFileSync(checksumFile, 'utf8');
    const lines = content.split('\n').filter(l => l && !l.startsWith('#'));

    console.log(`${colors.bright}Verificando arquivos...${colors.reset}\n`);

    let allValid = true;

    for (const line of lines) {
        const parts = line.split('  ');
        if (parts.length !== 2) continue;

        const [expectedHash, fileName] = parts;
        const filePath = path.join(backup.path, fileName);

        process.stdout.write(`  ${fileName.padEnd(25)} `);

        if (!fs.existsSync(filePath)) {
            console.log(`${colors.red}✗ ARQUIVO NÃO ENCONTRADO${colors.reset}`);
            allValid = false;
            continue;
        }

        try {
            const actualHash = await calculateSHA256(filePath);
            const valid = actualHash === expectedHash;

            if (valid) {
                console.log(`${colors.green}✓ OK${colors.reset}`);
            } else {
                console.log(`${colors.red}✗ HASH INVÁLIDO${colors.reset}`);
                console.log(`    Esperado: ${expectedHash.substring(0, 32)}...`);
                console.log(`    Atual:    ${actualHash.substring(0, 32)}...`);
                allValid = false;
            }
        } catch (error) {
            console.log(`${colors.red}✗ ERRO: ${error.message}${colors.reset}`);
            allValid = false;
        }
    }

    console.log();
    if (allValid) {
        console.log(`${colors.green}✓ Todos os arquivos verificados com sucesso!${colors.reset}`);
        console.log(`  A integridade do backup está ${colors.green}GARANTIDA${colors.reset}.\n`);
    } else {
        console.log(`${colors.red}✗ Alguns arquivos falharam na verificação!${colors.reset}`);
        console.log(`  ${colors.yellow}ATENÇÃO: Este backup pode estar corrompido.${colors.reset}\n`);
    }
}

function showDiskStatus() {
    console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}              MONITORAMENTO DE ESPAÇO EM DISCO${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);

    try {
        // Informações gerais do disco
        const dfOutput = execSync('df -h /home', { encoding: 'utf8' });
        const dfLines = dfOutput.trim().split('\n');

        if (dfLines.length >= 2) {
            const parts = dfLines[1].split(/\s+/);
            const filesystem = parts[0];
            const total = parts[1];
            const used = parts[2];
            const avail = parts[3];
            const usePercent = parseInt(parts[4]);
            const availPercent = 100 - usePercent;

            console.log(`${colors.bright}Disco Principal (/home):${colors.reset}`);
            console.log(`  Filesystem: ${filesystem}`);
            console.log(`  Total: ${total}`);
            console.log(`  Usado: ${used} (${usePercent}%)`);

            let availColor = colors.green;
            let statusIcon = '✓';
            let statusText = 'Saudável';

            if (availPercent <= 10) {
                availColor = colors.red;
                statusIcon = '✗';
                statusText = 'CRÍTICO';
            } else if (availPercent <= 20) {
                availColor = colors.yellow;
                statusIcon = '⚠';
                statusText = 'Atenção';
            }

            console.log(`  Disponível: ${availColor}${avail} (${availPercent}%)${colors.reset}`);
            console.log(`  Status: ${availColor}${statusIcon} ${statusText}${colors.reset}`);
        }

        // Tamanho dos backups
        console.log();
        console.log(`${colors.bright}Uso pelos Backups:${colors.reset}`);

        const backups = getAllBackups();
        const totalBackupSize = backups.reduce((acc, b) => acc + b.size, 0);

        console.log(`  Total de backups: ${backups.length}`);
        console.log(`  Espaço ocupado: ${colors.cyan}${formatBytes(totalBackupSize)}${colors.reset}`);

        // Projeção para 14 dias
        if (backups.length > 0) {
            const avgBackupSize = totalBackupSize / backups.length;
            const maxBackups = 14 * 8; // 14 dias * 8 backups/dia
            const projectedSize = avgBackupSize * maxBackups;

            console.log(`  Tamanho médio por backup: ${formatBytes(avgBackupSize)}`);
            console.log(`  Projeção (14 dias, 8/dia): ${colors.magenta}${formatBytes(projectedSize)}${colors.reset}`);
        }

        // Listar maiores backups
        if (backups.length > 0) {
            console.log();
            console.log(`${colors.bright}Maiores backups:${colors.reset}`);

            const sortedBySize = [...backups].sort((a, b) => b.size - a.size).slice(0, 5);
            sortedBySize.forEach((backup, i) => {
                console.log(`  ${i + 1}. ${formatDate(backup.manifest.timestamp)} - ${formatBytes(backup.size)}`);
            });
        }

        // Alertas
        console.log();
        const dfBytesOutput = execSync('df -B1 /home', { encoding: 'utf8' });
        const dfBytesLines = dfBytesOutput.trim().split('\n');
        if (dfBytesLines.length >= 2) {
            const byteParts = dfBytesLines[1].split(/\s+/);
            const availBytes = parseInt(byteParts[3]);
            const usePercent = parseInt(byteParts[4]);
            const availPercent = 100 - usePercent;

            const maxBackupSizeBytes = 5 * 1024 * 1024 * 1024; // 5GB

            console.log(`${colors.bright}Alertas:${colors.reset}`);

            if (availPercent <= 10) {
                console.log(`  ${colors.red}✗ CRÍTICO: Espaço em disco muito baixo (${availPercent}%)${colors.reset}`);
            } else if (availPercent <= 20) {
                console.log(`  ${colors.yellow}⚠ AVISO: Espaço em disco abaixo de 20% (${availPercent}%)${colors.reset}`);
            } else {
                console.log(`  ${colors.green}✓ Espaço em disco OK${colors.reset}`);
            }

            if (totalBackupSize > maxBackupSizeBytes) {
                console.log(`  ${colors.yellow}⚠ Backups ocupando mais de 5GB (${formatBytes(totalBackupSize)})${colors.reset}`);
            } else {
                console.log(`  ${colors.green}✓ Tamanho dos backups dentro do limite${colors.reset}`);
            }

            // Verificar se cabe próximo backup
            if (backups.length > 0) {
                const avgBackupSize = totalBackupSize / backups.length;
                if (availBytes < avgBackupSize * 1.2) {
                    console.log(`  ${colors.red}✗ Espaço insuficiente para próximo backup!${colors.reset}`);
                }
            }
        }

    } catch (e) {
        console.log(`${colors.red}Erro ao verificar espaço em disco: ${e.message}${colors.reset}`);
    }

    console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);
}

function forceCleanup() {
    console.log(`\n${colors.bright}${colors.cyan}Executando limpeza forçada de backups antigos...${colors.reset}\n`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);

    const backups = getAllBackups();
    let deleted = 0;
    let freedBytes = 0;

    for (const backup of backups) {
        const backupDate = new Date(backup.manifest.timestamp);
        if (backupDate < cutoffDate) {
            console.log(`Deletando: ${backup.path} (${formatBytes(backup.size)})`);
            freedBytes += backup.size;
            execSync(`rm -rf "${backup.path}"`);
            deleted++;
        }
    }

    console.log();
    if (deleted > 0) {
        console.log(`${colors.green}✓${colors.reset} ${deleted} backups antigos removidos.`);
        console.log(`${colors.green}✓${colors.reset} ${formatBytes(freedBytes)} liberados.\n`);
    } else {
        console.log(`${colors.yellow}Nenhum backup antigo encontrado para remover.${colors.reset}\n`);
    }
}

// Main
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
    case 'status':
        showStatus();
        break;
    case 'list':
        listBackups();
        break;
    case 'run':
        runBackup();
        break;
    case 'restore':
        restoreBackup(arg);
        break;
    case 'verify':
        verifyBackup(arg);
        break;
    case 'disk':
        showDiskStatus();
        break;
    case 'cleanup':
        forceCleanup();
        break;
    default:
        console.log(`
${colors.bright}${colors.cyan}Backup Manager - Atlas DAO${colors.reset}

${colors.bright}Comandos disponíveis:${colors.reset}
  ${colors.green}status${colors.reset}      - Ver status geral do sistema de backup
  ${colors.green}list${colors.reset}        - Listar todos os backups disponíveis
  ${colors.green}run${colors.reset}         - Executar backup manualmente
  ${colors.green}restore${colors.reset} N   - Ver instruções de restauração do backup #N
  ${colors.green}verify${colors.reset} [N]  - Verificar integridade SHA256 do backup #N (default: último)
  ${colors.green}disk${colors.reset}        - Ver status detalhado do espaço em disco
  ${colors.green}cleanup${colors.reset}     - Forçar limpeza de backups antigos (>14 dias)

${colors.bright}Exemplos:${colors.reset}
  node backup-manager.js status
  node backup-manager.js list
  node backup-manager.js verify 1
  node backup-manager.js disk
  node backup-manager.js restore 1
`);
}
