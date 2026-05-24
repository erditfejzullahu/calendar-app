import {useCallback} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {signUpSchema, SignUpValues} from '../schemas/auth.schemas';
import {useAuthActions} from '@store/auth/auth.selectors';

export const useSignUpForm = () => {
  const {signUp, clearError} = useAuthActions();

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    mode: 'onTouched',
    defaultValues: {displayName: '', email: '', password: '', confirm: ''},
  });

  const onSubmit = useCallback(
    (values: SignUpValues) => {
      clearError();
      return signUp(values.email, values.password, values.displayName).catch(() => {
        /* surfaced via AuthState.error */
      });
    },
    [signUp, clearError],
  );

  return {form, submit: form.handleSubmit(onSubmit)};
};
