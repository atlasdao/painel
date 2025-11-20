# Atlas External API - Usage Examples

## Base URL
```
https://api.atlasdao.info/api/v1/external
```

## Authentication
All endpoints (except health check) require an API key to be sent in the header:
```
X-API-Key: your_api_key_here
```

## Endpoints

### 1. Health Check (Public)
Check if the API is operational.

**Endpoint:** `GET /health`

**Example:**
```bash
curl -X GET https://api.atlasdao.info/api/v1/external/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-18T17:15:00.000Z",
  "version": "1.0.0",
  "service": "Atlas External API"
}
```

### 2. Get Profile
Retrieve authenticated user information.

**Endpoint:** `GET /profile`

**Example:**
```bash
curl -X GET https://api.atlasdao.info/api/v1/external/profile \
  -H "X-API-Key: your_api_key_here"
```

**Response:**
```json
{
  "id": "user_id",
  "username": "username",
  "email": "email@example.com",
  "commerceMode": true,
  "paymentLinksEnabled": false,
  "isAccountValidated": true,
  "createdAt": "2025-10-16T21:36:32.291Z"
}
```

### 3. Create PIX Transaction
Create a new PIX payment transaction.

**Endpoint:** `POST /pix/create`

**Example:**
```bash
curl -X POST https://api.atlasdao.info/api/v1/external/pix/create \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.50,
    "description": "Payment for order #123",
    "taxNumber": "12345678900",
    "merchantOrderId": "ORDER-123"
  }'
```

**Request Body:**
```json
{
  "amount": 100.50,              // Required: Amount in BRL (must be > 0)
  "description": "Payment description", // Optional: Payment description
  "taxNumber": "12345678900",    // Required for amounts >= R$ 3000, optional for amounts < R$ 3000
  "merchantOrderId": "ORDER-123" // Optional: Your internal order ID
}
```

**Response:**
```json
{
  "id": "transaction_id",
  "status": "PENDING",
  "amount": 100.50,
  "description": "Payment for order #123",
  "merchantOrderId": "ORDER-123",
  "createdAt": "2025-10-18T17:14:56.111Z",
  "expiresAt": "2025-10-18T17:44:56.111Z"
}
```

### 4. Get Transaction Status
Check the status of a specific transaction.

**Endpoint:** `GET /pix/status/:id`

**Example:**
```bash
curl -X GET https://api.atlasdao.info/api/v1/external/pix/status/transaction_id \
  -H "X-API-Key: your_api_key_here"
```

**Response:**
```json
{
  "id": "transaction_id",
  "status": "COMPLETED", // PENDING, COMPLETED, FAILED, EXPIRED
  "type": "DEPOSIT",
  "amount": 100.50,
  "description": "Payment for order #123",
  "processedAt": "2025-10-18T17:16:30.000Z",
  "createdAt": "2025-10-18T17:14:56.111Z",
  "updatedAt": "2025-10-18T17:16:30.000Z",
  "merchantOrderId": "ORDER-123",
  "expiresAt": "2025-10-18T17:44:56.111Z",
  "metadata": {
    "source": "EXTERNAL_API",
    "apiKeyRequestId": "api_key_request_id",
    "merchantOrderId": "ORDER-123",
    "taxNumber": "12345678900"
  }
}
```

### 5. List Transactions
Retrieve a list of transactions with optional filters.

**Endpoint:** `GET /pix/transactions`

**Query Parameters:**
- `status` (optional): Filter by status (PENDING, COMPLETED, FAILED, EXPIRED)
- `type` (optional): Filter by type (DEPOSIT, WITHDRAW)
- `startDate` (optional): Start date in ISO 8601 format
- `endDate` (optional): End date in ISO 8601 format
- `merchantOrderId` (optional): Filter by merchant order ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Example:**
```bash
curl -X GET "https://api.atlasdao.info/api/v1/external/pix/transactions?status=COMPLETED&limit=10" \
  -H "X-API-Key: your_api_key_here"
```

**Response:**
```json
{
  "data": [
    {
      "id": "transaction_id",
      "status": "COMPLETED",
      "type": "DEPOSIT",
      "amount": 100.50,
      "description": "Payment for order #123",
      "pixKey": "12345678900",
      "processedAt": "2025-10-18T17:16:30.000Z",
      "createdAt": "2025-10-18T17:14:56.111Z",
      "updatedAt": "2025-10-18T17:16:30.000Z",
      "metadata": {
        "source": "EXTERNAL_API",
        "merchantOrderId": "ORDER-123"
      },
      "merchantOrderId": "ORDER-123"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### 6. Cancel Transaction
Cancel a pending transaction.

**Endpoint:** `DELETE /pix/cancel/:id`

**Example:**
```bash
curl -X DELETE https://api.atlasdao.info/api/v1/external/pix/cancel/transaction_id \
  -H "X-API-Key: your_api_key_here"
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction cancelled successfully",
  "transaction": {
    "id": "transaction_id",
    "status": "CANCELLED"
  }
}
```

### 7. Create Payment Link
Create a reusable payment link. (Requires payment links to be enabled for your account)

**Endpoint:** `POST /payment-links`

**Example:**
```bash
curl -X POST https://api.atlasdao.info/api/v1/external/payment-links \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Product Payment",
    "description": "Payment for premium subscription",
    "amount": 99.90,
    "isCustomAmount": false,
    "walletAddress": "your_wallet_address_here"
  }'
