import com.android.apksig.ApkSigner;
import com.android.apksig.ApkVerifier;
import java.io.File;
import java.io.FileInputStream;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.Collections;

/** Signs an aligned APK with your own release key (APK Signature Scheme v2 + v3).
 *  Uses the apksig library bundled inside uber-apk-signer.jar.
 *  Env: BT_KEYSTORE (path), BT_KEYSTORE_PASS, BT_KEY_ALIAS, BT_KEY_PASS (defaults to the store password). */
public class Sign {
  public static void main(String[] a) throws Exception {
    String ks = System.getenv("BT_KEYSTORE"), sp = System.getenv("BT_KEYSTORE_PASS");
    String alias = System.getenv("BT_KEY_ALIAS"), kp = System.getenv("BT_KEY_PASS");
    if (ks == null || sp == null || alias == null) throw new IllegalStateException("Set BT_KEYSTORE, BT_KEYSTORE_PASS and BT_KEY_ALIAS");
    if (kp == null) kp = sp;
    KeyStore k = KeyStore.getInstance(ks.toLowerCase().endsWith(".p12") || ks.toLowerCase().endsWith(".pfx") ? "PKCS12" : "JKS");
    try (FileInputStream f = new FileInputStream(ks)) { k.load(f, sp.toCharArray()); }
    PrivateKey key = (PrivateKey) k.getKey(alias, kp.toCharArray());
    X509Certificate cert = (X509Certificate) k.getCertificate(alias);
    if (key == null || cert == null) throw new IllegalStateException("Key alias not found: " + alias);
    ApkSigner.SignerConfig cfg = new ApkSigner.SignerConfig.Builder("release", key, Collections.singletonList(cert)).build();
    new ApkSigner.Builder(Collections.singletonList(cfg)).setInputApk(new File(a[0])).setOutputApk(new File(a[1]))
        .setV1SigningEnabled(false).setV2SigningEnabled(true).setV3SigningEnabled(true).setMinSdkVersion(24).build().sign();
    ApkVerifier.Result r = new ApkVerifier.Builder(new File(a[1])).build().verify();
    if (!r.isVerified()) { System.err.println("Verification failed: " + r.getErrors()); System.exit(1); }
    byte[] d = MessageDigest.getInstance("SHA-256").digest(cert.getEncoded());
    StringBuilder sb = new StringBuilder(); for (byte b : d) sb.append(String.format("%02X:", b));
    System.out.println("Signed and verified. Certificate SHA-256: " + sb.substring(0, sb.length() - 1));
  }
}
