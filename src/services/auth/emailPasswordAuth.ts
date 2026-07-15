import type { Session, User } from '@supabase/supabase-js';

import { getSupabaseClient } from '../supabase/client';

export type EmailSignUpStatus = 'signed_in' | 'confirmation_required';

export type EmailPasswordSignInResult = {
  status: 'signed_in';
  session: Session;
  user: User;
};

export type EmailPasswordSignUpResult =
  | EmailPasswordSignInResult
  | {
      status: 'confirmation_required';
    };

export class EmailPasswordAuthService {
  async signIn(email: string, password: string): Promise<EmailPasswordSignInResult> {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    if (!data.session || !data.user) {
      throw new Error('Supabase did not create a session.');
    }
    return { status: 'signed_in', session: data.session, user: data.user };
  }

  async signUp(email: string, password: string): Promise<EmailPasswordSignUpResult> {
    const { data, error } = await getSupabaseClient().auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    if (data.session && data.user) {
      return { status: 'signed_in', session: data.session, user: data.user };
    }
    if (data.user) return { status: 'confirmation_required' };
    throw new Error('Supabase could not create the account.');
  }
}
