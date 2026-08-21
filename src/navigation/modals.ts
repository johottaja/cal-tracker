import { router, type Href } from 'expo-router';

export function finishTo(href: Href) {
  if (router.canDismiss()) {
    router.dismissTo(href);
    return;
  }
  router.replace(href);
}

export function closeModal() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  finishTo('/');
}
