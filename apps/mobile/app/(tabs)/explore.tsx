import { Redirect } from 'expo-router';

/** @deprecated v4 explore → Archive today */
export default function ExploreRedirect() {
  return <Redirect href="/(tabs)/today" />;
}
