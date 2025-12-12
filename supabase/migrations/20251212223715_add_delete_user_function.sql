/*
  # Add delete user function

  1. New Functions
    - `delete_user()` - Allows authenticated users to delete their own account from auth.users
      - Can only be called by authenticated users
      - Deletes the user's auth account
      - Returns void

  2. Security
    - Function runs with security definer privileges to access auth.users
    - Only allows users to delete their own account (checks auth.uid())
    - All related data should be deleted from application tables before calling this function
*/

CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
