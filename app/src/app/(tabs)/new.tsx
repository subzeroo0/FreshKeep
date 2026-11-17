import { Redirect } from 'expo-router';

// Placeholder route for the centre Add button; the button opens the /add sheet instead.
export default function NewTab() {
  return <Redirect href="/add" />;
}
