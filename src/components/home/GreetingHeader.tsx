import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { CircleButton } from '@/components/ui/CircleButton';
import { greetingFor } from '@/features/appointments/dateUtils';
import { fonts } from '@/theme/typography';
import { useIsReducedMotion } from '@/utils/motion';

interface Props {
  name: string;
  avatarUri: string | null;
  hasUnread: boolean;
  onBellPress: () => void;
  onAvatarPress?: () => void;
  now: Date;
}

/** Avatar + time-aware greeting + full name, bell with green dot that wiggles once. */
export function GreetingHeader({
  name,
  avatarUri,
  hasUnread,
  onBellPress,
  onAvatarPress,
  now,
}: Props) {
  const reduced = useIsReducedMotion();
  const rot = useSharedValue(0);

  useEffect(() => {
    if (!hasUnread || reduced) return;
    rot.set(
      withDelay(
        700,
        withSequence(
          withTiming(-14, { duration: 80 }),
          withTiming(12, { duration: 90 }),
          withTiming(-8, { duration: 90 }),
          withTiming(5, { duration: 80 }),
          withTiming(0, { duration: 80 }),
        ),
      ),
    );
  }, [hasUnread, reduced, rot]);

  const bellStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.get()}deg` }] }));

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Pressable
          onPress={onAvatarPress}
          accessibilityRole="imagebutton"
          accessibilityLabel="Your profile"
          hitSlop={4}
        >
          <Avatar name={name} source={avatarUri} size={56} />
        </Pressable>
        <View style={styles.texts}>
          <AppText variant="body" color="secondary" style={styles.greeting}>
            {greetingFor(now)}
          </AppText>
          <AppText variant="cardTitle" numberOfLines={1} style={styles.name}>
            {name}
          </AppText>
        </View>
      </View>
      <Animated.View style={bellStyle}>
        <CircleButton
          icon="bell"
          dot={hasUnread}
          onPress={onBellPress}
          accessibilityLabel={hasUnread ? 'Reminders, new reminders available' : 'Reminders'}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  texts: { marginLeft: 12, flex: 1 },
  greeting: { fontSize: 14 },
  name: { fontFamily: fonts.medium, fontSize: 18, marginTop: 2 },
});
