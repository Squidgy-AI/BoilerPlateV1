// scripts/seed-database.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables for Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const seedDatabase = async () => {
  console.log('Seeding database...');

  try {
    // Create test users
    const { data: users, error: usersError } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'password123',
      user_metadata: {
        full_name: 'Test User'
      }
    });

    if (usersError) {
      throw usersError;
    }

    console.log('Test user created:', users.user.id);

    // Create a test group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: 'Test Group',
        created_by: users.user.id
      })
      .select()
      .single();

    if (groupError) {
      throw groupError;
    }

    console.log('Test group created:', group.id);

    // Add the user to the group
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: users.user.id,
        role: 'admin',
        is_agent: false
      });

    if (memberError) {
      throw memberError;
    }

    console.log('User added to group as admin');

    // Add agents to the group
    const agents = [
      { id: 'agent1', type: 'ProductManager' },
      { id: 'agent2', type: 'PreSalesConsultant' },
      { id: 'agent3', type: 'SocialMediaManager' }
    ];

    for (const agent of agents) {
      const { error: agentError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: agent.id,
          role: 'member',
          is_agent: true,
          agent_type: agent.type
        });

      if (agentError) {
        console.error(`Error adding agent ${agent.id}:`, agentError);
      } else {
        console.log(`Added agent ${agent.id} to group`);
      }
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

seedDatabase();