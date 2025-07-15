-- Create the 'users' table
    CREATE TABLE public.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      email text UNIQUE NOT NULL,
      password text NOT NULL,
      state text NOT NULL,
      type text NOT NULL, -- 'client', 'provider', 'admin'
      created_at bigint NOT NULL,
      profile_image text,
      phone text, -- For clients and providers
      category text, -- For providers
      service_title text, -- For providers
      service_description text, -- For providers
      service_image text, -- For providers
      rate numeric, -- For providers
      feedback jsonb DEFAULT '[]'::jsonb, -- For providers
      star_rating integer DEFAULT 0 -- For providers
    );

    -- Enable Row Level Security (RLS) for 'users' table
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

    -- Policy for users to view all users (e.g., for searching providers)
    CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);

    -- Policy for users to update their own profile
    CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

    -- Policy for users to insert their own profile (during registration)
    CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (true);

    -- Create the 'messages' table
    CREATE TABLE public.messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id uuid NOT NULL REFERENCES public.users(id),
      receiver_id uuid NOT NULL REFERENCES public.users(id),
      text text NOT NULL,
      timestamp bigint NOT NULL,
      read_by uuid[] DEFAULT '{}'::uuid[]
    );

    -- Enable Row Level Security (RLS) for 'messages' table
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

    -- Policy for users to view messages where they are sender or receiver
    CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

    -- Policy for users to insert messages
    CREATE POLICY "Users can insert messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

    -- Policy for users to update messages (e.g., mark as read)
    CREATE POLICY "Users can update their own messages" ON public.messages FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

    -- Create the 'contracts' table
    CREATE TABLE public.contracts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES public.users(id),
      provider_id uuid NOT NULL REFERENCES public.users(id),
      service_title text NOT NULL,
      service_rate numeric NOT NULL,
      status text NOT NULL, -- 'pending', 'offered', 'active', 'finalized', 'cancelled', 'disputed', 'finalized_by_dispute'
      client_deposited boolean NOT NULL DEFAULT FALSE,
      client_action text NOT NULL DEFAULT 'none', -- 'none', 'cancel', 'finalize', 'dispute', 'accept_offer'
      provider_action text NOT NULL DEFAULT 'none', -- 'none', 'cancel', 'finalize', 'make_offer'
      commission_rate numeric NOT NULL,
      created_at bigint NOT NULL,
      updated_at bigint NOT NULL,
      dispute_resolution text -- 'toClient', 'toProvider'
    );

    -- Enable Row Level Security (RLS) for 'contracts' table
    ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

    -- Policy for users to view contracts where they are client or provider
    CREATE POLICY "Users can view their own contracts" ON public.contracts FOR SELECT USING (auth.uid() = client_id OR auth.uid() = provider_id);

    -- Policy for clients to create contracts
    CREATE POLICY "Clients can create contracts" ON public.contracts FOR INSERT WITH CHECK (auth.uid() = client_id);

    -- Policy for clients/providers to update their own contracts
    CREATE POLICY "Clients and providers can update their own contracts" ON public.contracts FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = provider_id);

    -- Policy for admin to update any contract (for dispute resolution)
    CREATE POLICY "Admins can update any contract" ON public.contracts FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND type = 'admin'));

    -- Create a function to handle user registration (for password hashing in a real app, but here just for consistency)
    -- In a real app, you'd use Supabase Auth for user management, not direct table inserts for password.
    -- This is a simplified version for demo purposes.
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      -- This function is mostly a placeholder for more complex auth logic.
      -- For this demo, user creation is handled directly by the app's register functions.
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Create the Supabase client in src/lib/supabase.ts