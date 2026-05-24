import {memo} from 'react';
import {Controller} from 'react-hook-form';
import {View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AuthLayout} from '../components/AuthLayout';
import {AuthFooterLink} from '../components/AuthFooterLink';
import {useSignUpForm} from '../hooks/useSignUpForm';
import {Button} from '@shared/components/Button';
import {TextField} from '@shared/components/TextField';
import {AppText} from '@shared/components/Text';
import {colors} from '@shared/theme/colors';
import {spacing} from '@shared/theme/spacing';
import type {AuthStackParamList} from '@app/navigation/types';
import {useAuthBusy, useAuthError} from '@store/auth/auth.selectors';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export const SignUpScreen = memo(({navigation}: Props) => {
  const {form, submit} = useSignUpForm();
  const busy = useAuthBusy();
  const error = useAuthError();
  const {control, formState} = form;

  return (
    <AuthLayout title="Create your account" subtitle="Build a calendar that works for you.">
      <Controller
        control={control}
        name="displayName"
        render={({field: {value, onChange, onBlur}}) => (
          <TextField
            label="Name"
            placeholder="Jane Doe"
            autoCapitalize="words"
            autoComplete="name"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={formState.errors.displayName?.message}
          />
        )}
      />

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
            placeholder="8+ chars: upper, lower, number & symbol"
            secureTextEntry
            autoComplete="password-new"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={formState.errors.password?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="confirm"
        render={({field: {value, onChange, onBlur}}) => (
          <TextField
            label="Confirm password"
            placeholder="Repeat your password"
            secureTextEntry
            autoComplete="password-new"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={formState.errors.confirm?.message}
          />
        )}
      />

      {error ? (
        <View style={{marginTop: spacing.xs}}>
          <AppText variant="caption" color={colors.danger}>
            {error}
          </AppText>
        </View>
      ) : null}

      <Button label="Create account" onPress={submit} loading={busy} fullWidth size="lg" />

      <AuthFooterLink
        prompt="Already have an account?"
        cta="Sign in"
        onPress={() => navigation.navigate('SignIn')}
      />
    </AuthLayout>
  );
});
