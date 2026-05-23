package com.afrocom.app;

import android.content.Context;
import android.content.Intent;
import android.webkit.JavascriptInterface;

/**
 * Pont JavaScript → Android.
 * Appelé depuis le site web afrocom.lovestoblog.com via :
 *
 *   window.RivoBridge.openPdf("pdfs/001_creation-de-site-web-complet.pdf",
 *                              "Création de Site Web Complet");
 *
 * Le site doit détecter la présence de window.RivoBridge pour afficher
 * le bouton "Voir le programme PDF" au lieu d'un lien de téléchargement.
 */
public class RivoBridge {

    private final Context context;

    public RivoBridge(Context context) {
        this.context = context;
    }

    /**
     * Ouvre un PDF stocké dans les assets de l'app.
     *
     * @param pdfPath Chemin relatif dans les assets, ex: "pdfs/001_xxx.pdf"
     * @param title   Titre affiché dans la barre de navigation du viewer
     */
    @JavascriptInterface
    public void openPdf(String pdfPath, String title) {
        Intent intent = new Intent(context, PdfViewerActivity.class);
        intent.putExtra(PdfViewerActivity.EXTRA_PDF_PATH, pdfPath);
        intent.putExtra(PdfViewerActivity.EXTRA_TITLE, title);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }

    /**
     * Retourne true si l'app contient un PDF en local.
     * Utile pour que le site adapte son affichage.
     */
    @JavascriptInterface
    public boolean hasPdf(String pdfPath) {
        try {
            context.getAssets().open(pdfPath).close();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Retourne la version de l'app (pour diagnostics).
     */
    @JavascriptInterface
    public String getAppVersion() {
        return "1.1.0-rivo";
    }
}
