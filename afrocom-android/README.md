# AFROCOM Android App

## Prérequis
- Android Studio (https://developer.android.com/studio) — gratuit
- Java JDK 11+ (inclus avec Android Studio)

## Étapes pour générer l'APK

### 1. Ouvrir le projet
- Ouvrir Android Studio
- File → Open → Sélectionner ce dossier (afrocom-android)
- Attendre la synchronisation Gradle (2-5 min la première fois)

### 2. Générer l'APK
**APK de test (rapide) :**
- Menu : Build → Build Bundle(s)/APK(s) → Build APK(s)
- L'APK apparaît dans : `app/build/outputs/apk/debug/app-debug.apk`
- Notification en bas à droite → cliquer "locate"

**APK de production (signé) :**
- Build → Generate Signed Bundle/APK
- Choisir APK
- Créer un keystore (ou utiliser un existant)
- Choisir "release"
- L'APK est dans : `app/build/outputs/apk/release/`

### 3. Installer sur Android
Transférer l'APK sur le téléphone et l'installer
(Paramètres → Sécurité → Sources inconnues → Autoriser)

## Ce que fait l'app
- Ouvre AFROCOM (https://afrocom.lovestoblog.com) en WebView plein écran
- Gère les permissions : micro, caméra, fichiers
- Supporte les deep links pour les notifications d'appel
- Bouton retour = navigation arrière dans le site
