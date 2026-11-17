import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, Field, Muted, Screen, TopBar } from '../../components/ui';
import { colors, radius, space } from '../../theme';


// M6 — barcode scanner. Camera on a phone; typed barcode everywhere.
export default function ScanScreen() {
  const [perm, requestPerm] = useCameraPermissions();
  const [manual, setManual] = useState(Platform.OS === 'web');
  const [code, setCode] = useState('');
  const [torch, setTorch] = useState(false);
  const last = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const insets = useSafeAreaInsets();

  const open = (barcode: string) => router.replace({ pathname: '/add/product', params: { barcode } });

  const onScan = ({ data }: { data: string }) => {
    const now = Date.now();
    if (data === last.current.code && now - last.current.at < 2000) return; // ignore repeat reads within 2 s
    if (now - last.current.at < 1200) return;
    last.current = { code: data, at: now };
    Haptics.selectionAsync().catch(() => {});
    open(data);
  };

  if (manual || !perm?.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <TopBar title="Scan item" subtitle="Find the product by its barcode" back />
        <Screen>
          {Platform.OS !== 'web' && !perm?.granted ? (
            <View style={styles.permCard}>
              <Ionicons name="camera-outline" size={28} color={colors.brand} />
              <Text style={{ fontWeight: '700', color: colors.text, marginTop: 8 }}>Use the camera to scan barcodes</Text>
              <Muted style={{ textAlign: 'center', marginTop: 4 }}>FreshKeep only reads the barcode — no photos are stored.</Muted>
              <Button title="Allow camera" icon="camera" style={{ marginTop: 12, alignSelf: 'stretch' }} onPress={async () => {
                const r = await requestPerm();
                if (r.granted) setManual(false);
              }} />
            </View>
          ) : Platform.OS !== 'web' ? (
            <Button title="Back to camera" variant="secondary" icon="camera" onPress={() => setManual(false)} style={{ marginBottom: space(4) }} />
          ) : (
            <View style={styles.webNote}>
              <Ionicons name="phone-portrait-outline" size={20} color={colors.brand} />
              <Muted style={{ flex: 1 }}>Camera scanning runs in the phone app. In this preview, type the barcode printed under the bars.</Muted>
            </View>
          )}

          <Field label="Barcode" value={code} onChangeText={(s) => setCode(s.replace(/\D/g, ''))} placeholder="e.g. 8901262010016" keyboardType="number-pad" />
          <Button title="Find product" icon="search" disabled={code.length < 6} style={{ marginTop: space(3) }} onPress={() => open(code)} />

          <Pressable onPress={() => router.replace('/add/product?photo=1')} style={{ marginTop: space(6) }}>
            <Text style={{ color: colors.brand, fontWeight: '700', textAlign: 'center' }}>No barcode? Photograph the pack →</Text>
          </Pressable>
        </Screen>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
        onBarcodeScanned={onScan}
      />
      <View style={[styles.camTop, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.camBtn}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        <Text style={styles.camTitle}>Point at the barcode</Text>
        <Pressable onPress={() => setTorch((t) => !t)} hitSlop={12} style={styles.camBtn}>
          <Ionicons name={torch ? 'flash' : 'flash-off'} size={22} color="#fff" />
        </Pressable>
      </View>
      <View style={styles.frameWrap} pointerEvents="none">
        <View style={styles.frame} />
      </View>
      <View style={[styles.camBottom, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable onPress={() => setManual(true)} style={styles.typeBtn}>
          <Ionicons name="keypad-outline" size={18} color={colors.text} />
          <Text style={{ fontWeight: '700', color: colors.text }}>Can’t scan? Type it in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  permCard: { alignItems: 'center', padding: space(5), backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: space(5), borderWidth: 1, borderColor: colors.border },
  webNote: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, backgroundColor: colors.brandTint, borderRadius: radius.md, marginBottom: space(5) },
  camTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  camBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  camTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  frameWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 280, height: 170, borderRadius: 20, borderWidth: 3, borderColor: colors.lime },
  camBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  typeBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 12, borderRadius: radius.pill },
});
