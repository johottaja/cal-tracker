import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { AppButton, Card, Field, Heading, Screen } from '@/components/ui';
import { radii, spacing, useAppTheme } from '@/constants/theme';
import { todayLocalDate } from '@/domain/dates';
import { InlineNotice } from '@/features/shared/FeatureUI';
import { useApp } from '@/providers/AppProvider';

function estimationError(caught: unknown): string {
  if (caught instanceof Error) {
    if (caught.name === 'AbortError') return 'Estimate cancelled.';
    return caught.message;
  }
  return 'The estimate could not be generated. Please try again.';
}

export function TextEstimateScreen() {
  const theme = useAppTheme();
  const { online, user, estimateText, setReviewDraft } = useApp();
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const analyze = async () => {
    const text = description.trim();
    if (!text) {
      setError('Describe the food and portion before analyzing.');
      return;
    }
    if (!online) {
      setError('AI estimates need an internet connection. Your description is still here.');
      return;
    }
    if (!user) {
      setError('Restore your account session before using AI estimates.');
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const estimate = await estimateText(text, controller.signal);
      setReviewDraft({
        ...estimate,
        localDate: todayLocalDate(),
        source: 'ai_text',
        notes: estimate.assumptions,
        confidence: estimate.confidence,
        assumptions: estimate.assumptions,
      });
      router.push('/review-entry');
    } catch (caught) {
      setError(estimationError(caught));
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Heading
        title="Describe your food"
        subtitle="Include the amount, cooking method, and sauces when you can."
      />
      {!online ? (
        <InlineNotice kind="offline">You’re offline. AI analysis is unavailable.</InlineNotice>
      ) : null}
      {error ? <InlineNotice kind="error">{error}</InlineNotice> : null}
      <Card style={styles.form}>
        <Field
          label="Describe the food and portion"
          placeholder="e.g. Chicken pasta, one medium bowl"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={1000}
          editable={!loading}
          autoFocus
          accessibilityHint="Include a serving size for a better estimate"
        />
        <Text style={[styles.note, { color: theme.muted }]}>
          You’ll always review and edit the estimate before it is saved.
        </Text>
      </Card>
      <AppButton label="Analyze description" onPress={() => void analyze()} loading={loading} />
      {loading ? (
        <AppButton
          label="Cancel analysis"
          variant="secondary"
          onPress={() => abortRef.current?.abort()}
        />
      ) : null}
      <AppButton label="Enter values manually" variant="ghost" onPress={() => router.replace('/manual-entry')} />
    </Screen>
  );
}

type SelectedImage = {
  uri: string;
  width: number;
  height: number;
};

export function CapturePhotoScreen() {
  const theme = useAppTheme();
  const { online, user, estimatePhoto, setReviewDraft } = useApp();
  const [image, setImage] = useState<SelectedImage | null>(null);
  const [context, setContext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      setImage(null);
    },
    [],
  );

  const choose = async (source: 'camera' | 'library') => {
    setError(null);
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        source === 'camera'
          ? 'Camera access is needed to photograph a meal. You can choose an existing photo instead.'
          : 'Photo access is needed to choose a meal image. You can use the camera or text entry instead.',
      );
      return;
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.9,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.9,
          });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    setImage({ uri: asset.uri, width: asset.width, height: asset.height });
  };

  const analyze = async () => {
    if (!image) {
      setError('Take or choose a photo first.');
      return;
    }
    if (!online) {
      setError('Photo analysis needs an internet connection.');
      return;
    }
    if (!user) {
      setError('Restore your account session before using AI estimates.');
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const resize =
        image.width >= image.height
          ? { resize: { width: Math.min(image.width, 1024) } }
          : { resize: { height: Math.min(image.height, 1024) } };
      const processed = await ImageManipulator.manipulateAsync(image.uri, [resize], {
        compress: 0.72,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      });
      if (!processed.base64) throw new Error('The selected image could not be prepared.');
      const estimate = await estimatePhoto(processed.base64, context.trim(), controller.signal);
      setReviewDraft({
        ...estimate,
        localDate: todayLocalDate(),
        source: 'ai_photo',
        notes: estimate.assumptions,
        confidence: estimate.confidence,
        assumptions: estimate.assumptions,
      });
      setImage(null);
      router.push('/review-entry');
    } catch (caught) {
      setError(estimationError(caught));
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Heading
        title="Analyze a meal photo"
        subtitle="Take a clear overhead photo or choose one from your library."
      />
      <InlineNotice>
        Your resized photo is sent through Cal Tracker’s secure service to OpenAI for analysis. It
        is not saved by Cal Tracker.
      </InlineNotice>
      {!online ? <InlineNotice kind="offline">You’re offline. Photo analysis is unavailable.</InlineNotice> : null}
      {error ? <InlineNotice kind="error">{error}</InlineNotice> : null}

      {image ? (
        <Card style={styles.previewCard}>
          <Image
            source={{ uri: image.uri }}
            resizeMode="cover"
            accessibilityLabel="Selected meal photo"
            style={styles.preview}
          />
          <AppButton
            label="Choose a different photo"
            variant="secondary"
            onPress={() => void choose('library')}
            disabled={loading}
          />
        </Card>
      ) : (
        <View style={[styles.placeholder, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={styles.cameraIcon} importantForAccessibility="no">
            ◉
          </Text>
          <Text style={[styles.placeholderTitle, { color: theme.text }]}>No photo selected</Text>
          <Text style={[styles.note, { color: theme.muted }]}>
            Photos are processed only after you tap Analyze meal.
          </Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <View style={styles.buttonColumn}>
          <AppButton label="Open camera" onPress={() => void choose('camera')} disabled={loading} />
        </View>
        <View style={styles.buttonColumn}>
          <AppButton
            label="Choose photo"
            variant="secondary"
            onPress={() => void choose('library')}
            disabled={loading}
          />
        </View>
      </View>
      <Field
        label="Optional context"
        placeholder="e.g. Only estimate the food on the left"
        value={context}
        onChangeText={setContext}
        multiline
        maxLength={500}
        editable={!loading}
      />
      <AppButton
        label="Analyze meal"
        onPress={() => void analyze()}
        loading={loading}
        disabled={!image || !online}
      />
      {loading ? (
        <AppButton
          label="Cancel analysis"
          variant="secondary"
          onPress={() => abortRef.current?.abort()}
        />
      ) : null}
      <AppButton label="Use text instead" variant="ghost" onPress={() => router.replace('/text-estimate')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  note: { fontSize: 13, lineHeight: 19 },
  previewCard: { gap: spacing.md, padding: spacing.md },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.sm },
  placeholder: {
    aspectRatio: 4 / 3,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  cameraIcon: { fontSize: 42 },
  placeholderTitle: { fontSize: 18, fontWeight: '800' },
  buttonRow: { flexDirection: 'row', gap: spacing.sm },
  buttonColumn: { flex: 1 },
});
