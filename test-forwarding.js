// Simple test script for email forwarding
const fetch = require('node-fetch');

async function testForwarding() {
  console.log('🧪 Testing Email Forwarding System...\n');

  // 1. Test domain setup
  console.log('1. Testing domain setup...');
  try {
    const setupResponse = await fetch('http://localhost:3000/api/domains/setup-forwarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain_name: 'test-domain.com',
        forward_to_email: 'demo@veenusra.com'
      })
    });

    const setupResult = await setupResponse.json();
    
    if (setupResult.success) {
      console.log('✅ Domain setup successful');
      console.log(`   Domain: ${setupResult.domain.domain_name}`);
      console.log(`   Forwards to: ${setupResult.domain.forward_to_email}`);
    } else {
      console.log('❌ Domain setup failed:', setupResult.error);
      return;
    }
  } catch (error) {
    console.log('❌ Setup API error:', error.message);
    return;
  }

  // 2. Test forwarding configuration
  console.log('\n2. Testing forwarding configuration...');
  try {
    const configResponse = await fetch('http://localhost:3000/api/test-forwarding?domain=test-domain.com');
    const configResult = await configResponse.json();
    
    if (configResult.isEnabled && configResult.forwardingEmail) {
      console.log('✅ Forwarding configuration working');
      console.log(`   Enabled: ${configResult.isEnabled}`);
      console.log(`   Forwarding to: ${configResult.forwardingEmail}`);
    } else {
      console.log('❌ Forwarding configuration not found');
    }
  } catch (error) {
    console.log('❌ Config test error:', error.message);
  }

  // 3. Show next steps
  console.log('\n3. Next steps:');
  console.log('   📧 Add MAILGUN_API_KEY to .env.local');
  console.log('   🌐 Add DNS records to your domain');
  console.log('   📬 Send test email to verify forwarding');
  
  console.log('\n🎉 System setup complete! Ready for real domain testing.');
}

testForwarding().catch(console.error);