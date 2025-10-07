const http = require('http');

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

async function simulatePixPayment() {
    console.log('🎯 PIX PAYMENT SIMULATION');
    console.log('========================');

    // Realistic payment data for the new QR code
    const paymentData = {
        endToEndId: "E0012025100621331650I932AF",
        txId: "TXN1759786396503UAL8FI",
        amount: 3.00,
        currency: "BRL",
        timestamp: new Date().toISOString(),
        payer: {
            name: "João Silva Santos",
            cpf: "12345678901",
            email: "joao.silva@email.com",
            phone: "11987654321",
            bank: {
                name: "Banco do Brasil",
                code: "001",
                agencia: "1234",
                conta: "567890"
            }
        },
        payee: {
            name: "PLEBANK.COM.BR SOLUCOES E",
            pixKey: "qrcode.fitbank.com.br/QR/cob/EA1601C9184054F918F70BE7FAFF019ED6E",
            bank: {
                name: "FitBank",
                code: "422",
                agencia: "0001",
                conta: "123456"
            }
        },
        description: "Validação de conta Atlas DAO",
        method: "PIX",
        status: "COMPLETED",
        userEUID: "EU018514571336728",
        liquidAddress: "lq1qq239cfatjs6l8wu3fure6mmteyd6n7et3xgj4k3lf58a58nvddkxqcu8q7han8k4xxjeeu7th9mp6yhmslc2kpka0f7x5yf92",
        isValidationPayment: true,
        originalQRCode: "00020101021226860014br.gov.bcb.pix2564qrcode.fitbank.com.br/QR/cob/EA1601C9184054F918F70BE7FAFF019ED6E5204000053039865802BR5925PLEBANK.COM.BR SOLUCOES E6007BARUERI61080645400062070503***6304438E",
        bankMetadata: {
            authenticationMethod: "SMS + Token",
            deviceInfo: "iPhone 15 Pro - iOS 17.2",
            location: "São Paulo, SP",
            ipAddress: "177.12.34.56",
            sessionId: `SESS${Date.now()}`,
            riskScore: "LOW"
        }
    };

    console.log(`💰 Amount: R$ ${paymentData.amount}`);
    console.log(`👤 Payer: ${paymentData.payer.name}`);
    console.log(`🔑 EUID: ${paymentData.userEUID}`);
    console.log(`💳 Transaction: ${paymentData.txId}`);
    console.log('');

    // Try different webhook endpoint patterns
    const endpoints = [
        '/webhooks/pix/payment-received',
        '/api/webhooks/pix/payment-received',
        '/api/v1/webhooks/pix/payment-received'
    ];

    for (const endpoint of endpoints) {
        console.log(`🔄 Testing endpoint: ${endpoint}`);

        const options = {
            hostname: 'localhost',
            port: 19997,
            path: endpoint,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bank-Signature': 'mock-bank-signature-for-development',
                'X-Bank-Timestamp': paymentData.timestamp,
                'User-Agent': 'FitBank-PIX-Webhook/1.0'
            }
        };

        try {
            const response = await makeRequest(options, paymentData);
            console.log(`📊 Status: ${response.status}`);

            if (response.status === 200 || response.status === 201) {
                console.log('✅ SUCCESS! Payment webhook processed');
                console.log('📦 Response:', JSON.stringify(response.data, null, 2));

                // If successful, we can exit
                return;
            } else {
                console.log(`❌ Failed: ${response.data.message || response.data}`);
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }

        console.log('');
    }

    console.log('🚨 All webhook endpoints failed - webhook functionality may need debugging');
}

simulatePixPayment().catch(console.error);