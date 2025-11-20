const axios = require('axios');

async function simulateWebhook() {
  try {
    console.log('🎯 Simulating webhook POST to trigger payment link webhooks...');

    // Create the webhook payload that matches WebhookDepositEventDto
    const webhookPayload = {
      bankTxId: 'fitbank_TEST_' + Date.now(),
      blockchainTxID: '25a4abb8-e825-4cbe-817a-1f208256c0cb', // Use our transaction ID
      customerMessage: 'Test payment for webhook trigger',
      payerName: 'Cliente Teste',
      payerEUID: 'EU' + Date.now(),
      payerTaxNumber: '12345678900',
      expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min from now
      pixKey: '68fa2517-5c6d-412d-b991-f0762eeec2e3',
      qrId: '019a9ce10bc6759da5fea3888c751a63', // Use the Eulen transaction ID
      status: 'depix_sent', // Status that indicates payment completed
      valueInCents: 37500 // 375 BRL in cents
    };

    console.log('📡 Payload:', JSON.stringify(webhookPayload, null, 2));

    // Send the webhook to our backend
    const response = await axios.post('http://localhost:19997/v1/webhooks/deposit', webhookPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Source': 'test-simulation'
      },
      timeout: 30000
    });

    console.log('✅ Webhook sent successfully!');
    console.log('📋 Response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });

    console.log('🎉 Check backend logs for payment link webhook activity!');

  } catch (error) {
    console.error('❌ Error sending webhook:', {
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : 'No response'
    });
  }
}

simulateWebhook();