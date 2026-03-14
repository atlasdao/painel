#!/usr/bin/env node

/**
 * Sistema de Backup Inteligente - Atlas DAO
 *
 * Executa backup completo de:
 * - Base de dados PostgreSQL
 * - Código do projeto (Atlas-API, Atlas-Panel)
 * - Configurações de email (Postfix/Dovecot)
 * - Arquivos de configuração
 *
 * Funcionalidades:
 * - Compressão máxima (gzip nível 9)
 * - Retenção de 14 dias
 * - Verificação SHA256 de integridade
 * - Monitoramento de espaço em disco
 * - Notificações via Telegram (atlas-alert-bot)
 *
 * Estrutura de pastas:
 * /backups/
 *   └── painel-atlas/
 *       └── 2025-11/
 *           └── 26/
 *               └── 03h/
 *                   ├── database.sql.gz
 *                   ├── code.tar.gz
 *                   ├── email-config.tar.gz
 *                   ├── checksums.sha256
 *                   └── manifest.json
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

// ============================================
// CONFIGURAÇÕES
// ============================================

const CONFIG = {
    // Diretório base dos backups
    backupRoot: '/home/cmo/backups/automated',

    // Diretório do projeto
    projectRoot: '/home/cmo/Painel Atlas',

    // Configuração do banco de dados
    database: {
        host: 'localhost',
        port: 5433,
        user: 'atlas',
        password: 'obiLhxBXmKWKLVtOSX6BAETbjeeuFdiLH6RQTxbx3mTeuDHsu2zJywlvy2xik2oC7cwOP',
        name: 'fi_atlas_db'
    },

    // Diretórios para backup de código
    codeDirs: [
        '/home/cmo/Painel Atlas/Atlas-API',
        '/home/cmo/Painel Atlas/Atlas-Panel'
    ],

    // Arquivos de configuração importantes
    configFiles: [
        '/home/cmo/Painel Atlas/Atlas-API/.env',
        '/home/cmo/Painel Atlas/Atlas-Panel/.env',
        '/home/cmo/Painel Atlas/deploy-production.sh',
        '/home/cmo/Painel Atlas/CLAUDE.md'
    ],

    // Configurações de email (requer sudo para algumas)
    emailConfigs: [
        '/etc/postfix/main.cf',
        '/etc/postfix/vmailbox',
        '/etc/postfix/virtual',
        '/etc/dovecot/dovecot.conf',
        '/etc/dovecot/conf.d'
    ],

    // Retenção em dias
    retentionDays: 14,

    // Nível de compressão (1-9, 9 = máximo)
    compressionLevel: 9,

    // Log file
    logFile: '/home/cmo/backups/automated/backup.log',

    // Alert Bot API
    alertBot: {
        host: 'localhost',
        port: 3001,
        endpoint: '/alert'
    },

    // Limites de espaço em disco
    diskSpace: {
        // Alerta quando disco estiver com menos de X% disponível
        warningThresholdPercent: 20,
        // Alerta crítico quando disco estiver com menos de X% disponível
        criticalThresholdPercent: 10,
        // Alerta quando backups ocuparem mais de X GB
        maxBackupSizeGB: 5
    }
};

// ============================================
// UTILIDADES
// ============================================

function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);

    try {
        fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
    } catch (e) {
        // Ignora erro se não conseguir escrever no log
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function executeCommand(command, description) {
    try {
        log(`Executando: ${description}`);
        const output = execSync(command, {
            encoding: 'utf8',
            maxBuffer: 100 * 1024 * 1024, // 100MB buffer
            timeout: 600000 // 10 minutos timeout
        });
        return { success: true, output };
    } catch (error) {
        log(`Erro em "${description}": ${error.message}`, 'ERROR');
        return { success: false, error: error.message };
    }
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        log(`Diretório criado: ${dir}`);
    }
}

function getBackupPath() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');

    return {
        full: path.join(
            CONFIG.backupRoot,
            'painel-atlas',
            `${year}-${month}`,
            day,
            `${hour}h`
        ),
        year,
        month,
        day,
        hour,
        timestamp: now.toISOString()
    };
}

// ============================================
// NOTIFICAÇÕES VIA TELEGRAM
// ============================================

async function sendAlert(message, severity = 'error') {
    return new Promise((resolve) => {
        const data = JSON.stringify({ message, severity });

        const options = {
            hostname: CONFIG.alertBot.host,
            port: CONFIG.alertBot.port,
            path: CONFIG.alertBot.endpoint,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            },
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    log(`Alerta enviado via Telegram: ${severity}`);
                    resolve(true);
                } else {
                    log(`Falha ao enviar alerta: ${res.statusCode}`, 'WARN');
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            log(`Erro ao conectar com alert-bot: ${error.message}`, 'WARN');
            resolve(false);
        });

        req.on('timeout', () => {
            req.destroy();
            log('Timeout ao conectar com alert-bot', 'WARN');
            resolve(false);
        });

        req.write(data);
        req.end();
    });
}

// ============================================
// VERIFICAÇÃO DE INTEGRIDADE (SHA256)
// ============================================

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

async function generateChecksums(backupDir, files) {
    log('Gerando checksums SHA256...');

    const checksums = {};
    const checksumFile = path.join(backupDir, 'checksums.sha256');

    for (const file of files) {
        if (fs.existsSync(file)) {
            try {
                const hash = await calculateSHA256(file);
                const fileName = path.basename(file);
                checksums[fileName] = hash;
                log(`SHA256 ${fileName}: ${hash.substring(0, 16)}...`);
            } catch (error) {
                log(`Erro ao calcular SHA256 de ${file}: ${error.message}`, 'ERROR');
            }
        }
    }

    // Salvar arquivo de checksums
    let checksumContent = '# SHA256 Checksums - Atlas Backup System\n';
    checksumContent += `# Generated: ${new Date().toISOString()}\n\n`;

    for (const [fileName, hash] of Object.entries(checksums)) {
        checksumContent += `${hash}  ${fileName}\n`;
    }

    fs.writeFileSync(checksumFile, checksumContent);
    log(`Checksums salvos em: ${checksumFile}`);

    return checksums;
}

async function verifyChecksums(backupDir) {
    const checksumFile = path.join(backupDir, 'checksums.sha256');

    if (!fs.existsSync(checksumFile)) {
        return { success: false, error: 'Arquivo de checksums não encontrado' };
    }

    const content = fs.readFileSync(checksumFile, 'utf8');
    const lines = content.split('\n').filter(l => l && !l.startsWith('#'));

    const results = [];
    let allValid = true;

    for (const line of lines) {
        const [expectedHash, fileName] = line.split('  ');
        if (!expectedHash || !fileName) continue;

        const filePath = path.join(backupDir, fileName);

        if (!fs.existsSync(filePath)) {
            results.push({ file: fileName, valid: false, error: 'Arquivo não encontrado' });
            allValid = false;
            continue;
        }

        try {
            const actualHash = await calculateSHA256(filePath);
            const valid = actualHash === expectedHash;

            results.push({ file: fileName, valid, expectedHash, actualHash });

            if (!valid) {
                allValid = false;
                log(`CHECKSUM INVÁLIDO: ${fileName}`, 'ERROR');
            }
        } catch (error) {
            results.push({ file: fileName, valid: false, error: error.message });
            allValid = false;
        }
    }

    return { success: allValid, results };
}

// ============================================
// MONITORAMENTO DE ESPAÇO EM DISCO
// ============================================

function getDiskSpace() {
    try {
        const output = execSync('df -B1 /home', { encoding: 'utf8' });
        const lines = output.trim().split('\n');

        if (lines.length < 2) return null;

        const parts = lines[1].split(/\s+/);
        const total = parseInt(parts[1]);
        const used = parseInt(parts[2]);
        const available = parseInt(parts[3]);
        const usePercent = parseInt(parts[4].replace('%', ''));

        return {
            total,
            used,
            available,
            usePercent,
            availablePercent: 100 - usePercent
        };
    } catch (error) {
        log(`Erro ao verificar espaço em disco: ${error.message}`, 'ERROR');
        return null;
    }
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
    } catch (e) {
        // Ignora erros
    }

    return size;
}

async function checkDiskSpace(backupSize) {
    log('Verificando espaço em disco...');

    const diskSpace = getDiskSpace();
    const alerts = [];

    if (!diskSpace) {
        alerts.push({
            type: 'error',
            message: 'Não foi possível verificar espaço em disco'
        });
        return { diskSpace: null, alerts };
    }

    log(`Disco: ${formatBytes(diskSpace.available)} disponíveis (${diskSpace.availablePercent}%)`);

    // Verificar threshold crítico
    if (diskSpace.availablePercent <= CONFIG.diskSpace.criticalThresholdPercent) {
        alerts.push({
            type: 'critical',
            message: `CRÍTICO: Apenas ${diskSpace.availablePercent}% de espaço em disco disponível (${formatBytes(diskSpace.available)})`
        });
    }
    // Verificar threshold de warning
    else if (diskSpace.availablePercent <= CONFIG.diskSpace.warningThresholdPercent) {
        alerts.push({
            type: 'warning',
            message: `AVISO: Apenas ${diskSpace.availablePercent}% de espaço em disco disponível (${formatBytes(diskSpace.available)})`
        });
    }

    // Verificar tamanho total dos backups
    const projectBackupDir = path.join(CONFIG.backupRoot, 'painel-atlas');
    if (fs.existsSync(projectBackupDir)) {
        const totalBackupSize = getDirSize(projectBackupDir);
        const maxSizeBytes = CONFIG.diskSpace.maxBackupSizeGB * 1024 * 1024 * 1024;

        log(`Tamanho total dos backups: ${formatBytes(totalBackupSize)}`);

        if (totalBackupSize > maxSizeBytes) {
            alerts.push({
                type: 'warning',
                message: `Backups ocupando ${formatBytes(totalBackupSize)} (limite: ${CONFIG.diskSpace.maxBackupSizeGB}GB)`
            });
        }
    }

    // Verificar se há espaço suficiente para o próximo backup
    const estimatedNextBackupSize = backupSize * 1.2; // 20% de margem
    if (diskSpace.available < estimatedNextBackupSize) {
        alerts.push({
            type: 'critical',
            message: `Espaço insuficiente para próximo backup. Disponível: ${formatBytes(diskSpace.available)}, Necessário: ~${formatBytes(estimatedNextBackupSize)}`
        });
    }

    return { diskSpace, alerts };
}

// ============================================
// FUNÇÕES DE BACKUP
// ============================================

async function backupDatabase(backupDir) {
    log('Iniciando backup do banco de dados...');

    const dbFile = path.join(backupDir, 'database.sql');
    const compressedFile = dbFile + '.gz';

    // Dump do banco usando pg_dump
    const dumpCommand = `PGPASSWORD="${CONFIG.database.password}" pg_dump ` +
        `-h ${CONFIG.database.host} ` +
        `-p ${CONFIG.database.port} ` +
        `-U ${CONFIG.database.user} ` +
        `-d ${CONFIG.database.name} ` +
        `--no-owner --no-acl ` +
        `-f "${dbFile}"`;

    const result = executeCommand(dumpCommand, 'pg_dump database');

    if (!result.success) {
        return { success: false, error: result.error };
    }

    // Comprimir com gzip máximo
    const gzipCommand = `gzip -${CONFIG.compressionLevel} -f "${dbFile}"`;
    const gzipResult = executeCommand(gzipCommand, 'compressão do banco');

    if (!gzipResult.success) {
        return { success: false, error: gzipResult.error };
    }

    const stats = fs.statSync(compressedFile);
    log(`Banco de dados: ${formatBytes(stats.size)}`);

    return {
        success: true,
        file: compressedFile,
        size: stats.size
    };
}

async function backupCode(backupDir) {
    log('Iniciando backup do código...');

    const codeFile = path.join(backupDir, 'code.tar.gz');

    // Criar lista de exclusões
    const excludes = [
        'node_modules',
        '.git',
        '*.log',
        '.next',
        'dist',
        '.turbo',
        'coverage'
    ].map(e => `--exclude="${e}"`).join(' ');

    const tarCommand = `tar -czf "${codeFile}" ${excludes} -C "/home/cmo/Painel Atlas" Atlas-API Atlas-Panel 2>/dev/null`;

    const result = executeCommand(tarCommand, 'backup do código');

    if (!result.success && !fs.existsSync(codeFile)) {
        return { success: false, error: result.error };
    }

    // Recomprimir com máxima compressão usando gzip
    const recompressCmd = `gunzip -c "${codeFile}" | gzip -${CONFIG.compressionLevel} > "${codeFile}.tmp" && mv "${codeFile}.tmp" "${codeFile}"`;
    executeCommand(recompressCmd, 'recompressão do código');

    const stats = fs.statSync(codeFile);
    log(`Código: ${formatBytes(stats.size)}`);

    return {
        success: true,
        file: codeFile,
        size: stats.size
    };
}

async function backupConfigs(backupDir) {
    log('Iniciando backup das configurações...');

    const configFile = path.join(backupDir, 'configs.tar.gz');
    const tempDir = path.join(backupDir, 'temp-configs');

    ensureDir(tempDir);

    // Copiar arquivos de configuração para diretório temporário
    for (const file of CONFIG.configFiles) {
        if (fs.existsSync(file)) {
            const destDir = path.join(tempDir, path.dirname(file));
            ensureDir(destDir);
            try {
                fs.copyFileSync(file, path.join(tempDir, file));
                log(`Config copiado: ${file}`);
            } catch (e) {
                log(`Não foi possível copiar: ${file}`, 'WARN');
            }
        }
    }

    // Criar tarball
    const tarCommand = `tar -czf "${configFile}" -C "${tempDir}" . 2>/dev/null`;
    executeCommand(tarCommand, 'backup das configurações');

    // Limpar diretório temporário
    executeCommand(`rm -rf "${tempDir}"`, 'limpeza temp');

    if (fs.existsSync(configFile)) {
        const stats = fs.statSync(configFile);
        log(`Configurações: ${formatBytes(stats.size)}`);
        return { success: true, file: configFile, size: stats.size };
    }

    return { success: false, error: 'Arquivo não criado' };
}

async function backupEmailSystem(backupDir) {
    log('Iniciando backup do sistema de email...');

    const emailFile = path.join(backupDir, 'email-system.tar.gz');
    const tempDir = path.join(backupDir, 'temp-email');
    ensureDir(tempDir);

    // Copiar arquivos de email que conseguimos acessar
    const emailCopyCommands = [
        `cp /etc/postfix/main.cf "${tempDir}/" 2>/dev/null || true`,
        `cp /etc/postfix/vmailbox "${tempDir}/" 2>/dev/null || true`,
        `cp /etc/postfix/virtual "${tempDir}/" 2>/dev/null || true`,
        `cp -r /etc/dovecot/conf.d "${tempDir}/" 2>/dev/null || true`,
        `cp /etc/dovecot/dovecot.conf "${tempDir}/" 2>/dev/null || true`
    ];

    for (const cmd of emailCopyCommands) {
        executeCommand(cmd, 'cópia de config email');
    }

    // Criar tarball
    const tarCommand = `tar -czf "${emailFile}" -C "${tempDir}" . 2>/dev/null`;
    executeCommand(tarCommand, 'backup email configs');

    // Limpar
    executeCommand(`rm -rf "${tempDir}"`, 'limpeza temp email');

    if (fs.existsSync(emailFile)) {
        const stats = fs.statSync(emailFile);
        log(`Email configs: ${formatBytes(stats.size)}`);
        return { success: true, file: emailFile, size: stats.size };
    }

    return { success: false, error: 'Arquivo não criado' };
}

// ============================================
// ROTAÇÃO DE BACKUPS (14 DIAS)
// ============================================

async function rotateBackups() {
    log('Verificando backups antigos para rotação...');

    const projectBackupDir = path.join(CONFIG.backupRoot, 'painel-atlas');

    if (!fs.existsSync(projectBackupDir)) {
        log('Nenhum backup existente para rotação');
        return { deleted: 0, freed: 0 };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CONFIG.retentionDays);

    let deletedCount = 0;
    let freedBytes = 0;

    // Iterar por diretórios de mês
    const monthDirs = fs.readdirSync(projectBackupDir);

    for (const monthDir of monthDirs) {
        const monthPath = path.join(projectBackupDir, monthDir);

        if (!fs.statSync(monthPath).isDirectory()) continue;

        // Iterar por diretórios de dia
        const dayDirs = fs.readdirSync(monthPath);

        for (const dayDir of dayDirs) {
            const dayPath = path.join(monthPath, dayDir);

            if (!fs.statSync(dayPath).isDirectory()) continue;

            // Iterar por diretórios de hora
            const hourDirs = fs.readdirSync(dayPath);

            for (const hourDir of hourDirs) {
                const hourPath = path.join(dayPath, hourDir);

                if (!fs.statSync(hourPath).isDirectory()) continue;

                // Verificar manifest para data do backup
                const manifestPath = path.join(hourPath, 'manifest.json');

                if (fs.existsSync(manifestPath)) {
                    try {
                        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                        const backupDate = new Date(manifest.timestamp);

                        if (backupDate < cutoffDate) {
                            // Calcular tamanho antes de deletar
                            const dirSize = getDirSize(hourPath);
                            freedBytes += dirSize;

                            // Deletar backup antigo
                            executeCommand(`rm -rf "${hourPath}"`, `deletando backup antigo: ${hourPath}`);
                            deletedCount++;

                            log(`Backup deletado: ${hourPath} (${formatBytes(dirSize)})`);
                        }
                    } catch (e) {
                        // Se não conseguir ler manifest, verificar pela data do diretório
                        const dirStats = fs.statSync(hourPath);
                        if (dirStats.mtime < cutoffDate) {
                            const dirSize = getDirSize(hourPath);
                            freedBytes += dirSize;
                            executeCommand(`rm -rf "${hourPath}"`, `deletando backup antigo: ${hourPath}`);
                            deletedCount++;
                        }
                    }
                }
            }

            // Limpar diretórios de dia vazios
            if (fs.readdirSync(dayPath).length === 0) {
                fs.rmdirSync(dayPath);
                log(`Diretório vazio removido: ${dayPath}`);
            }
        }

        // Limpar diretórios de mês vazios
        if (fs.readdirSync(monthPath).length === 0) {
            fs.rmdirSync(monthPath);
            log(`Diretório vazio removido: ${monthPath}`);
        }
    }

    log(`Rotação completa: ${deletedCount} backups deletados, ${formatBytes(freedBytes)} liberados`);

    return { deleted: deletedCount, freed: freedBytes };
}

// ============================================
// ESTATÍSTICAS DE BACKUP
// ============================================

function getBackupStats() {
    const projectBackupDir = path.join(CONFIG.backupRoot, 'painel-atlas');

    if (!fs.existsSync(projectBackupDir)) {
        return { totalBackups: 0, totalSize: 0, oldestBackup: null, newestBackup: null };
    }

    let totalBackups = 0;
    let totalSize = 0;
    let oldestBackup = null;
    let newestBackup = null;

    function scanDir(dir) {
        const items = fs.readdirSync(dir);

        for (const item of items) {
            const itemPath = path.join(dir, item);
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory()) {
                // Verificar se é um diretório de backup (contém manifest.json)
                const manifestPath = path.join(itemPath, 'manifest.json');

                if (fs.existsSync(manifestPath)) {
                    totalBackups++;
                    totalSize += getDirSize(itemPath);

                    try {
                        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                        const backupDate = new Date(manifest.timestamp);

                        if (!oldestBackup || backupDate < oldestBackup) {
                            oldestBackup = backupDate;
                        }
                        if (!newestBackup || backupDate > newestBackup) {
                            newestBackup = backupDate;
                        }
                    } catch (e) {}
                } else {
                    scanDir(itemPath);
                }
            }
        }
    }

    scanDir(projectBackupDir);

    return { totalBackups, totalSize, oldestBackup, newestBackup };
}

// ============================================
// MAIN
// ============================================

async function main() {
    const startTime = Date.now();

    log('='.repeat(60));
    log('SISTEMA DE BACKUP INTELIGENTE - ATLAS DAO');
    log('='.repeat(60));

    // Criar estrutura de diretórios
    const backupPath = getBackupPath();
    ensureDir(backupPath.full);
    ensureDir(path.dirname(CONFIG.logFile));

    log(`Backup para: ${backupPath.full}`);

    const results = {
        timestamp: backupPath.timestamp,
        path: backupPath.full,
        database: null,
        code: null,
        configs: null,
        email: null,
        checksums: null,
        rotation: null,
        diskSpace: null,
        stats: null,
        alerts: [],
        duration: 0,
        success: true
    };

    const backupFiles = [];

    try {
        // 1. Backup do banco de dados
        results.database = await backupDatabase(backupPath.full);
        if (results.database.file) backupFiles.push(results.database.file);

        // 2. Backup do código
        results.code = await backupCode(backupPath.full);
        if (results.code.file) backupFiles.push(results.code.file);

        // 3. Backup das configurações
        results.configs = await backupConfigs(backupPath.full);
        if (results.configs.file) backupFiles.push(results.configs.file);

        // 4. Backup do sistema de email
        results.email = await backupEmailSystem(backupPath.full);
        if (results.email.file) backupFiles.push(results.email.file);

        // 5. Gerar checksums SHA256
        results.checksums = await generateChecksums(backupPath.full, backupFiles);

        // 6. Rotação de backups antigos
        results.rotation = await rotateBackups();

        // 7. Calcular estatísticas
        results.stats = getBackupStats();

    } catch (error) {
        log(`Erro crítico: ${error.message}`, 'ERROR');
        results.success = false;
        results.error = error.message;
    }

    // Calcular duração
    results.duration = Date.now() - startTime;

    // Calcular tamanho total do backup atual
    results.totalSize = 0;
    if (results.database?.size) results.totalSize += results.database.size;
    if (results.code?.size) results.totalSize += results.code.size;
    if (results.configs?.size) results.totalSize += results.configs.size;
    if (results.email?.size) results.totalSize += results.email.size;

    // 8. Verificar espaço em disco
    const diskCheck = await checkDiskSpace(results.totalSize);
    results.diskSpace = diskCheck.diskSpace;
    results.alerts = diskCheck.alerts;

    // Verificar sucesso geral
    if (!results.database?.success) {
        log('AVISO: Backup do banco de dados falhou!', 'WARN');
        results.success = false;
        results.alerts.push({
            type: 'error',
            message: 'Backup do banco de dados falhou!'
        });
    }

    if (!results.code?.success) {
        log('AVISO: Backup do código falhou!', 'WARN');
        results.success = false;
        results.alerts.push({
            type: 'error',
            message: 'Backup do código falhou!'
        });
    }

    // Salvar manifest
    const manifestPath = path.join(backupPath.full, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(results, null, 2));

    // Resumo final
    log('='.repeat(60));
    log('RESUMO DO BACKUP');
    log('='.repeat(60));
    log(`Status: ${results.success ? 'SUCESSO' : 'FALHA'}`);
    log(`Duração: ${(results.duration / 1000).toFixed(2)} segundos`);
    log(`Tamanho total: ${formatBytes(results.totalSize)}`);
    log(`Banco de dados: ${results.database?.success ? formatBytes(results.database.size) : 'FALHA'}`);
    log(`Código: ${results.code?.success ? formatBytes(results.code.size) : 'FALHA'}`);
    log(`Configurações: ${results.configs?.success ? formatBytes(results.configs.size) : 'FALHA'}`);
    log(`Email: ${results.email?.success ? formatBytes(results.email.size) : 'FALHA'}`);
    log(`Checksums SHA256: ${Object.keys(results.checksums || {}).length} arquivos`);
    log(`Backups deletados na rotação: ${results.rotation?.deleted || 0}`);
    log(`Espaço liberado: ${formatBytes(results.rotation?.freed || 0)}`);
    log(`Total de backups armazenados: ${results.stats?.totalBackups || 0}`);
    log(`Espaço total usado: ${formatBytes(results.stats?.totalSize || 0)}`);
    if (results.diskSpace) {
        log(`Espaço em disco disponível: ${formatBytes(results.diskSpace.available)} (${results.diskSpace.availablePercent}%)`);
    }
    log('='.repeat(60));

    // 9. Enviar notificações
    if (results.success && results.alerts.length === 0) {
        // Backup bem-sucedido sem alertas
        const successMessage = `*Backup Concluído com Sucesso*

*Data:* ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
*Tamanho:* ${formatBytes(results.totalSize)}
*Duração:* ${(results.duration / 1000).toFixed(2)}s

*Arquivos:*
• Database: ${formatBytes(results.database?.size || 0)}
• Código: ${formatBytes(results.code?.size || 0)}
• Configs: ${formatBytes(results.configs?.size || 0)}
• Email: ${formatBytes(results.email?.size || 0)}

*Disco:* ${results.diskSpace?.availablePercent || '?'}% disponível
*Total backups:* ${results.stats?.totalBackups || 0}`;

        await sendAlert(successMessage, 'success');
    } else {
        // Backup com falhas ou alertas
        let alertMessage = `*Backup ${results.success ? 'com Alertas' : 'FALHOU'}*

*Data:* ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;

        if (!results.success) {
            alertMessage += `\n\n*Erros:*`;
            if (!results.database?.success) alertMessage += '\n• Falha no backup do banco de dados';
            if (!results.code?.success) alertMessage += '\n• Falha no backup do código';
            if (results.error) alertMessage += `\n• ${results.error}`;
        }

        if (results.alerts.length > 0) {
            alertMessage += `\n\n*Alertas:*`;
            for (const alert of results.alerts) {
                alertMessage += `\n• ${alert.message}`;
            }
        }

        alertMessage += `\n\n*Disco:* ${results.diskSpace?.availablePercent || '?'}% disponível`;

        const severity = results.alerts.some(a => a.type === 'critical') ? 'error' :
                        !results.success ? 'error' : 'warning';

        await sendAlert(alertMessage, severity);
    }

    return results;
}

// Executar
main()
    .then(results => {
        process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
        log(`Erro fatal: ${error.message}`, 'ERROR');
        sendAlert(`*ERRO FATAL no Backup*\n\n${error.message}`, 'error')
            .finally(() => process.exit(1));
    });

// Exportar funções para uso externo
module.exports = {
    verifyChecksums,
    getDiskSpace,
    getBackupStats
};
