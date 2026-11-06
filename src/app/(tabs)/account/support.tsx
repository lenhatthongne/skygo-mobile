import { Redirect } from 'expo-router';

/** The conversations with SkyGo support live in Messages (next to Notifications). */
export default function SupportRedirect() {
  return <Redirect href={{ pathname: '/notifications', params: { tab: 'messages' } }} />;
}
