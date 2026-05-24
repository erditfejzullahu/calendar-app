import {memo, useCallback, useEffect, useMemo} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import type {Control, FieldErrors} from 'react-hook-form';
import {Alert, ScrollView, StyleSheet, View} from 'react-native';
import BottomSheetModal from '@shared/components/BottomSheetModal';
import {Button} from '@shared/components/Button';
import {TextField} from '@shared/components/TextField';
import {AppText} from '@shared/components/Text';
import {colors} from '@shared/theme/colors';
import {spacing} from '@shared/theme/spacing';
import {authService, mapProfileUpdateError} from '@services/firebase/auth.service';
import {useAuthActions} from '@store/auth/auth.selectors';
import type {AuthUser} from '@app-types/user';
import {createEditProfileSchema, EditProfileFormValues} from '../schemas/edit-profile.schema';

type Props = {
  visible: boolean;
  user: AuthUser | null;
  onClose: () => void;
};

/** Memoized controllers — avoids remount churn when unrelated parent state updates. */
const ProfileEditFields = memo(function ProfileEditFields({
  control,
  errors,
}: {
  control: Control<EditProfileFormValues>;
  errors: FieldErrors<EditProfileFormValues>;
}) {
  return (
    <>
      <Controller
        control={control}
        name="displayName"
        render={({field: {value, onChange, onBlur}}) => (
          <TextField
            label="Full name"
            placeholder="Ada Lovelace"
            autoComplete="name"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.displayName?.message}
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
            error={errors.email?.message}
          />
        )}
      />
      <AppText variant="caption" color={colors.textMuted}>
        Changing email sends a verification link to the new address. Your sign-in email updates after you confirm
        that link (Firebase requirement on this project).
      </AppText>

      <Controller
        control={control}
        name="newPassword"
        render={({field: {value, onChange, onBlur}}) => (
          <TextField
            label="New password (optional)"
            placeholder="Leave blank to keep current"
            secureTextEntry
            autoComplete="new-password"
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.newPassword?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({field: {value, onChange, onBlur}}) => (
          <TextField
            label="Confirm new password"
            placeholder="Repeat new password"
            secureTextEntry
            autoComplete="new-password"
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.confirmPassword?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="currentPassword"
        render={({field: {value, onChange, onBlur}}) => (
          <TextField
            label="Current password"
            placeholder="Needed to change email or password"
            secureTextEntry
            autoComplete="current-password"
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.currentPassword?.message}
          />
        )}
      />
    </>
  );
});

export const EditProfileModal = memo(function EditProfileModal({visible, user, onClose}: Props) {
  const {syncSessionFromFirebase} = useAuthActions();
  const initialEmailLc = useMemo(() => user?.email?.trim().toLowerCase() ?? '', [user?.email]);
  const schema = useMemo(() => createEditProfileSchema(initialEmailLc), [initialEmailLc]);

  const defaultValues = useMemo(
    (): EditProfileFormValues => ({
      displayName: user?.displayName ?? '',
      email: user?.email ?? '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }),
    [user?.displayName, user?.email],
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: {errors, isSubmitting},
  } = useForm<EditProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onTouched',
  });

  useEffect(() => {
    if (visible && user) {
      reset({
        displayName: user.displayName ?? '',
        email: user.email ?? '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [visible, user, reset]);

  const onSubmit = useCallback(
    async (values: EditProfileFormValues) => {
      try {
        const {emailVerificationSent} = await authService.applyProfileUpdates({
          initialEmailLower: initialEmailLc,
          displayName: values.displayName,
          email: values.email,
          currentPassword: values.currentPassword || undefined,
          newPassword: values.newPassword?.trim() || undefined,
        });
        syncSessionFromFirebase();

        const nextEmail = values.email.trim();
        if (emailVerificationSent) {
          Alert.alert(
            'Verification email sent',
            `Open the link Firebase sent to ${nextEmail}. Your sign-in email updates after verification.`,
            [{text: 'OK', onPress: onClose}],
          );
        } else {
          Alert.alert('Profile updated', 'Your changes were saved.', [{text: 'OK', onPress: onClose}]);
        }
      } catch (e) {
        Alert.alert('Could not update profile', mapProfileUpdateError(e));
      }
    },
    [initialEmailLc, onClose, syncSessionFromFirebase],
  );

  if (!user) return null;

  return (
    <BottomSheetModal visible={visible} onClose={onClose} title="Edit profile" maxHeight={640}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <ProfileEditFields control={control} errors={errors} />
          <Button
            label="Save changes"
            loading={isSubmitting}
            fullWidth
            size="lg"
            onPress={() => void handleSubmit(onSubmit)()}
          />
        </View>
      </ScrollView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  form: {gap: spacing.md, paddingBottom: spacing.sm},
});
