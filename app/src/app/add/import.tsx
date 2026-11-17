import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { toast } from '../../components/Toast';
import { Button, Card, Chip, Muted, Screen, SectionTitle, TopBar } from '../../components/ui';
import { SAMPLE_ORDER } from '../../data/demo';
import { api, ApiOffline } from '../../lib/api';
import { addDays, today as todayISO } from '../../lib/dates';
import { buildOrderLines } from '../../lib/orderLines';
import { pickScreenshots, takePhoto, type Photo } from '../../lib/photos';
import type { Platform } from '../../lib/types';
import { allProducts, useStore } from '../../store/useStore';
import { colors, font, radius, space } from '../../theme';

const PLATFORMS: { key: Platform; label: string }[] = [
  { key: 'blinkit', label: 'Blinkit' },
  { key: 'instamart', label: 'Instamart' },
  { key: 'zepto', label: 'Zepto' },
  { key: 'bigbasket', label: 'BigBasket' },
  { key: 'other', label: 'Other' },
];

// M11 — order intake: gallery picker (works in Expo Go and on the web) or the sample order.
export default function ImportOrder() {
  const { createOrder } = useStore();
  const products = useStore((s) => s.products);
  const apiUrl = useStore((s) => s.apiUrl);
  const [images, setImages] = useState<Photo[]>([]);
  const [pickError, setPickError] = useState<string | undefined>();
  const [platform, setPlatform] = useState<Platform>('blinkit');
  const [delivered, setDelivered] = useState(0);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    setPickError(undefined);
    try {
      const shots = await pickScreenshots(5);
      if (shots.length) setImages(shots);
    } catch (e) {
      setPickError(e instanceof Error ? e.message : 'Couldn’t open those images');
    }
  };

  const snap = async () => {
    setPickError(undefined);
    try {
      const shot = await takePhoto('camera');
      if (shot) setImages((prev) => [...prev, shot].slice(0, 5));
    } catch (e) {
      setPickError(e instanceof Error ? e.message : 'Couldn’t take the photo');
    }
  };

  const useSample = () => {
    const id = createOrder(
      { platform: SAMPLE_ORDER.platform, deliveredAt: todayISO(), status: 'review', totalPaise: SAMPLE_ORDER.totalPaise, imageUri: 'sample' },
      buildOrderLines(SAMPLE_ORDER.lines.map((l) => ({ rawText: l.rawText, name: l.parsedName, packSize: l.parsedPackSize, quantity: l.quantity, pricePaise: l.pricePaise })), allProducts(products)),
    );
    router.replace(`/add/review/${id}`);
  };

  const proceed = async () => {
    const deliveredAt = addDays(todayISO(), -delivered);
    setBusy(true);
    try {
      const res = await api.parseOrder(images.map((i) => i.base64));
      if (!res.lines.length) throw new Error('No items found in the screenshot — try a clearer one, or add them below.');
      const id = createOrder(
        { platform: res.platform ?? platform, orderedAt: res.orderedAt, deliveredAt, status: 'review', imageUri: images[0]?.uri },
        buildOrderLines(res.lines, allProducts(products)),
      );
      router.replace(`/add/review/${id}`);
    } catch (e) {
      // No AI server yet (or it failed): keep the screenshot and let the user type the lines.
      const id = createOrder({ platform, deliveredAt, status: 'review', imageUri: images[0]?.uri }, []);
      if (!(e instanceof ApiOffline)) toast(e instanceof Error ? e.message : 'Couldn’t read the screenshot', 'Add the items by hand');
      router.replace({ pathname: '/add/review/[id]', params: { id, manual: '1' } });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Import order" subtitle="From a grocery app screenshot" back />
      <Screen
        footer={
          images.length ? (
            <Button title={apiUrl ? 'Read my order' : 'Continue'} icon="arrow-forward" loading={busy} onPress={proceed} />
          ) : undefined
        }
      >
        {busy ? (
          <Card style={{ alignItems: 'center', padding: space(8) }}>
            <ActivityIndicator color={colors.brand} size="large" />
            <Text style={[font.h3, { color: colors.text, marginTop: space(4) }]}>Reading your order…</Text>
            <Muted>Finding every food item and its price — this takes 10–30 seconds</Muted>
          </Card>
        ) : null}

        <Card style={styles.demoCard} onPress={useSample}>
          <View style={styles.demoIcon}>
            <Ionicons name="sparkles" size={22} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: colors.white, fontSize: 16 }}>Try the sample order</Text>
            <Text style={{ color: '#D7E6D3', marginTop: 2 }}>12 items from a quick-commerce order, already read</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.white} />
        </Card>

        <SectionTitle>Or use your own screenshot</SectionTitle>
        {images.length ? (
          <ScrollView horizontal contentContainerStyle={{ gap: 10 }} showsHorizontalScrollIndicator={false}>
            {images.map((im, i) => (
              <Image key={i} source={{ uri: im.uri }} style={styles.thumb} contentFit="cover" />
            ))}
            <Pressable onPress={pick} style={[styles.thumb, styles.addThumb]}>
              <Ionicons name="images-outline" size={26} color={colors.brand} />
              <Text style={{ color: colors.brand, fontWeight: '700', marginTop: 4 }}>Change</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <View style={{ gap: 10 }}>
            <Pressable onPress={pick} style={styles.drop}>
              <Ionicons name="images-outline" size={34} color={colors.brand} />
              <Text style={{ fontWeight: '700', color: colors.text, marginTop: 8 }}>Pick screenshots</Text>
              <Muted style={{ textAlign: 'center', marginTop: 4 }}>Up to 5 for long orders. Open your order in Blinkit, Instamart or Zepto and screenshot the item list.</Muted>
            </Pressable>
            <Button title="Take a photo of a receipt or bill" icon="camera-outline" variant="outline" onPress={snap} />
          </View>
        )}
        {pickError ? <Muted style={{ color: colors.danger, marginTop: 8 }}>{pickError}</Muted> : null}

        {images.length ? (
          <>
            <SectionTitle>Which app?</SectionTitle>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PLATFORMS.map((p) => (
                <Chip key={p.key} label={p.label} selected={platform === p.key} onPress={() => setPlatform(p.key)} />
              ))}
            </View>
            <SectionTitle>Delivered</SectionTitle>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['Today', 'Yesterday', '2 days ago'].map((l, i) => (
                <Chip key={l} label={l} selected={delivered === i} onPress={() => setDelivered(i)} />
              ))}
            </View>
            {!apiUrl ? (
              <Muted style={{ marginTop: space(4) }}>
                Automatic reading switches on when the AI server is connected. For now you’ll see your screenshot next to a quick list to type the items in.
              </Muted>
            ) : null}
          </>
        ) : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  demoCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.brand },
  demoIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  drop: {
    alignItems: 'center',
    padding: space(6),
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#C9D6C6',
    backgroundColor: colors.brandTint,
  },
  thumb: { width: 110, height: 200, borderRadius: radius.md, backgroundColor: colors.border },
  addThumb: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandTint, borderWidth: 1, borderColor: colors.border },
});
