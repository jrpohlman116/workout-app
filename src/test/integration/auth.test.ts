import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import {
  createTestUser,
  signInTestUser,
  signOutTestUser,
  cleanupTestUser,
  generateTestEmail,
} from './testHelpers';

describe('Authentication Integration Tests', () => {
  let testEmail: string;
  const testPassword = 'TestPassword123!';
  let userId: string | undefined;

  beforeEach(() => {
    testEmail = generateTestEmail();
  });

  afterEach(async () => {
    if (userId) {
      try {
        await cleanupTestUser(userId);
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
    await signOutTestUser();
  });

  it('should sign up a new user', async () => {
    const result = await createTestUser(testEmail, testPassword);

    expect(result.user).toBeDefined();
    expect(result.user?.email).toBe(testEmail);
    userId = result.user?.id;
  });

  it('should sign in an existing user', async () => {
    const signUpResult = await createTestUser(testEmail, testPassword);
    userId = signUpResult.user?.id;

    await signOutTestUser();

    const signInResult = await signInTestUser(testEmail, testPassword);

    expect(signInResult.user).toBeDefined();
    expect(signInResult.user.email).toBe(testEmail);
    expect(signInResult.session).toBeDefined();
  });

  it('should fail to sign in with wrong password', async () => {
    await createTestUser(testEmail, testPassword);
    await signOutTestUser();

    await expect(
      signInTestUser(testEmail, 'WrongPassword123!')
    ).rejects.toThrow();
  });

  it('should sign out successfully', async () => {
    const result = await createTestUser(testEmail, testPassword);
    userId = result.user?.id;

    await signOutTestUser();

    const { data } = await supabase.auth.getSession();
    expect(data.session).toBeNull();
  });

  it('should get current session', async () => {
    const result = await createTestUser(testEmail, testPassword);
    userId = result.user?.id;

    const { data } = await supabase.auth.getSession();

    expect(data.session).toBeDefined();
    expect(data.session?.user.email).toBe(testEmail);
  });
});
