/**
 * /.well-known/assetlinks.json: tells Android that the Nexus app (ANDROID_PACKAGE_NAME, signed with a key whose SHA-256
 * fingerprint is in ANDROID_CERT_SHA256, comma-separated) may open this site full-screen without a browser bar.
 * The Android build workflow prints the fingerprint to copy here.
 */
export function assetLinksBody() {
  const pkg = process.env.ANDROID_PACKAGE_NAME || 'za.co.nexusledger.app';
  const prints = String(process.env.ANDROID_CERT_SHA256 || '').split(',').map((s) => s.trim().toUpperCase()).filter((s) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s));
  return prints.length ? [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: pkg, sha256_cert_fingerprints: prints } }] : [];
}
