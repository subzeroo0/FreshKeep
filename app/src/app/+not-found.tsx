import { Redirect } from 'expo-router';

// Unknown paths (e.g. the web prototype hosted under a sub-path) land on the fridge.
export default function NotFound() {
  return <Redirect href="/" />;
}
