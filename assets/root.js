const supported = ['it', 'en', 'nl'];
const preferred = navigator.languages ?? [navigator.language ?? 'it'];
const match = preferred
  .map((language) => language.toLowerCase().split('-')[0])
  .find((language) => supported.includes(language));

window.location.replace(`/${match ?? 'it'}/${window.location.search}${window.location.hash}`);
