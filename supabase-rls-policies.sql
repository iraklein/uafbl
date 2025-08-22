-- RLS policies for managers table to support auth integration

-- Enable RLS on managers table
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read managers
CREATE POLICY "Allow authenticated users to read managers" ON managers
    FOR SELECT TO authenticated
    USING (true);

-- Allow service role and authenticated users to update their own manager record
CREATE POLICY "Allow users to update their own manager record" ON managers
    FOR UPDATE TO authenticated
    USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid());

-- Allow service role to insert/update managers (for invitations)
CREATE POLICY "Allow service role to manage managers" ON managers
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);