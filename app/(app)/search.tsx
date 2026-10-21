import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DoctorCard } from '@/components/home/DoctorCard';
import { QuickActionsSheet } from '@/components/home/QuickActionsSheet';
import { useDoctorActions } from '@/components/home/useDoctorActions';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useBookmarksStore } from '@/features/doctors/bookmarksStore';
import type { Doctor } from '@/features/doctors/doctors';
import { useDoctorsStore } from '@/features/doctors/doctorsStore';
import { useRecentSearchesStore } from '@/features/doctors/recentSearchesStore';
import { excerpt, searchDoctors, type SearchResult } from '@/features/doctors/search';
import { MAX_FONT_SCALE } from '@/theme/typography';
import { useTheme } from '@/theme';
import { useDebouncedValue } from '@/utils/hooks';
import { useMotion } from '@/utils/motion';

/** Debounced (300 ms) live search over name, specialty and bio with highlighted matches. */
export default function SearchScreen() {
  const { all } = useLocalSearchParams<{ all?: string }>();
  const t = useTheme();
  const m = useMotion();
  const insets = useSafeAreaInsets();
  const doctors = useDoctorsStore((s) => s.doctors);
  const bookmarkIds = useBookmarksStore((s) => s.ids);
  const recent = useRecentSearchesStore((s) => s.items);
  const addRecent = useRecentSearchesStore((s) => s.add);
  const removeRecent = useRecentSearchesStore((s) => s.remove);
  const clearRecent = useRecentSearchesStore((s) => s.clear);
  const { openDoctor, onToggleBookmark, onLongPress, quickDoctor, closeQuick } = useDoctorActions();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 300);
  const showAll = all === '1';
  const bookmarkSet = useMemo(() => new Set(bookmarkIds), [bookmarkIds]);

  const results = useMemo(() => searchDoctors(doctors, debounced), [doctors, debounced]);
  const idle = debounced.trim().length === 0 && !showAll;

  const open = useCallback(
    (d: Doctor, origin?: Parameters<typeof openDoctor>[1]) => {
      if (debounced.trim()) addRecent(debounced);
      Keyboard.dismiss();
      openDoctor(d, origin);
    },
    [addRecent, debounced, openDoctor],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: SearchResult; index: number }) => (
      <Animated.View entering={m.enter(Math.min(index, 6), 40)}>
        <DoctorCard
          doctor={item.doctor}
          bookmarked={bookmarkSet.has(item.doctor.id)}
          onPress={open}
          onToggleBookmark={onToggleBookmark}
          onLongPress={onLongPress}
          query={debounced}
          subtitle={item.field === 'bio' ? excerpt(item.doctor.bio, debounced) : undefined}
        />
      </Animated.View>
    ),
    [bookmarkSet, debounced, m, onLongPress, onToggleBookmark, open],
  );

  return (
    <View
      style={[styles.flex, { backgroundColor: t.colors.background, paddingTop: insets.top + 8 }]}
    >
      <View style={styles.pad}>
        <ScreenHeader title={showAll ? 'All doctors' : 'Search'} />
        <View
          style={[
            styles.field,
            { backgroundColor: t.colors.surface, borderRadius: t.radii.input },
            t.shadows.card,
          ]}
        >
          <Feather name="search" size={22} color={t.colors.textPrimary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus={!showAll}
            placeholder="Search a doctor, medicines, etc..."
            placeholderTextColor={t.colors.textMuted}
            returnKeyType="search"
            onSubmitEditing={() => addRecent(query)}
            autoCorrect={false}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={[styles.input, t.typography.body, { color: t.colors.textPrimary }]}
            accessibilityLabel="Search doctors by name, specialty or condition"
          />
          {query ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Feather name="x-circle" size={20} color={t.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {idle ? (
        <View style={styles.pad}>
          {recent.length ? (
            <>
              <View style={styles.recentHead}>
                <AppText variant="sectionTitle">Recent searches</AppText>
                <Pressable
                  onPress={clearRecent}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Clear recent searches"
                >
                  <AppText color="secondary">Clear</AppText>
                </Pressable>
              </View>
              <View style={styles.recentWrap}>
                {recent.map((r) => (
                  <View key={r} style={styles.recentItem}>
                    <Chip label={r} icon="clock" onPress={() => setQuery(r)} />
                    <Pressable
                      onPress={() => removeRecent(r)}
                      hitSlop={8}
                      style={styles.remove}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${r} from recent searches`}
                    >
                      <Feather name="x" size={14} color={t.colors.textMuted} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <EmptyState
              illustration="search"
              title="Find the right doctor"
              message="Try a name, a specialty like “cardiology”, or a need like “migraine” or “acne”."
              compact
            />
          )}
        </View>
      ) : (
        <FlashList
          data={results}
          keyExtractor={(r) => r.doctor.id}
          renderItem={renderItem}
          extraData={bookmarkSet}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: insets.bottom + 24,
          }}
          ListHeaderComponent={
            debounced.trim() ? (
              <AppText
                variant="caption"
                color="secondary"
                style={styles.count}
                accessibilityLiveRegion="polite"
              >
                {results.length} {results.length === 1 ? 'result' : 'results'}
              </AppText>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              illustration="search"
              title="No doctors found"
              message={`Nothing matches “${debounced}”. Check the spelling or try a specialty.`}
            />
          }
        />
      )}
      <QuickActionsSheet
        doctor={quickDoctor}
        bookmarked={!!quickDoctor && bookmarkSet.has(quickDoctor.id)}
        onClose={closeQuick}
        onBook={(d) => openDoctor(d)}
        onViewProfile={(d) => openDoctor(d)}
        onToggleBookmark={onToggleBookmark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: 20 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 18,
    marginTop: 12,
    gap: 12,
  },
  input: { flex: 1, paddingVertical: 14 },
  recentHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  recentWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  recentItem: { flexDirection: 'row', alignItems: 'center' },
  remove: { width: 28, height: 44, alignItems: 'center', justifyContent: 'center' },
  count: { marginBottom: 12 },
});
