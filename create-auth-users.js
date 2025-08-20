const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// You need the service role key for this (not the anon key)
const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Add this to your .env.local
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createAuthUsers() {
  try {
    // Get all managers with emails
    const { data: managers, error: fetchError } = await supabase
      .from('managers')
      .select('id, manager_name, email')
      .not('email', 'is', null);

    if (fetchError) {
      console.error('Error fetching managers:', fetchError);
      return;
    }

    console.log(`Found ${managers.length} managers with emails`);

    for (const manager of managers) {
      console.log(`\nCreating auth user for ${manager.manager_name} (${manager.email})...`);
      
      // Generate a temporary password
      const tempPassword = `UAFBL${manager.id}${new Date().getFullYear()}`;
      
      // Create auth user
      const { data: user, error: createError } = await supabase.auth.admin.createUser({
        email: manager.email,
        password: tempPassword,
        email_confirm: true, // Skip email verification
        user_metadata: {
          manager_name: manager.manager_name,
          manager_id: manager.id
        }
      });

      if (createError) {
        if (createError.message.includes('already registered')) {
          console.log(`  ✓ User already exists: ${manager.email}`);
        } else {
          console.error(`  ✗ Error creating user: ${createError.message}`);
        }
      } else {
        console.log(`  ✓ Created user: ${manager.email}`);
        console.log(`  📧 Temporary password: ${tempPassword}`);
        console.log(`  🔑 Tell them to change this password after first login!`);
      }
    }

    console.log('\n🎉 Auth user creation complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Share the temporary passwords with each manager');
    console.log('2. Ask them to change passwords after first login');
    console.log('3. Test the login system');

  } catch (error) {
    console.error('Script error:', error.message);
  }
}

if (!serviceRoleKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.log('You need to add your service role key to .env.local:');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
  console.log('\nGet it from: Supabase Dashboard → Settings → API → service_role key');
} else {
  createAuthUsers();
}