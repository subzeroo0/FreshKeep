import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { toast } from '../../components/Toast';
import { Button, Card, Chip, DateInput, Field, Muted, Pill, Screen, SectionTitle, Stepper, TopBar } from '../../components/ui';
import { api } from '../../lib/api';
import { addDays, formatDate, today as todayISO } from '../../lib/dates';
import { takePhoto, type PhotoSource } from '../../lib/photos';
import { CATEGORY_EMOJI, SHELF_LIFE_RULES } from '../../lib/shelfLife';
import type { Category, Location, Product } from '../../lib/types';
import { allProducts, qtyUnit, useStore } from '../../store/useStore';
import { colors, font, space } from '../../theme';

const PICK_CATS: Category[] = ['milk', 'curd_yogurt', 'paneer', 'cheese', 'butter_ghee', 'cream', 'eggs', 'bread', 'batter', 'leafy_veg', 'vegetables', 'fruits', 'meat', 'fish', 'tofu', 'sauces_condiments', 'beverages', 'ready_to_eat', 'other'];

// M7 product lookup → M8 date capture (typed, or read from a photo when the AI server is connected).
export default function ProductScreen() {
  const { barcode: barcodeParam, photo: photoMode } = useLocalSearchParams<{ barcode?: string; photo?: string }>();
  const barcode = barcodeParam || undefined;
  const products = useStore((s) => s.products);
  const apiUrl = useStore((s) => s.apiUrl);
  const { addProduct, addItem } = useStore();
  const local = useMemo(() => (barcode ? allProducts(products).find((p) => p.barcode === barcode) : undefined), [products, barcode]);
  const [product, setProduct] = useState<Product | undefined>(local);
  const [loading, setLoading] = useState(!local && !!apiUrl && !!barcode);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('other');
  const [count, setCount] = useState(1);
  const [location, setLocation] = useState<Location>('fridge');
  const [expiry, setExpiry] = useState<string | undefined>();
  const [step, setStep] = useState<'product' | 'date'>(local ? 'date' : 'product');
  const [guess, setGuess] = useState<{ brand?: string; packSize?: string; vegMark?: 'veg' | 'non_veg'; uri: string } | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [idError, setIdError] = useState<string | undefined>();

  // M7 step 4 — unknown product: photo of the front of the pack → /ai/identify-product → editable name and category.
  const identify = async (source: PhotoSource) => {
    setIdError(undefined);
    try {
      const shot = await takePhoto(source);
      if (!shot) return;
      setIdentifying(true);
      const r = await api.identifyProduct(shot.base64);
      setName(r.name);
      setCategory(r.category);
      setGuess({ brand: r.brand, packSize: r.packSize, vegMark: r.vegMark, uri: shot.uri });
    } catch (e) {
      setIdError(e instanceof Error ? e.message : 'Couldn’t identify the product');
    } finally {
      setIdentifying(false);
    }
  };

  useEffect(() => {
    if (local || !apiUrl || !barcode) return;
    api
      .product(barcode)
      .then((r) => {
        if (r.found && r.product) {
          const p = addProduct({ ...r.product, barcode, source: r.product.source ?? 'off', allergens: r.product.allergens ?? [] });
          setProduct(p);
          setStep('date');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [barcode, local, apiUrl, addProduct]);

  const cat = product?.category ?? category;
  const rule = SHELF_LIFE_RULES[cat];
  const estimate = addDays(todayISO(), rule.unopenedDays);

  const save = (printed?: string) => {
    let p = product;
    if (!p)
      p = addProduct({
        barcode,
        name: name.trim(),
        category,
        brand: guess?.brand,
        packSize: guess?.packSize,
        vegMark: guess?.vegMark,
        allergens: [],
        source: guess ? 'ai' : 'user',
      });
    const { qty, unit } = qtyUnit(p.packSize, count);
    addItem({
      displayName: p.name,
      category: p.category,
      productId: p.id,
      quantity: qty,
      unit,
      location,
      printedExpiry: printed,
      source: 'scan',
      pricePaise: p.pricePaise ? p.pricePaise * count : undefined,
    });
    toast(printed ? `${p.name} added · Confirmed date` : `${p.name} added · Estimated date`);
    router.dismissTo('/');
  };

  if (loading)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <TopBar title="Looking up…" back />
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand} />
      </View>
    );

  if (step === 'product' && !product)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <TopBar title={photoMode ? 'Photo of a product' : 'New product'} subtitle={barcode ? `Barcode ${barcode}` : 'Snap the front of the pack'} back />
        <Screen footer={<Button title="Next: expiry date" disabled={name.trim().length < 2 || identifying} onPress={() => setStep('date')} />}>
          {!photoMode ? (
            <Card style={{ backgroundColor: colors.warnSoft, marginBottom: space(4) }}>
              <Text style={{ fontWeight: '700', color: colors.text }}>We don’t know this barcode yet</Text>
              <Muted style={{ marginTop: 4 }}>{apiUrl ? 'Take a photo of the front and FreshKeep will fill in the details.' : 'Name it once and FreshKeep will remember it next time.'}</Muted>
            </Card>
          ) : null}
          {apiUrl ? (
            <Card style={{ gap: 10 }}>
              {guess ? <Image source={{ uri: guess.uri }} style={{ width: '100%', height: 180, borderRadius: 12 }} contentFit="cover" /> : null}
              {identifying ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8 }}>
                  <ActivityIndicator color={colors.brand} />
                  <Text style={{ color: colors.text, fontWeight: '600' }}>Reading the pack…</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button title={guess ? 'Retake' : 'Take photo'} icon="camera" style={{ flex: 1 }} onPress={() => identify('camera')} />
                  <Button title="Gallery" icon="image-outline" variant="secondary" style={{ flex: 1 }} onPress={() => identify('library')} />
                </View>
              )}
              {guess ? <Muted>{[guess.brand, guess.packSize, guess.vegMark === 'veg' ? '● Veg' : guess.vegMark === 'non_veg' ? '● Non-veg' : undefined].filter(Boolean).join(' · ') || 'Check the name and category below.'}</Muted> : null}
              {idError ? <Muted style={{ color: colors.danger }}>{idError}</Muted> : null}
            </Card>
          ) : photoMode ? (
            <Card style={{ backgroundColor: colors.warnSoft }}>
              <Text style={{ fontWeight: '700', color: colors.text }}>Connect the AI server to identify products from photos</Text>
              <Muted style={{ marginTop: 4 }}>Profile → AI server. Until then, type the name below.</Muted>
            </Card>
          ) : null}
          <Field label="Product name" value={name} onChangeText={setName} placeholder="e.g. Akshayakalpa Curd 500g" style={{ marginTop: space(5) }} autoFocus={!apiUrl} />
          <SectionTitle>Category</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PICK_CATS.map((c) => (
              <Chip key={c} icon={CATEGORY_EMOJI[c]} label={SHELF_LIFE_RULES[c].label} selected={category === c} onPress={() => setCategory(c)} />
            ))}
          </View>
        </Screen>
      </View>
    );

  const display = product?.name ?? name;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Add to fridge" back />
      <Screen
        footer={
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Skip (estimate it)" variant="outline" style={{ flex: 1 }} onPress={() => save(undefined)} />
            <Button title={expiry ? 'Looks right' : 'Enter a date'} icon="checkmark" disabled={!expiry} style={{ flex: 1 }} onPress={() => save(expiry)} />
          </View>
        }
      >
        <Card style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <Text style={{ fontSize: 40 }}>{CATEGORY_EMOJI[cat]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[font.h3, { color: colors.text }]}>{display}</Text>
            <Muted>{[product?.brand, product?.packSize, rule.label].filter(Boolean).join(' · ')}</Muted>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              {product?.vegMark ? <Pill label={product.vegMark === 'veg' ? '● Veg' : '● Non-veg'} fg={product.vegMark === 'veg' ? colors.ok : '#8B4513'} bg={colors.brandTint} /> : null}
              {barcode ? <Pill label={barcode} fg={colors.textMuted} bg={colors.expiredSoft} /> : null}
            </View>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space(5) }}>
          <Text style={[font.h3, { color: colors.text }]}>How many packs?</Text>
          <Stepper value={count} min={1} max={20} onChange={setCount} />
        </View>
        <ScrollView horizontal style={{ marginTop: space(3) }} contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>
          {(['fridge', 'freezer', 'pantry'] as Location[]).map((l) => (
            <Chip key={l} label={l === 'fridge' ? '🧊 Fridge' : l === 'freezer' ? '❄️ Freezer' : '🗄️ Pantry'} selected={location === l} onPress={() => setLocation(l)} />
          ))}
        </ScrollView>

        <SectionTitle>Expiry date</SectionTitle>
        <Card>
          <DateInput value={expiry} onChange={setExpiry} category={cat} />
          <Muted style={{ marginTop: space(3) }}>
            No date handy? We’ll estimate <Text style={{ fontWeight: '700', color: colors.text }}>{formatDate(estimate)}</Text> — {rule.label.toLowerCase()} lasts about {rule.unopenedDays} days.
          </Muted>
        </Card>
        <Muted style={{ marginTop: space(3), fontSize: 12 }}>📷 Reading the date with the camera turns on once the AI server is connected.</Muted>
      </Screen>
    </View>
  );
}
