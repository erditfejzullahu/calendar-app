import {useCallback} from 'react';
import {InteractionManager} from 'react-native';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {signInSchema, SignInValues} from '../schemas/auth.schemas';
import {promptEnableBiometricsIfNeeded} from '@services/biometric-login.service';
import {useAuthActions} from '@store/auth/auth.selectors';

export const useSignInForm = () => {
  const {signIn, clearError} = useAuthActions();

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    mode: 'onTouched',
    defaultValues: {email: '', password: ''},
  });

  const onSubmit = useCallback(
    (values: SignInValues) => {
      clearError();
      return signIn(values.email, values.password)
        .then(() => {
          InteractionManager.runAfterInteractions(() => {
            promptEnableBiometricsIfNeeded(values.email, values.password).catch(() => {});
          });
        })
        .catch(() => {
          /* surfaced via AuthState.error */
        });
    },
    [signIn, clearError],
  );

  return {form, submit: form.handleSubmit(onSubmit)};
};
