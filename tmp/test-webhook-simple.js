const http = require('http');

// Simple test of the PIX webhook
const testWebhook = () => {
    console.log('🎯 TESTING PIX WEBHOOK');
    console.log('====================');

    const options = {
        hostname: 'localhost',
        port: 19997,
        path: '/webhooks/pix/payment-received',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Bank-Signature': 'test-signature',
            'X-Bank-Timestamp': new Date().toISOString(),
            'User-Agent': 'TestClient/1.0'
        }
    };

    const data = {
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
        originalQRCode: "00020101021226860014br.gov.bcb.pix2564qrcode.fitbank.com.br/QR/cob/EA1601C9184054F918F70BE7FAFF019ED6E5204000053039865802BR5925PLEBANK.COM.BR SOLUCOES E6007BARUERI61080645400062070503***6304438E"
    };

    const req = http.request(options, (res) => {
        console.log(`📊 Status: ${res.statusCode}`);
        console.log(`📋 Headers:`, res.headers);

        let body = '';
        res.on('data', (chunk) => {
            body += chunk;
        });

        res.on('end', () => {
            console.log(`📦 Response:`, body);

            if (res.statusCode === 200 || res.statusCode === 201) {
                console.log('✅ SUCCESS! PIX payment webhook is working');
                try {
                    const response = JSON.parse(body);
                    console.log('📄 Parsed response:', JSON.stringify(response, null, 2));
                } catch (e) {
                    console.log('📄 Raw response:', body);
                }
            } else {
                console.log('❌ FAILED! Webhook returned an error');
            }
        });
    });

    req.on('error', (error) => {
        console.log(`❌ Connection Error: ${error.message}`);
        console.log('💡 Make sure the backend server is running on port 19997');
    });

    req.write(JSON.stringify(data));
    req.end();
};

testWebhook();