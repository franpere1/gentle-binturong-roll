-- Create the 'users' table
CREATE TABLE public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    password text NOT NULL, -- In a real app, store hashed passwords, not plain text
    state text NOT NULL,
    type text NOT NULL, -- 'client', 'provider', 'admin'
    created_at bigint NOT NULL,
    profile_image text,
    phone text,
    category text,
    service_title text,
    service_description text,
    service_image text,
    rate numeric,
    feedback jsonb DEFAULT '[]'::jsonb,
    star_rating integer DEFAULT 0
);

-- Enable Row Level Security (RLS) for 'users' table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy for 'users' table:
-- Allow authenticated users to read all user profiles
CREATE POLICY "Allow authenticated users to read all user profiles"
ON public.users FOR SELECT
TO authenticated
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Allow users to update their own profile"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Allow users to insert their own profile (during registration)
CREATE POLICY "Allow users to insert their own profile"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);


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

-- Policy for 'messages' table:
-- Allow users to send messages (insert)
CREATE POLICY "Allow users to send messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Allow users to read messages where they are sender or receiver
CREATE POLICY "Allow users to read their messages"
ON public.messages FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Allow users to update messages they sent (e.g., mark as read)
CREATE POLICY "Allow users to update their messages"
ON public.messages FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Allow users to delete messages they sent
CREATE POLICY "Allow users to delete their messages"
ON public.messages FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);


-- Create the 'contracts' table
CREATE TABLE public.contracts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.users(id),
    provider_id uuid NOT NULL REFERENCES public.users(id),
    service_title text NOT NULL,
    service_rate numeric NOT NULL,
    status text NOT NULL, -- 'pending', 'offered', 'active', 'finalized', 'cancelled', 'disputed', 'finalized_by_dispute'
    client_deposited boolean DEFAULT FALSE,
    client_action text DEFAULT 'none', -- 'none', 'cancel', 'finalize', 'dispute', 'accept_offer'
    provider_action text DEFAULT 'none', -- 'none', 'cancel', 'finalize', 'make_offer'
    commission_rate numeric NOT NULL DEFAULT 0.10,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    dispute_resolution text -- 'toClient', 'toProvider'
);

-- Enable Row Level Security (RLS) for 'contracts' table
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Policy for 'contracts' table:
-- Allow users to create contracts (insert)
CREATE POLICY "Allow users to create contracts"
ON public.contracts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = client_id);

-- Allow users to read contracts where they are client or provider
CREATE POLICY "Allow users to read their contracts"
ON public.contracts FOR SELECT
TO authenticated
USING (auth.uid() = client_id OR auth.uid() = provider_id);

-- Allow clients/providers to update their own contracts (status, actions, rate)
CREATE POLICY "Allow clients/providers to update their contracts"
ON public.contracts FOR UPDATE
TO authenticated
USING (auth.uid() = client_id OR auth.uid() = provider_id);

-- Allow admin to update any contract (for dispute resolution)
CREATE POLICY "Allow admin to update any contract"
ON public.contracts FOR UPDATE
AS PERMISSIVE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND type = 'admin'));

-- Allow admin to delete any contract
CREATE POLICY "Allow admin to delete any contract"
ON public.contracts FOR DELETE
AS PERMISSIVE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND type = 'admin'));

-- Optional: Add a default admin user if not already present
INSERT INTO public.users (id, name, email, password, state, type, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Admin', 'admin@admin.com', 'kilmanjaro', 'Distrito Capital', 'admin', EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT (email) DO NOTHING;