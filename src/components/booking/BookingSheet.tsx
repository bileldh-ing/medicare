import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button, type ButtonState } from '@/components/ui/Button';
import { formatDateLabel, formatTimeRange } from '@/features/appointments/dateUtils';
import type { Doctor } from '@/features/doctors/doctors';
import { MAX_FONT_SCALE } from '@/theme/typography';
import { useTheme } from '@/theme';

interface Props {
  visible: boolean;
  doctor: Doctor;
  start: Date | null;
  end: Date | null;
  initialNotes?: string;
  mode: 'book' | 'reschedule';
  state: ButtonState;
  onConfirm: (notes: string) => void;
  onClose: () => void;
}

const MAX_NOTES = 300;

/** Confirmation sheet: doctor, date, time and an optional notes field. */
export function BookingSheet({
  visible,
  doctor,
  start,
  end,
  initialNotes = '',
  mode,
  state,
  onConfirm,
  onClose,
}: Props) {
  const t = useTheme();
  const [notes, setNotes] = useState(initialNotes);
  const [wasVisible, setWasVisible] = useState(visible);

  // Reset the notes each time the sheet opens (adjusting state during render).
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setNotes(initialNotes);
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={mode === 'reschedule' ? 'Confirm new time' : 'Confirm appointment'}
      locked={state !== 'idle'}
    >
      <View
        style={[
          styles.doctorRow,
          { backgroundColor: t.colors.blueTint, borderRadius: t.radii.card },
        ]}
      >
        <Avatar
          name={doctor.name}
          source={doctor.avatarImage}
          gradient={doctor.gradient}
          size={52}
        />
        <View style={styles.flex}>
          <AppText variant="cardTitle">{doctor.name}</AppText>
          <AppText color="secondary">{doctor.specialty}</AppText>
        </View>
      </View>
      {start && end ? (
        <View style={styles.infoRow}>
          <Info icon="calendar" label="Date" value={formatDateLabel(start)} />
          <Info icon="clock" label="Time" value={formatTimeRange(start, end)} />
        </View>
      ) : null}
      <AppText variant="caption" color="secondary" style={styles.notesLabel}>
        Notes for the doctor (optional)
      </AppText>
      <TextInput
        value={notes}
        onChangeText={(v) => setNotes(v.slice(0, MAX_NOTES))}
        placeholder="Symptoms, questions, anything helpful…"
        placeholderTextColor={t.colors.textMuted}
        multiline
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        style={[
          styles.notes,
          t.typography.body,
          { color: t.colors.textPrimary, backgroundColor: t.colors.background, borderRadius: 20 },
        ]}
        accessibilityLabel="Notes for the doctor"
      />
      <AppText variant="small" color="muted" style={styles.counter}>
        {notes.length}/{MAX_NOTES}
      </AppText>
      <Button
        title={mode === 'reschedule' ? 'Confirm Re-Schedule' : 'Confirm Booking'}
        state={state}
        onPress={() => onConfirm(notes)}
        style={styles.confirm}
      />
    </BottomSheet>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: 'calendar' | 'clock';
  label: string;
  value: string;
}) {
  const t = useTheme();
  return (
    <View style={styles.info}>
      <View style={[styles.infoIcon, { backgroundColor: t.colors.blueTint }]}>
        <Feather name={icon} size={18} color={t.colors.primary} />
      </View>
      <View style={styles.flex}>
        <AppText variant="caption" color="secondary">
          {label}
        </AppText>
        <AppText variant="bodyMedium" numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  doctorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginTop: 6 },
  infoRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesLabel: { marginTop: 20, marginBottom: 8 },
  notes: { minHeight: 88, maxHeight: 140, padding: 14, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end', marginTop: 4 },
  confirm: { marginTop: 14 },
});
