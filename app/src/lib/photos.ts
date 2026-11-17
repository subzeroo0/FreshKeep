import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

// Photo capture for the AI endpoints: camera or gallery → resized to a 1280 px long edge
// (PRD "Rules for every AI endpoint") → JPEG base64. Nothing is stored on the server.

export interface Photo {
  uri: string; // local copy, shown in the app
  base64: string; // sent to the server
}

const LONG_EDGE = 1280;

async function prepare(asset: ImagePicker.ImagePickerAsset): Promise<Photo> {
  const { width = 0, height = 0 } = asset;
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (Math.max(width, height) > LONG_EDGE) {
    ctx.resize(width >= height ? { width: LONG_EDGE } : { height: LONG_EDGE });
  }
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ base64: true, compress: 0.75, format: SaveFormat.JPEG });
  return { uri: out.uri, base64: out.base64 ?? '' };
}

export type PhotoSource = 'camera' | 'library';

/** Take one photo (camera on a phone; the browser falls back to a file picker). Returns null if cancelled. */
export async function takePhoto(source: PhotoSource = 'camera'): Promise<Photo | null> {
  if (source === 'camera' && Platform.OS !== 'web') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Camera permission is off. Turn it on in Settings, or pick a photo from the gallery.');
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
    return r.canceled ? null : prepare(r.assets[0]);
  }
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
  return r.canceled ? null : prepare(r.assets[0]);
}

/** Pick up to `limit` screenshots from the gallery, resized. */
export async function pickScreenshots(limit = 5): Promise<Photo[]> {
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: 0.9,
    orderedSelection: true,
  });
  if (r.canceled) return [];
  return Promise.all(r.assets.slice(0, limit).map(prepare));
}
