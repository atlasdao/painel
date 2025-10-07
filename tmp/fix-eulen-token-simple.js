const { PrismaClient } = require('../Atlas-API/node_modules/@prisma/client');

async function fixEulenToken() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: 'postgresql://atlas_user:atlas_pass123@localhost:5432/atlas_db'
            }
        }
    });

    try {
        console.log('Updating EULEN_API_TOKEN with correct JWT token...');

        const correctToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbGciOiJSUzI1NiIsImVudiI6InByb2QiLCJleHAiOjE3NjE3ODI3MzgsImlhdCI6MTc1OTE5MDczOCwianRpIjoiODNlZGI1NTY1MTUyIiwic2NvcGUiOlsiZGVwb3NpdCIsIndpdGhkcmF3IiwidXNlciJdLCJzdWIiOiJhdGxhczIiLCJ0eXAiOiJKV1QifQ.Z0O0JalJiyaB5kIg5hehp_zLIkYGH4I-dEzWOSym6HkhiOZYYySMUUD_u1nJpeESCZh440XRbMw_zjoqroxPH7uN9pD7-cPNphzIsaTRE_Ebjn9qE5QnxbpP3KUk-w7zbfZ3UH6RsGFzq0J4W0hTAjeIaZngQz-iD7CR4Wh7nmlJYeKZWR9XJCjjWFS23mCT3LN0Zhd4FPlxjDdLKyoBzbD7JhQzzOJwjVqp-Iz3BhyTJRsLECJ9nH6noHS7iTNJtrYcU5vY7yEcgwtSGZnLmBOazVEv1sWPxykXf8_sELkB8FPFo7f5eP5DeErGpWUCO7GhSujis2SRpuIAVdiTw9eF8FQqN9cMRD9t-ek6Qcp3SX19AZuXSQ5SeRhPmCCGENxP9WTmUqQwrX_TqeT6Y7Rd3sS269zTkhr2cYcSPPXOELb5Sa4jw76zvQFrrUFE-M0pd2TOfrIVURavIHt0ZKCti271Fcdj5kOF7FtjkHJBZeIqARLZ7nBTLoD3Zy0E6PM14V8qrGbXOPCbFvjAdOAdNyHQuhIh4cMe1z5KK_CaSyEv0Nzg5kegfGfYEHzWSeTRe5hWEPqJKGD5y8G9E937SBgPvrYEUIlb1SnmrThMtwnaLl9cNz_kiiUEd9T3SOL10dwThZjKrDdYQ_uQ83OwhDxlDbFKzgS5JPvbxLQ';

        console.log('Token length:', correctToken.length);
        console.log('Token preview:', correctToken.substring(0, 50) + '...');

        await prisma.systemSettings.upsert({
            where: { key: 'EULEN_API_TOKEN' },
            update: { value: correctToken },
            create: {
                key: 'EULEN_API_TOKEN',
                value: correctToken,
                description: 'Eulen API JWT token for payment processing'
            }
        });

        console.log('✅ Token updated successfully!');

        // Verify
        const updatedSetting = await prisma.systemSettings.findUnique({
            where: { key: 'EULEN_API_TOKEN' }
        });

        console.log('✅ Verification - Token length in DB:', updatedSetting.value.length);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

fixEulenToken();