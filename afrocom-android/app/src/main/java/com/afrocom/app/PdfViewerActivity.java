package com.afrocom.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.github.barteksc.pdfviewer.PDFView;
import com.github.barteksc.pdfviewer.listener.OnErrorListener;
import com.github.barteksc.pdfviewer.listener.OnLoadCompleteListener;
import com.github.barteksc.pdfviewer.scroll.DefaultScrollHandle;

import java.io.IOException;
import java.io.InputStream;

/**
 * Affiche un PDF stocké dans les assets de l'application.
 * Appelé depuis MainActivity via le JavaScript Bridge ou une URL custom.
 *
 * Usage :
 *   Intent intent = new Intent(this, PdfViewerActivity.class);
 *   intent.putExtra("pdf_path", "pdfs/001_creation-de-site-web-complet.pdf");
 *   intent.putExtra("title", "Création de Site Web Complet");
 *   startActivity(intent);
 */
public class PdfViewerActivity extends AppCompatActivity {

    public static final String EXTRA_PDF_PATH  = "pdf_path";
    public static final String EXTRA_TITLE     = "title";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Plein écran
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        String pdfPath = getIntent().getStringExtra(EXTRA_PDF_PATH);
        String title   = getIntent().getStringExtra(EXTRA_TITLE);
        if (title == null) title = "Programme de formation";

        // ── Layout principal ──────────────────────────────────
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#F4F4FA"));

        // ── Barre de navigation rose ──────────────────────────
        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setOrientation(LinearLayout.HORIZONTAL);
        toolbar.setBackgroundColor(Color.parseColor("#FE3C72"));
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setPadding(12, 8, 12, 8);

        // Bouton retour
        ImageButton btnBack = new ImageButton(this);
        btnBack.setImageResource(android.R.drawable.ic_media_previous);
        btnBack.setBackgroundColor(Color.TRANSPARENT);
        btnBack.setColorFilter(Color.WHITE);
        btnBack.setOnClickListener(v -> finish());

        // Titre
        TextView tvTitle = new TextView(this);
        tvTitle.setText(title);
        tvTitle.setTextColor(Color.WHITE);
        tvTitle.setTextSize(14f);
        tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
        tvTitle.setPadding(16, 0, 0, 0);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
            0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        tvTitle.setLayoutParams(titleParams);
        tvTitle.setMaxLines(1);
        tvTitle.setEllipsize(android.text.TextUtils.TruncateAt.END);

        toolbar.addView(btnBack);
        toolbar.addView(tvTitle);

        // ── PDFView ───────────────────────────────────────────
        PDFView pdfView = new PDFView(this, null);
        LinearLayout.LayoutParams pdfParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f);
        pdfView.setLayoutParams(pdfParams);

        root.addView(toolbar);
        root.addView(pdfView);
        setContentView(root);

        // ── Chargement du PDF depuis les assets ───────────────
        if (pdfPath == null || pdfPath.isEmpty()) {
            Toast.makeText(this, "PDF non disponible", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        try {
            InputStream is = getAssets().open(pdfPath);
            pdfView.fromStream(is)
                .defaultPage(0)
                .enableSwipe(true)
                .swipeHorizontal(false)
                .enableDoubletap(true)
                .enableAnnotationRendering(true)
                .scrollHandle(new DefaultScrollHandle(this))
                .spacing(4)
                .onLoad(nbPages -> {
                    // PDF chargé avec succès
                })
                .onError(t -> {
                    Toast.makeText(this,
                        "Erreur lors du chargement du PDF", Toast.LENGTH_LONG).show();
                    finish();
                })
                .load();
        } catch (IOException e) {
            Toast.makeText(this,
                "Programme PDF introuvable : " + pdfPath, Toast.LENGTH_LONG).show();
            finish();
        }
    }
}