```

**Request Body:**
```json
{
  "title": "Product Payment",       // Required: Link title
  "description": "Description",     // Optional: Link description
  "amount": 99.90,                 // Required if isCustomAmount is false
  "isCustomAmount": false,         // Optional: Allow custom amount (default: false)
  "walletAddress": "wallet_address" // Optional: Wallet address where funds should arrive
}
```

### 8. List Payment Links
Get all payment links for your account.

**Endpoint:** `GET /payment-links`

**Query Parameters:**
- `isActive` (optional): Filter by active status (true/false)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Example:**
```bash
curl -X GET "https://api.atlasdao.info/api/v1/external/payment-links?isActive=true&limit=10" \
  -H "X-API-Key: your_api_key_here"
```

### 9. Get Payment Link Details
Get details of a specific payment link.

**Endpoint:** `GET /payment-links/:id`

**Example:**
```bash
curl -X GET https://api.atlasdao.info/api/v1/external/payment-links/link_id \
  -H "X-API-Key: your_api_key_here"
```

### 10. Get API Usage Statistics
Monitor your API usage and limits.

**Endpoint:** `GET /stats/usage`

**Query Parameters:**
- `days` (optional): Number of days to include (default: 30, max: 90)

**Example:**
```bash
curl -X GET "https://api.atlasdao.info/api/v1/external/stats/usage?days=7" \
  -H "X-API-Key: your_api_key_here"
```

**Response:**
```json
{
  "period": {
    "start": "2025-10-11T17:15:56.454Z",
    "end": "2025-10-18T17:15:56.484Z",
    "days": 7
  },
  "summary": {
    "totalRequests": 150,
    "successfulRequests": 145,
    "errorRate": "3.33%",
    "transactionsCreated": 25,
    "paymentLinksCreated": 5
  },
  "dailyUsage": {
    "2025-10-18": {
      "requests": 50,
      "successful": 48,
      "errors": 2
    }
  },
  "limits": {
    "requestsPerMinute": 100,
    "requestsPerDay": 10000,
    "usageType": "SINGLE_CPF"
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request",
  "timestamp": "2025-10-18T17:00:00.000Z",
  "path": "/api/v1/external/endpoint",
  "requestId": "request_id"
}
```

### Common Error Status Codes:
- `400` - Bad Request: Invalid parameters or request body
- `401` - Unauthorized: Missing or invalid API key
- `403` - Forbidden: Feature not enabled or insufficient permissions
- `404` - Not Found: Resource not found
- `429` - Too Many Requests: Rate limit exceeded
- `500` - Internal Server Error: Server error

## Rate Limits

- **Requests per minute:** 100
- **Requests per day:** 10,000

Rate limits are based on your API key usage type. When exceeded, you'll receive a 429 status code with details about when you can retry.

## Webhooks

For real-time transaction updates, consider implementing webhooks. Contact support to configure webhook endpoints for your account.

## Code Examples

### Node.js (Axios)
```javascript
const axios = require('axios');

const API_KEY = 'your_api_key_here';
const BASE_URL = 'https://api.atlasdao.info/api/v1/external';

// Create PIX transaction
async function createPixTransaction() {
  try {
    const response = await axios.post(
      `${BASE_URL}/pix/create`,
      {
        amount: 100.50,
        description: 'Payment for order #123',
        taxNumber: '12345678900',
        merchantOrderId: 'ORDER-123'
      },
      {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Transaction created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}
```

### Python (Requests)
```python
import requests

API_KEY = 'your_api_key_here'
BASE_URL = 'https://api.atlasdao.info/api/v1/external'

# Create PIX transaction
def create_pix_transaction():
    url = f'{BASE_URL}/pix/create'
    headers = {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
    }
    data = {
        'amount': 100.50,
        'description': 'Payment for order #123',
        'taxNumber': '12345678900',
        'merchantOrderId': 'ORDER-123'
    }

    try:
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        print('Transaction created:', response.json())
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'Error: {e}')
        if e.response:
            print('Response:', e.response.json())
```

### PHP
```php
<?php
$apiKey = 'your_api_key_here';
$baseUrl = 'https://api.atlasdao.info/api/v1/external';

// Create PIX transaction
function createPixTransaction($apiKey, $baseUrl) {
    $url = $baseUrl . '/pix/create';

    $data = [
        'amount' => 100.50,
        'description' => 'Payment for order #123',
        'taxNumber' => '12345678900',
        'merchantOrderId' => 'ORDER-123'
    ];

    $options = [
        'http' => [
            'method' => 'POST',
            'header' => [
                'X-API-Key: ' . $apiKey,
                'Content-Type: application/json'
            ],
            'content' => json_encode($data)
        ]
    ];

    $context = stream_context_create($options);
    $response = file_get_contents($url, false, $context);

    if ($response === false) {
        echo "Error creating transaction\n";
        return null;
    }

    $result = json_decode($response, true);
    echo "Transaction created: " . json_encode($result) . "\n";
    return $result;
}
?>
```

## Support

For API support, feature requests, or to report issues:
- Email: support@atlasdao.info
- Documentation: https://api.atlasdao.info/docs
- Status Page: https://atlasdao.info/status

## Changelog

### Version 1.0.0 (2025-10-18)
- Initial release of External API
- PIX transaction endpoints
- Payment link management
- API usage statistics
- Rate limiting implementation