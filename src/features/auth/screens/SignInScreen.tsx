import {Controller} from 'react-hook-form';
import {memo, useCallback, useMemo, useState} from 'react';
import {View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AuthLayout} from '../components/AuthLayout';
import {AuthFooterLink} from '../components/AuthFooterLink';
import {useSignInForm} from '../hooks/useSignInForm';
import {Button} from '@shared/components/Button';
import {TextField} from '@shared/components/TextField';
import {AppText} from '@shared/components/Text';
import {colors} from '@shared/theme/colors';
import {spacing} from '@shared/theme/spacing';
import type {AuthStackParamList} from '@app/navigation/types';
import {
  biometricQuickLoginShortLabel,
  hasBiometricStoredCredentials,
  loadCredentialsViaBiometrics,
} from '@services/biometric-login.service';
import {useAuthActions, useAuthBusy, useAuthError} from '@store/auth/auth.selectors';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;


const ErrorDisplay = memo(({error}: {error: string | null}) => {
  if (!error) return null;
  return (
    <View style={{marginTop: spacing.xs}}>
      <AppText variant="caption" color={colors.danger}>
        {error}
      </AppText>
    </View>
  );
});

ErrorDisplay.displayName = 'ErrorDisplay';


export const SignInScreen = memo(({navigation}: Props) => {
  const {form, submit} = useSignInForm();
  const busy = useAuthBusy();
  const error = useAuthError();
  const actions = useAuthActions();
  const {control, formState} = form;

  const [showQuickLogin, setShowQuickLogin] = useState(false);
  const [quickLoginLabel, setQuickLoginLabel] = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const stored = await hasBiometricStoredCredentials();
        const label = stored ? await biometricQuickLoginShortLabel() : '';
        if (cancelled) return;
        setShowQuickLogin(stored);
        setQuickLoginLabel(label || 'Biometrics');
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const onQuickLogin = useCallback(async () => {
    actions.clearError();
    const cred = await loadCredentialsViaBiometrics();
    if (!cred) return;
    await actions.signIn(cred.username, cred.password).catch(() => {});
  }, [actions]);

  const quickLoginButton = useMemo(() => {
    console.log('showQuickLogin', showQuickLogin);
    if (!showQuickLogin) return null;
    return (
      <Button
        label={`Continue with ${quickLoginLabel}`}
        variant="secondary"
        onPress={onQuickLogin}
        loading={busy}
        fullWidth
        size="lg"
        style={{marginBottom: spacing.lg}}
      />
    );
  }, [showQuickLogin, quickLoginLabel, onQuickLogin, busy]);


  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to manage your meetings.">
      {quickLoginButton}

      <Controller
        control={control}
        name="email"
        render={({field: {value, onChange, onBlur}}) => (
          <TextField
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={formState.errors.email?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({field: {value, onChange, onBlur}}) => (
          <TextField
            label="Password"
            placeholder="Your password"
            secureTextEntry
            autoComplete="password"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={formState.errors.password?.message}
          />
        )}
      />

      <ErrorDisplay error={error} />

      <Button label="Sign in" onPress={submit} loading={busy} fullWidth size="lg" />

      <AuthFooterLink
        prompt="Don’t have an account?"
        cta="Create one"
        onPress={() => navigation.navigate('SignUp')}
      />
    </AuthLayout>
  );
});
