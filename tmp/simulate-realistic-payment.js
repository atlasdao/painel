const http = require('http');

// Payment simulation data
const PAYMENT_DATA = {
    qrCode: "00020101021226860014br.gov.bcb.pix2564qrcode.fitbank.com.br/QR/cob/EA1601C9184054F918F70BE7FAFF019ED6E5204000053039865802BR5925PLEBANK.COM.BR SOLUCOES E6007BARUERI61080645400062070503***6304438E",
    euid: "EU018514571336728",
    amount: 3.00,
    payerName: "João Silva Santos",
    payerCPF: "12345678901",
    payerEmail: "joao.silva@email.com",
    payerPhone: "11987654321",
    bankName: "Banco do Brasil",
    bankCode: "001",
    agencia: "1234",
    conta: "567890",
    liquidAddress: "lq1qq239cfatjs6l8wu3fure6mmteyd6n7et3xgj4k3lf58a58nvddkxqcu8q7han8k4xxjeeu7th9mp6yhmslc2kpka0f7x5yf92"
};

async function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => {
                responseBody += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseBody);
                    resolve({ status: res.statusCode, headers: res.headers, data: parsed });
                } catch (error) {
                    resolve({ status: res.statusCode, headers: res.headers, data: responseBody });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function simulateRealisticPayment() {
    console.log('🎯 REALISTIC PAYMENT SIMULATION');
    console.log('==============================');
    console.log(`💰 Amount: R$ ${PAYMENT_DATA.amount}`);
    console.log(`🔑 EUID: ${PAYMENT_DATA.euid}`);
    console.log(`👤 Payer: ${PAYMENT_DATA.payerName}`);
    console.log(`📱 Phone: ${PAYMENT_DATA.payerPhone}`);
    console.log(`📧 Email: ${PAYMENT_DATA.payerEmail}`);
    console.log(`🏦 Bank: ${PAYMENT_DATA.bankName} (${PAYMENT_DATA.bankCode})`);
    console.log(`🌐 Liquid Address: ${PAYMENT_DATA.liquidAddress.substring(0, 20)}...`);
    console.log('');

    try {
        // Step 1: Login as admin to access webhook endpoint
        console.log('📝 Step 1: Admin authentication...');
        const loginOptions = {
            hostname: 'localhost',
            port: 19997,
            path: '/api/v1/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const loginResponse = await makeRequest(loginOptions, {
            emailOrUsername: 'admin',
            password: 'admin123'
        });

        if (loginResponse.status !== 200) {
            console.log('❌ Admin login failed:', loginResponse.data);
            return;
        }

        const adminToken = loginResponse.data.accessToken;
        console.log('✅ Admin authenticated successfully');
        console.log('');

        // Step 2: Simulate PIX payment notification from bank
        console.log('📝 Step 2: Simulating PIX payment notification...');

        // Generate realistic transaction data
        const now = new Date();
        const bankTransactionId = `TXN${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const pixEndToEndId = `E${PAYMENT_DATA.bankCode}${now.toISOString().replace(/[-:T.]/g, '').substring(0, 16)}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        const webhookPayload = {
            // PIX payment data
            endToEndId: pixEndToEndId,
            txId: bankTransactionId,
            amount: PAYMENT_DATA.amount,
            currency: "BRL",
            timestamp: now.toISOString(),

            // Payer information (quem pagou)
            payer: {
                name: PAYMENT_DATA.payerName,
                cpf: PAYMENT_DATA.payerCPF,
                email: PAYMENT_DATA.payerEmail,
                phone: PAYMENT_DATA.payerPhone,
                bank: {
                    name: PAYMENT_DATA.bankName,
                    code: PAYMENT_DATA.bankCode,
                    agencia: PAYMENT_DATA.agencia,
                    conta: PAYMENT_DATA.conta
                }
            },

            // Payee information (Atlas DAO)
            payee: {
                name: "PLEBANK.COM.BR SOLUCOES E",
                pixKey: "qrcode.fitbank.com.br/QR/cob/060E0048D431D05D2198F11D868E636460A",
                bank: {
                    name: "FitBank",
                    code: "422",
                    agencia: "0001",
                    conta: "123456"
                }
            },

            // Transaction details
            description: "Validação de conta Atlas DAO",
            method: "PIX",
            status: "COMPLETED",

            // Atlas-specific fields
            userEUID: PAYMENT_DATA.euid,
            liquidAddress: PAYMENT_DATA.liquidAddress,
            isValidationPayment: true,

            // QR Code reference
            originalQRCode: PAYMENT_DATA.qrCode,

            // Bank metadata
            bankMetadata: {
                authenticationMethod: "SMS + Token",
                deviceInfo: "iPhone 15 Pro - iOS 17.2",
                location: "São Paulo, SP",
                ipAddress: "177.12.34.56",
                sessionId: `SESS${Date.now()}`,
                riskScore: "LOW"
            }
        };

        console.log('📤 Sending payment notification with data:');
        console.log(`   💳 Transaction ID: ${bankTransactionId}`);
        console.log(`   🔗 End-to-End ID: ${pixEndToEndId}`);
        console.log(`   💰 Amount: R$ ${PAYMENT_DATA.amount}`);
        console.log(`   👤 Payer: ${PAYMENT_DATA.payerName} (CPF: ${PAYMENT_DATA.payerCPF})`);
        console.log(`   🔑 EUID: ${PAYMENT_DATA.euid}`);
        console.log(`   📱 Device: ${webhookPayload.bankMetadata.deviceInfo}`);
        console.log(`   📍 Location: ${webhookPayload.bankMetadata.location}`);
        console.log('');

        // Send webhook notification to simulate bank callback
        const webhookOptions = {
            hostname: 'localhost',
            port: 19997,
            path: '/webhooks/pix/payment-received',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`,
                'X-Bank-Signature': 'mock-bank-signature-for-development',
                'X-Bank-Timestamp': now.toISOString(),
                'User-Agent': 'FitBank-PIX-Webhook/1.0'
            }
        };

        const webhookResponse = await makeRequest(webhookOptions, webhookPayload);

        console.log(`📊 Webhook Response Status: ${webhookResponse.status}`);
        console.log('📦 Webhook Response:');
        console.log(JSON.stringify(webhookResponse.data, null, 2));

        if (webhookResponse.status === 200 || webhookResponse.status === 201) {
            console.log('');
            console.log('✅ PAYMENT SIMULATION SUCCESSFUL!');
            console.log('💰 Payment processed and recorded in Atlas system');
            console.log('🔄 User account validation should be updated');
            console.log('📱 User should receive confirmation notification');

            // Step 3: Verify payment was recorded
            console.log('');
            console.log('📝 Step 3: Verifying payment was recorded...');

            const verifyOptions = {
                hostname: 'localhost',
                port: 19997,
                path: `/api/v1/admin/transactions?search=${bankTransactionId}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                }
            };

            const verifyResponse = await makeRequest(verifyOptions);
            console.log(`📊 Verification Status: ${verifyResponse.status}`);

            if (verifyResponse.status === 200 && verifyResponse.data.transactions) {
                const transaction = verifyResponse.data.transactions.find(t =>
                    t.externalId === bankTransactionId ||
                    t.description?.includes('Validação')
                );

                if (transaction) {
                    console.log('✅ Transaction found in database:');
                    console.log(`   💳 ID: ${transaction.id}`);
                    console.log(`   💰 Amount: R$ ${transaction.amount}`);
                    console.log(`   📅 Status: ${transaction.status}`);
                    console.log(`   👤 User: ${transaction.userId || 'N/A'}`);
                } else {
                    console.log('⚠️  Transaction not yet visible in admin panel (may be processing)');
                }
            }

        } else {
            console.log('');
            console.log('❌ PAYMENT SIMULATION FAILED');
            console.log('The webhook endpoint may not be implemented or may have rejected the payment');
        }

    } catch (error) {
        console.error('❌ Simulation Error:', error.message);
        console.log('');
        console.log('💡 This simulation requires:');
        console.log('   1. Backend server running on port 19997');
        console.log('   2. Webhook endpoint: /webhooks/pix/payment-received');
        console.log('   3. Admin authentication working');
        console.log('   4. Transaction recording system active');
    }
}

// Add realistic payment flow summary
console.log('🎯 REALISTIC PIX PAYMENT FLOW SIMULATION');
console.log('========================================');
console.log('');
console.log('This simulation represents a real-world PIX payment where:');
console.log('1. 👤 User scans the QR code in their banking app');
console.log('2. 🏦 Bank processes the PIX payment instantly');
console.log('3. 📡 Bank sends webhook notification to Atlas system');
console.log('4. ⚡ Atlas processes payment and updates user validation');
console.log('5. ✅ User account is validated and ready for use');
console.log('');

simulateRealisticPayment();