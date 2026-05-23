#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Génère 200 PDFs de formations RIVO avec reportlab"""

import os, re
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

OUTPUT_DIR = "afrocom-android/app/src/main/assets/pdfs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Couleurs RIVO
ROSE    = colors.HexColor("#FE3C72")
DARK    = colors.HexColor("#1E1E2F")
LGREY   = colors.HexColor("#F4F4FA")
MGREY   = colors.HexColor("#6B6B80")
WHITE   = colors.white

def slug(title):
    t = title.lower()
    for a,b in [("à","a"),("â","a"),("ä","a"),("é","e"),("è","e"),("ê","e"),
                ("ë","e"),("î","i"),("ï","i"),("ô","o"),("ö","o"),
                ("ù","u"),("û","u"),("ü","u"),("ç","c"),("'","")]:
        t = t.replace(a,b)
    t = re.sub(r"[^a-z0-9]+","-",t)
    return t.strip("-")[:50]

def make_styles():
    base = getSampleStyleSheet()
    S = {}
    S["title"] = ParagraphStyle("title", fontSize=16, textColor=DARK,
        fontName="Helvetica-Bold", spaceAfter=4, leading=20)
    S["subtitle"] = ParagraphStyle("subtitle", fontSize=10, textColor=MGREY,
        fontName="Helvetica", spaceAfter=6, leading=13)
    S["sectionhead"] = ParagraphStyle("sectionhead", fontSize=10, textColor=WHITE,
        fontName="Helvetica-Bold", backColor=ROSE, leading=14,
        leftIndent=6, spaceAfter=4, spaceBefore=8)
    S["body"] = ParagraphStyle("body", fontSize=9.5, textColor=DARK,
        fontName="Helvetica", leading=14, spaceAfter=4, alignment=TA_JUSTIFY)
    S["bullet"] = ParagraphStyle("bullet", fontSize=9.5, textColor=DARK,
        fontName="Helvetica", leading=13, leftIndent=12, bulletIndent=0,
        spaceAfter=2, bulletText="•")
    S["modtitle"] = ParagraphStyle("modtitle", fontSize=9.5, textColor=DARK,
        fontName="Helvetica-Bold", backColor=colors.HexColor("#EBEBF5"),
        leading=13, leftIndent=4, spaceAfter=2, spaceBefore=4)
    S["subbullet"] = ParagraphStyle("subbullet", fontSize=9, textColor=DARK,
        fontName="Helvetica", leading=12, leftIndent=20, bulletIndent=8,
        spaceAfter=1, bulletText="–")
    S["footer_note"] = ParagraphStyle("footer_note", fontSize=8, textColor=MGREY,
        fontName="Helvetica-Oblique", alignment=TA_CENTER)
    return S

def badge_table(price, hours):
    """Retourne un tableau avec deux badges rose."""
    data = [[f"Prix : {price:,} XOF".replace(",", " "),
             f"Durée : {hours}h de vidéos HD"]]
    t = Table(data, colWidths=[85*mm, 85*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,-1), ROSE),
        ("TEXTCOLOR",    (0,0), (-1,-1), WHITE),
        ("FONTNAME",     (0,0), (-1,-1), "Helvetica-Bold"),
        ("FONTSIZE",     (0,0), (-1,-1), 9),
        ("ALIGN",        (0,0), (-1,-1), "CENTER"),
        ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[ROSE]),
        ("TOPPADDING",   (0,0), (-1,-1), 5),
        ("BOTTOMPADDING",(0,0), (-1,-1), 5),
        ("GRID",         (0,0), (-1,-1), 0.5, WHITE),
    ]))
    return t

def build_pdf(course, out_path):
    doc = SimpleDocTemplate(
        out_path,
        pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=22*mm, bottomMargin=22*mm,
        title=course["title"],
        author="RIVO Formations",
    )
    S = make_styles()
    story = []

    # ── En-tête rose ──────────────────────────────────────────
    header_data = [["RIVO FORMATIONS — PROGRAMME OFFICIEL",
                    "afrocom.lovestoblog.com"]]
    ht = Table(header_data, colWidths=[120*mm, 54*mm])
    ht.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), ROSE),
        ("TEXTCOLOR",    (0,0),(-1,-1), WHITE),
        ("FONTNAME",     (0,0),(-1,-1), "Helvetica-Bold"),
        ("FONTSIZE",     (0,0),(-1,-1), 8),
        ("ALIGN",        (0,0),(0,0), "LEFT"),
        ("ALIGN",        (1,0),(1,0), "RIGHT"),
        ("VALIGN",       (0,0),(-1,-1), "MIDDLE"),
        ("TOPPADDING",   (0,0),(-1,-1), 4),
        ("BOTTOMPADDING",(0,0),(-1,-1), 4),
        ("LEFTPADDING",  (0,0),(0,0), 6),
        ("RIGHTPADDING", (1,0),(1,0), 6),
    ]))
    story.append(ht)
    story.append(Spacer(1, 6*mm))

    # ── Titre + short ─────────────────────────────────────────
    story.append(Paragraph(course["title"], S["title"]))
    story.append(Paragraph(course["short"], S["subtitle"]))
    story.append(badge_table(course["price"], course["hours"]))
    story.append(Spacer(1, 5*mm))
    story.append(HRFlowable(width="100%", thickness=1, color=ROSE))
    story.append(Spacer(1, 3*mm))

    # ── Description ───────────────────────────────────────────
    story.append(Paragraph("DESCRIPTION DE LA FORMATION", S["sectionhead"]))
    story.append(Paragraph(course["desc"], S["body"]))

    # ── Objectifs ─────────────────────────────────────────────
    story.append(Paragraph("OBJECTIFS DE LA FORMATION", S["sectionhead"]))
    for o in course.get("objectifs", []):
        story.append(Paragraph(o, S["bullet"]))
    story.append(Spacer(1, 2*mm))

    # ── Prérequis ─────────────────────────────────────────────
    story.append(Paragraph("PRÉREQUIS", S["sectionhead"]))
    story.append(Paragraph(course.get("prerequis","Aucun prérequis particulier."), S["body"]))

    # ── Outils ────────────────────────────────────────────────
    story.append(Paragraph("OUTILS ET RESSOURCES", S["sectionhead"]))
    story.append(Paragraph(course.get("outils","Matériel spécifique à la discipline."), S["body"]))

    # ── Programme ─────────────────────────────────────────────
    story.append(Paragraph("PROGRAMME DÉTAILLÉ", S["sectionhead"]))
    for mod_title, items in course.get("modules", []):
        story.append(Paragraph(mod_title, S["modtitle"]))
        for item in items:
            story.append(Paragraph(item, S["subbullet"]))
    story.append(Spacer(1, 3*mm))

    # ── Attestation ───────────────────────────────────────────
    story.append(Paragraph("ATTESTATION ET CERTIFICATION", S["sectionhead"]))
    story.append(Paragraph(
        "À l'issue de cette formation, vous recevrez une <b>Attestation RIVO officielle</b> "
        "qui reconnaît vos compétences acquises. Cette attestation est reconnue par les employeurs "
        "partenaires de RIVO et valorisée dans toute l'Afrique francophone. "
        "Elle est accompagnée d'un <b>badge numérique</b> partageable sur LinkedIn et les réseaux sociaux.",
        S["body"]
    ))
    story.append(Spacer(1, 4*mm))

    # ── Pied de page info ─────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=ROSE))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        "© RIVO Formations — Tous droits réservés — afrocom.lovestoblog.com",
        S["footer_note"]
    ))

    doc.build(story)

# ══════════════════════════════════════════════════════════════
# DONNÉES DES 200 FORMATIONS
# ══════════════════════════════════════════════════════════════
COURSES = [
  {
    "title": "Création de Site Web Complet",
    "short": "Devenez développeur web de A à Z.",
    "price": 8000, "hours": 25,
    "desc": "Formation complète pour créer des sites web modernes et responsives. Vous apprendrez HTML5, CSS3, JavaScript et les bases de React. Idéale pour les personnes souhaitant travailler en tant que développeur web freelance ou intégrer une équipe technique. Inclut 25h de vidéos HD, exercices corrigés, projets pratiques, communauté WhatsApp active et attestation RIVO reconnue.",
    "objectifs": ["Créer des pages HTML5 sémantiques et accessibles","Styliser avec CSS3, Flexbox et Grid","Programmer en JavaScript ES6+ côté client","Utiliser React pour des interfaces dynamiques","Déployer un site en ligne gratuitement"],
    "prerequis": "Savoir utiliser un ordinateur et naviguer sur Internet. Aucune expérience en code requise.",
    "outils": "VS Code (gratuit), Chrome DevTools, GitHub Pages, Netlify",
    "modules": [
      ("Module 1 : Fondamentaux HTML5", ["Structure d'une page web","Balises sémantiques (header, nav, main, footer)","Formulaires et validation","Accessibilité web (ARIA)"]),
      ("Module 2 : CSS3 Avancé", ["Box model, Flexbox, CSS Grid","Animations et transitions","Design responsive (media queries)","Variables CSS et thèmes"]),
      ("Module 3 : JavaScript Moderne", ["Variables, fonctions, boucles","Manipulation du DOM","Fetch API et AJAX","ES6 : arrow functions, destructuring, modules"]),
      ("Module 4 : React.js Initiation", ["JSX et composants","Props et State","Hooks (useState, useEffect)","Projet final : site vitrine complet"]),
      ("Module 5 : Mise en ligne", ["Hébergement gratuit (GitHub Pages, Netlify)","Nom de domaine","SEO de base","Maintenance et mises à jour"]),
    ]
  },
  {
    "title": "Marketing Digital et Réseaux Sociaux",
    "short": "Maîtrisez Facebook, Instagram, TikTok et WhatsApp.",
    "price": 7000, "hours": 30,
    "desc": "Stratégies marketing digital adaptées au marché africain. Apprenez à créer du contenu viral, lancer des publicités rentables sur Facebook Ads et vendre via WhatsApp Business. Études de cas réels d'entrepreneurs africains, templates prêts à l'emploi, scripts de vente et attestation RIVO.",
    "objectifs": ["Élaborer une stratégie digitale adaptée au marché africain","Créer du contenu viral sur TikTok et Instagram","Lancer des campagnes Facebook Ads rentables","Vendre via WhatsApp Business avec des scripts efficaces","Analyser les performances et optimiser"],
    "prerequis": "Avoir un smartphone et un compte sur au moins un réseau social.",
    "outils": "Meta Business Suite, TikTok Creator, WhatsApp Business, Canva",
    "modules": [
      ("Module 1 : Stratégie Marketing Digital", ["Comprendre le marché africain en ligne","Définir sa cible et son positionnement","Choisir les bons réseaux sociaux","Planifier son calendrier éditorial"]),
      ("Module 2 : Création de Contenu Engageant", ["Photos et vidéos qui captent l'attention","Copywriting pour les réseaux sociaux","Hashtags et viralité","Storytelling de marque"]),
      ("Module 3 : Facebook & Instagram Ads", ["Créer un Business Manager","Publics personnalisés et lookalike","Formats publicitaires efficaces","Optimisation et A/B testing"]),
      ("Module 4 : TikTok Marketing", ["Algorithme TikTok expliqué","Tendances et challenges","Formats de vidéos viraux","Monétisation TikTok"]),
      ("Module 5 : WhatsApp Business", ["Configurer WhatsApp Business","Catalogues et listes de diffusion","Scripts de vente qui convertissent","Automatisation avec réponses rapides"]),
    ]
  },
  {
    "title": "Excel du Débutant à l'Expert",
    "short": "Dominez les tableurs, formules et graphiques.",
    "price": 5000, "hours": 20,
    "desc": "Formation Excel complète : des formules de base (SOMME, SI, RECHERCHEV) jusqu'aux macros VBA et aux tableaux croisés dynamiques. Idéale pour les professionnels, comptables, gestionnaires et entrepreneurs. 50 exercices avec corrigés, fichiers pratiques téléchargeables, communauté WhatsApp et attestation RIVO.",
    "objectifs": ["Maîtriser les formules essentielles (RECHERCHEV, SI, SOMME.SI)","Créer des tableaux croisés dynamiques professionnels","Concevoir des graphiques clairs et percutants","Automatiser des tâches répétitives avec des macros VBA","Protéger et partager des classeurs en entreprise"],
    "prerequis": "Connaissances de base en informatique. Excel 2016 ou plus récent recommandé.",
    "outils": "Microsoft Excel 2016/2019/365, Google Sheets (compatible)",
    "modules": [
      ("Module 1 : Bases d'Excel", ["Interface et navigation","Saisie et mise en forme des données","Formules de base (SOMME, MOYENNE, MIN, MAX)","Références absolues et relatives"]),
      ("Module 2 : Formules Avancées", ["RECHERCHEV / RECHERCHEX","SI, SI.CONDITIONS, SIERREUR","SOMME.SI, NB.SI, MOYENNE.SI","Formules texte et date"]),
      ("Module 3 : Tableaux Croisés Dynamiques", ["Créer et configurer un TCD","Segments et chronologies","Champs calculés","Tableaux de bord dynamiques"]),
      ("Module 4 : Graphiques et Visualisation", ["Choisir le bon type de graphique","Personnalisation et mise en forme","Sparklines et graphiques combinés","Graphiques pour rapports d'entreprise"]),
      ("Module 5 : Macros VBA", ["Enregistrer et lancer une macro","Bases du langage VBA","Automatiser des rapports hebdomadaires","Formulaires utilisateur (UserForm)"]),
    ]
  },
  {
    "title": "Montage Vidéo CapCut et Premiere Pro",
    "short": "Créez des vidéos professionnelles pour les réseaux.",
    "price": 6000, "hours": 30,
    "desc": "Apprenez le montage vidéo de A à Z, du téléphone à l'ordinateur. CapCut pour les créateurs mobiles, Premiere Pro pour un rendu cinématographique. Maîtrisez les transitions tendance, la colorimétrie, le texte animé et l'export optimisé pour chaque réseau social. Banque de 500 sons gratuits incluse.",
    "objectifs": ["Monter des vidéos fluides avec CapCut sur smartphone","Utiliser Adobe Premiere Pro pour un montage pro","Appliquer une colorimétrie cinématographique","Créer des sous-titres et textes animés","Exporter en formats optimisés pour chaque réseau"],
    "prerequis": "Avoir un smartphone (Android ou iOS) ou un ordinateur. Aucune expérience requise.",
    "outils": "CapCut (gratuit), Adobe Premiere Pro, DaVinci Resolve (alternative gratuite)",
    "modules": [
      ("Module 1 : Montage Mobile avec CapCut", ["Interface et prise en main","Couper, assembler, découper","Transitions tendance","Textes animés et stickers"]),
      ("Module 2 : Son et Musique", ["Musique libre de droits","Effets sonores","Voix off","Synchronisation son/image"]),
      ("Module 3 : Adobe Premiere Pro", ["Interface et espace de travail","Timeline et organisation des clips","Effets vidéo et transitions","Étalonnage des couleurs (Lumetri)"]),
      ("Module 4 : Colorimétrie Professionnelle", ["Correction colorimétrique de base","LUTs et looks cinématographiques","Match de couleur entre clips","Export avec bonnes couleurs"]),
      ("Module 5 : Export et Diffusion", ["Formats pour YouTube, Instagram, TikTok","Résolutions et bitrates","Miniatures attractives","Publication et optimisation"]),
    ]
  },
  {
    "title": "Couture et Stylisme Africain Moderne",
    "short": "Créez des vêtements de A à Z, du patron à la vente.",
    "price": 5000, "hours": 40,
    "desc": "Formation couture complète axée sur les tenues africaines traditionnelles (boubou, pagne, kaba) et modernes. Du tracé du patron à la finition, en passant par les techniques de coupe et d'assemblage. 50 patrons téléchargeables, 100 photos étape par étape, guide des fournisseurs de tissu et attestation RIVO.",
    "objectifs": ["Prendre des mesures corporelles précises","Tracer et adapter des patrons","Couper et assembler différents tissus africains","Réaliser boubous, robes, chemises et tenues modernes","Créer son activité de couture rentable"],
    "prerequis": "Aucun prérequis. Avoir accès à une machine à coudre est un plus.",
    "outils": "Machine à coudre, ciseaux de couture, craie, mètre ruban, fer à repasser",
    "modules": [
      ("Module 1 : Matériel et Tissus Africains", ["Choisir sa machine à coudre","Types de tissus (wax, bazin, soie, satin)","Mercerie et haberdasherie","Entretien du matériel"]),
      ("Module 2 : Prise de Mesures et Patrons", ["Prise de mesures corporelles","Lecture et compréhension des patrons","Adaptation des patrons à sa morphologie","Tracer ses propres patrons"]),
      ("Module 3 : Techniques de Couture", ["Points de couture à la machine","Finitions (surjeteuse, zigzag)","Assemblage de pièces","Coutures droites, courbes, angles"]),
      ("Module 4 : Modèles Africains Iconiques", ["Boubou homme et femme","Robe en pagne","Kaba et autres tenues traditionnelles","Chemise et pantalon africain moderne"]),
      ("Module 5 : Lancer son Business Couture", ["Fixer ses prix","Trouver des clients","Réseaux sociaux pour couturière","Gérer les commandes et délais"]),
    ]
  },
  {
    "title": "Coiffure et Tresse Africaine Pro",
    "short": "Maîtrisez toutes les techniques de coiffure.",
    "price": 4000, "hours": 35,
    "desc": "Formation professionnelle en coiffure africaine : tresses nattes, box braids, mèches, perruques frontales, soins capillaires naturels et colorations. Vidéos tournées en salon de coiffure professionnel avec 200 photos de démonstration. Liste de fournisseurs de produits capillaires incluse.",
    "objectifs": ["Réaliser toutes les tresses africaines (nattes, vanilles, crochet)","Poser des mèches et perruques frontales","Soigner les cheveux crépus naturels","Appliquer des colorations et traitements","Ouvrir son salon ou travailler à domicile"],
    "prerequis": "Aucun prérequis. Passion pour la coiffure recommandée.",
    "outils": "Peigne à queue, aiguille à tresser, fil de couture, extensions, produits capillaires",
    "modules": [
      ("Module 1 : Anatomie du Cheveu Crépu", ["Structure du cheveu","Types de cheveux crépus (4A, 4B, 4C)","Diagnostiquer un problème capillaire","Soins de base"]),
      ("Module 2 : Tresses et Nattes Africaines", ["Nattes plaquées","Box braids et knotless braids","Vanilles (twists)","Tresses collées (cornrows)"]),
      ("Module 3 : Mèches et Perruques", ["Installer des mèches","Poser une perruque frontale","Entretien des perruques","Techniques de colle et ruban adhésif"]),
      ("Module 4 : Soins Capillaires Naturels", ["Masques hydratants maison","Méthode LOC/LCO","Traitement protéiné","Stimuler la pousse"]),
      ("Module 5 : Business Coiffure", ["Matériel professionnel","Prix et tarification","Marketing pour salons","Hygiène et sécurité"]),
    ]
  },
  {
    "title": "Photographie Pro avec Téléphone",
    "short": "Photos professionnelles uniquement avec votre smartphone.",
    "price": 3000, "hours": 20,
    "desc": "Devenez photographe professionnel sans appareil photo coûteux. Apprenez à maîtriser les réglages manuels de votre smartphone, les règles de composition, la lumière naturelle et la retouche avec Lightroom Mobile et Snapseed. 50 presets offerts, guide des accessoires et attestation RIVO.",
    "objectifs": ["Maîtriser les réglages manuels de la caméra smartphone","Appliquer les règles de composition","Utiliser la lumière naturelle et artificielle","Retoucher avec Lightroom Mobile et Snapseed","Vendre ses photos en ligne"],
    "prerequis": "Avoir un smartphone avec appareil photo (Android ou iPhone).",
    "outils": "Smartphone, Lightroom Mobile (gratuit), Snapseed (gratuit), trépied mini",
    "modules": [
      ("Module 1 : Maîtriser sa Caméra Mobile", ["Mode Pro et réglages manuels","ISO, vitesse, ouverture","Focus et exposition","Portrait, paysage, macro"]),
      ("Module 2 : Composition Créative", ["Règle des tiers","Lignes directrices","Cadrage créatif","Perspective et profondeur"]),
      ("Module 3 : Maîtrise de la Lumière", ["Lumière naturelle (golden hour)","Lumière artificielle","Éviter les reflets","Silhouettes et contre-jour"]),
      ("Module 4 : Retouche Lightroom Mobile", ["Importer et organiser","Exposition, contraste, couleurs","Presets personnalisés","Exporter en haute qualité"]),
      ("Module 5 : Monétiser sa Photographie", ["Banques d'images (Shutterstock, Adobe Stock)","Photos pour entreprises locales","Instagram professionnel","Tarification et portfolio"]),
    ]
  },
  {
    "title": "Création d'Entreprise en Afrique",
    "short": "Lancez votre business de A à Z sans vous tromper.",
    "price": 6000, "hours": 25,
    "desc": "Tout ce qu'il faut pour créer et développer une entreprise en Afrique : idée, étude de marché, business plan, statuts juridiques, financement (tontine, microcrédit, subventions), marketing et premières ventes. Interviews d'entrepreneurs africains à succès incluses. Modèles de documents téléchargeables.",
    "objectifs": ["Identifier une idée de business viable","Rédiger un business plan solide","Choisir le bon statut juridique","Trouver des financements adaptés à l'Afrique","Lancer et développer son activité"],
    "prerequis": "Avoir une idée ou un projet de business. Aucun prérequis académique.",
    "outils": "Templates business plan, Excel financier, outils de simulation",
    "modules": [
      ("Module 1 : Idée et Validation de Marché", ["Trouver une idée rentable","Étude de marché simple","Valider son idée avec des clients potentiels","Analyse SWOT"]),
      ("Module 2 : Business Plan Professionnel", ["Structure d'un business plan","Prévisions financières","Présenter à des investisseurs","Modèles téléchargeables"]),
      ("Module 3 : Cadre Juridique et Fiscal", ["SARL, SA, entreprise individuelle","Enregistrement et démarches","Fiscalité et TVA","Contrats et protection juridique"]),
      ("Module 4 : Financement Africain", ["Tontines et épargne collective","Microcrédits (BNDE, fonds locaux)","Subventions et concours","Business angels africains"]),
      ("Module 5 : Lancement et Croissance", ["Plan de lancement","Premiers clients","Recrutement","Stratégie de croissance"]),
    ]
  },
  {
    "title": "E-commerce et Dropshipping",
    "short": "Vendez en ligne sans stock de marchandise.",
    "price": 7000, "hours": 20,
    "desc": "Créez votre boutique en ligne sans avoir besoin de stocker des marchandises. Apprenez le dropshipping adapté à l'Afrique : fournisseurs locaux et internationaux, paiement Mobile Money, boutique WhatsApp/Instagram/Shopify. Templates prêts à l'emploi, liste de fournisseurs fiables et photos d'exemples réels.",
    "objectifs": ["Créer une boutique en ligne sans stock","Trouver des fournisseurs fiables en Afrique et en Chine","Intégrer le paiement Mobile Money","Gérer les commandes et la logistique","Automatiser son business e-commerce"],
    "prerequis": "Avoir un smartphone ou ordinateur avec connexion Internet.",
    "outils": "WhatsApp Business, Instagram Shopping, Shopify ou WooCommerce, Wave/Orange Money",
    "modules": [
      ("Module 1 : Concept et Modèle Dropshipping", ["Fonctionnement du dropshipping","Avantages et inconvénients","Choisir sa niche","Modèles de business"]),
      ("Module 2 : Trouver des Fournisseurs", ["AliExpress et Alibaba","Fournisseurs locaux africains","Négociation des prix","Qualité et fiabilité"]),
      ("Module 3 : Créer sa Boutique en Ligne", ["Boutique WhatsApp et Instagram","Créer un site avec Shopify","WooCommerce","Paiement Mobile Money"]),
      ("Module 4 : Marketing et Acquisition", ["Publicités ciblées","Influenceurs locaux","Service client excellence","Gestion des retours"]),
      ("Module 5 : Logistique et Automatisation", ["Transporteurs en Afrique","Calcul des frais de port","Tracking colis","Automatisation des commandes"]),
    ]
  },
  {
    "title": "Anglais Pratique pour le Travail",
    "short": "Anglais utile pour entretiens, emails et voyages.",
    "price": 4000, "hours": 30,
    "desc": "Apprenez l'anglais professionnel de manière pratique et efficace, adapté aux Africains francophones. Conversations, vocabulaire business, prononciation travaillée avec un locuteur natif. 200 exercices audio, fiches thématiques et attestation RIVO. Idéal pour décrocher un emploi international.",
    "objectifs": ["Communiquer en anglais dans un contexte professionnel","Rédiger emails et rapports en anglais","Réussir un entretien d'embauche en anglais","Comprendre l'anglais oral (réunions, conférences)","Voyager et se débrouiller en anglais"],
    "prerequis": "Niveau débutant ou intermédiaire en anglais.",
    "outils": "Cahier, enregistreur vocal, applications Duolingo et Anki",
    "modules": [
      ("Module 1 : Bases de Communication", ["Salutations et présentations","Se présenter professionnellement","Exprimer ses opinions","Vocabulaire quotidien"]),
      ("Module 2 : Anglais des Affaires", ["Réunions et conférences","Négociation en anglais","Présentation PowerPoint en anglais","Téléphone et visioconférence"]),
      ("Module 3 : Email Professionnel en Anglais", ["Structure d'un email formel","Formules d'ouverture et clôture","Demander, confirmer, refuser poliment","Répondre aux clients"]),
      ("Module 4 : Entretien d'Embauche", ["Questions fréquentes","Parler de son expérience","Forces et faiblesses","Follow-up email"]),
      ("Module 5 : Prononciation et Fluidité", ["Sons difficiles pour francophones","Intonation et rythme","Écoute active","Accent compréhensible"]),
    ]
  },
  {
    "title": "Éducation Financière et Investissement",
    "short": "Gérez votre argent et créez des revenus passifs.",
    "price": 5000, "hours": 20,
    "desc": "Formation en éducation financière adaptée à la réalité africaine. Budgétisation, épargne d'urgence, introduction à la bourse (BRVM), immobilier et cryptomonnaies. Calculateurs Excel inclus, guide des applications financières disponibles en Afrique et attestation RIVO.",
    "objectifs": ["Créer et respecter un budget mensuel","Constituer une épargne d'urgence","Comprendre les bases de la bourse","Investir dans l'immobilier africain","Naviguer dans les cryptomonnaies avec prudence"],
    "prerequis": "Aucun prérequis. Avoir envie de mieux gérer son argent.",
    "outils": "Excel/Google Sheets, applications bancaires, Trading 212, Binance",
    "modules": [
      ("Module 1 : Gestion du Budget Personnel", ["Méthode 50/30/20","Tableau de bord financier","Réduire ses dépenses inutiles","Épargne automatique"]),
      ("Module 2 : Épargne et Fonds d'Urgence", ["Combien épargner ?","Comptes d'épargne rémunérés","Épargne pour les grands projets","Fonds d'urgence (6 mois)"]),
      ("Module 3 : Investissement en Bourse", ["Actions, obligations, ETF","Bourse régionale africaine (BRVM)","Diversification du portefeuille","Long terme vs court terme"]),
      ("Module 4 : Immobilier Africain", ["Acheter ou louer ?","Investissement locatif","Financement et crédit","Pièges à éviter"]),
      ("Module 5 : Cryptomonnaies et DeFi", ["Bitcoin et Ethereum expliqués","Sécuriser ses actifs","DeFi et staking","Gestion du risque crypto"]),
    ]
  },
  {
    "title": "Infographie et Design Graphique Pro",
    "short": "Créez logos, affiches, flyers et cartes de visite.",
    "price": 5000, "hours": 25,
    "desc": "Maîtrisez Canva et Adobe Illustrator pour créer des visuels professionnels. Logos, affiches, flyers, cartes de visite, bannières web. Formation orientée débouchés professionnels : travailler en freelance, pour des entreprises ou créer son agence de communication. 200 templates modifiables inclus.",
    "objectifs": ["Maîtriser Canva pour des créations rapides","Utiliser Adobe Illustrator pour le design vectoriel","Créer logos, affiches, flyers, cartes de visite","Appliquer les principes du design graphique","Travailler pour des clients et entreprises"],
    "prerequis": "Aucun prérequis artistique. Ordinateur ou tablette recommandé.",
    "outils": "Canva (gratuit), Adobe Illustrator, Adobe Express",
    "modules": [
      ("Module 1 : Principes du Design Graphique", ["Couleurs et psychologie","Typographie","Composition et mise en page","Identité visuelle"]),
      ("Module 2 : Canva Maîtrise Complète", ["Templates et personnalisation","Brand Kit","Animations","Export en différents formats"]),
      ("Module 3 : Adobe Illustrator", ["Interface et outils de base","Formes vectorielles","Typographie créative","Création de logo"]),
      ("Module 4 : Supports de Communication", ["Affiches et flyers","Cartes de visite","Bannières web et réseaux sociaux","Brochures et catalogues"]),
      ("Module 5 : Freelance Design", ["Construire son portfolio","Trouver des clients","Tarification","Livraison et révisions"]),
    ]
  },
  {
    "title": "Mécanique Auto et Entretien Véhicule",
    "short": "Réparez votre voiture et économisez sur les réparations.",
    "price": 6000, "hours": 25,
    "desc": "Formez-vous à la mécanique automobile pour économiser sur les réparations et comprendre le fonctionnement de votre véhicule. Vidange, freins, embrayage, courroie de distribution, batterie et climatisation expliqués en vidéos sous le capot. Guide des prix de pièces détachées en Afrique inclus.",
    "objectifs": ["Comprendre le fonctionnement d'un moteur","Réaliser les entretiens courants (vidange, filtres)","Diagnostiquer les pannes courantes","Changer freins, amortisseurs, embrayage","Économiser sur les réparations en atelier"],
    "prerequis": "Aucun prérequis technique. Avoir accès à un véhicule est un plus.",
    "outils": "Clés, cric, valise de diagnostic OBD2, huile moteur, filtres",
    "modules": [
      ("Module 1 : Fonctionnement du Moteur", ["Cycle à 4 temps","Système de refroidissement","Circuit électrique","Boîte de vitesses"]),
      ("Module 2 : Entretien Courant", ["Vidange huile moteur","Changement filtres (air, huile, carburant)","Liquide de refroidissement","Contrôle des niveaux"]),
      ("Module 3 : Système de Freinage", ["Types de freins (disque, tambour)","Changer les plaquettes","Régler le frein à main","Liquide de frein"]),
      ("Module 4 : Diagnostic et Pannes", ["Valise OBD2","Batterie et démarrage","Embrayage","Courroie de distribution"]),
      ("Module 5 : Climatisation et Électricité", ["Recharger la climatisation","Câblage et fusibles","Alternateur et démarreur","Accessoires électroniques"]),
    ]
  },
  {
    "title": "Agriculture et Élevage Moderne",
    "short": "Poulet, poisson, légumes, escargots, abeilles.",
    "price": 5000, "hours": 35,
    "desc": "Formation agricole complète adaptée à l'Afrique subsaharienne. Techniques intensives d'élevage (volaille, pisciculture, petit bétail), maraîchage, prévention et traitement des maladies animales. Vidéos tournées sur le terrain, fiches techniques téléchargeables et attestation RIVO.",
    "objectifs": ["Maîtriser les techniques d'élevage avicole et aquacole","Cultiver des légumes en techniques intensives","Prévenir et traiter les maladies animales","Calculer la rentabilité","Commercialiser sa production"],
    "prerequis": "Aucun prérequis. Idéal pour les personnes en zone rurale ou périurbaine.",
    "outils": "Matériel d'élevage, outils agricoles, fiches de suivi",
    "modules": [
      ("Module 1 : Agriculture Maraîchère", ["Préparation du sol","Semis et transplantation","Irrigation et fertilisation","Lutte contre les ravageurs"]),
      ("Module 2 : Aviculture Intensive", ["Construction du poulailler","Races et sélection","Alimentation et eau","Vaccination et santé"]),
      ("Module 3 : Pisciculture", ["Construction des étangs","Alevinage et croissance","Qualité de l'eau","Récolte et commercialisation"]),
      ("Module 4 : Élevage Petit Bétail", ["Escargots géants africains","Lapins et pintades","Rentabilité comparée","Prévention des maladies"]),
      ("Module 5 : Gestion et Commercialisation", ["Tenue de registres","Calcul de rentabilité","Marchés et distribution","Transformation des produits"]),
    ]
  },
  {
    "title": "Pâtisserie et Cake Design",
    "short": "Gâteaux d'anniversaire, cupcakes et entremets.",
    "price": 4000, "hours": 30,
    "desc": "Devenez pâtissier(ère) professionnel(le) avec des recettes adaptées aux ingrédients disponibles en Afrique. Maîtrisez le cake design, la décoration en fondant, les gâteaux à étages et les créations pour mariages et anniversaires. 100 recettes, 200 photos étape par étape et attestation RIVO.",
    "objectifs": ["Réaliser des pâtisseries professionnelles","Maîtriser le cake design et la décoration","Utiliser des ingrédients disponibles localement","Créer des gâteaux de mariage et anniversaire","Vendre ses créations et ouvrir sa pâtisserie"],
    "prerequis": "Aucun prérequis. Aimer cuisiner est un plus.",
    "outils": "Moules, batteur électrique, poche à douille, fondant, colorants alimentaires",
    "modules": [
      ("Module 1 : Bases de la Pâtisserie", ["Ingrédients et matériel","Génoises et biscuits","Crèmes (chantilly, beurre, pâtissière)","Techniques de cuisson"]),
      ("Module 2 : Gâteaux d'Anniversaire", ["Layer cake","Naked cake","Gâteaux à étages","Drip cake"]),
      ("Module 3 : Cake Design Professionnel", ["Couvrir un gâteau de fondant","Modelage de figurines","Fleurs en sucre","Peinture alimentaire"]),
      ("Module 4 : Cupcakes et Petits Gâteaux", ["Cupcakes décorés","Macarons","Choux et éclairs","Financiers et madeleines"]),
      ("Module 5 : Business Pâtisserie", ["Tarification","Gestion des commandes","Photos pour Instagram","Livraison et packaging"]),
    ]
  },
  {
    "title": "Community Management Pro",
    "short": "Gérez les réseaux sociaux d'une entreprise.",
    "price": 4000, "hours": 20,
    "desc": "Devenez community manager professionnel : créez des stratégies de contenu, rédigez des posts engageants, analysez les statistiques et produisez des rapports clients. Formation pratique avec exemples réels d'entreprises africaines. Templates de calendrier éditorial et rapports mensuels inclus.",
    "objectifs": ["Créer et gérer une stratégie de contenu","Rédiger des posts engageants","Analyser les statistiques et KPI","Produire des rapports professionnels","Travailler en freelance comme CM"],
    "prerequis": "Utiliser les réseaux sociaux régulièrement. Notions de rédaction.",
    "outils": "Meta Business Suite, Hootsuite ou Buffer, Canva, Google Analytics",
    "modules": [
      ("Module 1 : Fondamentaux du CM", ["Rôle du community manager","Charte éditoriale","Veille et tendances","Personnalité de marque"]),
      ("Module 2 : Calendrier Éditorial", ["Planification mensuelle","Types de contenus","Fréquence de publication","Outils de planification"]),
      ("Module 3 : Rédaction pour les Réseaux", ["Facebook, Instagram, LinkedIn","Copywriting engageant","CTA efficaces","Emojis et hashtags"]),
      ("Module 4 : Analyse et Reporting", ["Métriques essentielles","Google Analytics","Rapports clients","Ajuster la stratégie"]),
      ("Module 5 : Gestion de Crise", ["Commentaires négatifs","Bad buzz","Réponses diplomatiques","Protocole de crise"]),
    ]
  },
  {
    "title": "Électricité Bâtiment et Domestique",
    "short": "Installez et réparez les installations électriques.",
    "price": 6000, "hours": 25,
    "desc": "Formation complète en électricité du bâtiment : câblage, tableau électrique, prises, interrupteurs, éclairage LED et normes de sécurité. Vidéos tournées sur de vrais chantiers avec schémas téléchargeables. Idéal pour l'autoconstruction, le dépannage et la reconversion professionnelle.",
    "objectifs": ["Lire et interpréter des schémas électriques","Installer un tableau électrique","Poser prises, interrupteurs et luminaires","Dépanner les pannes courantes","Respecter les normes de sécurité"],
    "prerequis": "Sens pratique requis. Respect strict des consignes de sécurité.",
    "outils": "Multimètre, tournevis isolés, pince à dénuder, testeur de phase, niveau",
    "modules": [
      ("Module 1 : Sécurité Électrique", ["Risques électriques","EPI et protections","Règle des 5 étapes","Consignation du réseau"]),
      ("Module 2 : Lecture de Schémas", ["Symboles électriques","Schémas unifilaires","Plans d'installation","Normes"]),
      ("Module 3 : Installation Électrique", ["Tableau électrique","Câblage des prises","Interrupteurs va-et-vient","Éclairage LED"]),
      ("Module 4 : Éclairage et Domotique", ["Choix des luminaires","Éclairage extérieur","Variateurs","Bases de la domotique"]),
      ("Module 5 : Dépannage", ["Chercher une panne","Prise défaillante","Tableau qui disjoncte","Court-circuit"]),
    ]
  },
  {
    "title": "Création de Contenu Viral",
    "short": "Devenez créateur de contenu sur TikTok et Instagram.",
    "price": 5000, "hours": 20,
    "desc": "Devenez créateur de contenu viral sur TikTok et Instagram Reels. Apprenez à comprendre les algorithmes, créer des hooks puissants, développer un style unique et monétiser votre audience. 50 exemples de vidéos virales analysées, templates de scripts et guide de monétisation inclus.",
    "objectifs": ["Comprendre l'algorithme TikTok et Instagram Reels","Créer des hooks qui captent l'attention en 3 secondes","Développer un style et univers visuel unique","Atteindre des milliers de vues organiquement","Monétiser sa communauté"],
    "prerequis": "Smartphone avec TikTok ou Instagram. Aucune expérience créative requise.",
    "outils": "TikTok, Instagram, CapCut, Canva, Notion (pour le planning)",
    "modules": [
      ("Module 1 : Comprendre la Viralité", ["Algorithmes expliqués","Ce qui rend une vidéo virale","Analyse de comptes viraux","Votre niche et positionnement"]),
      ("Module 2 : Créer du Contenu Accrocheur", ["Hook puissant en 3 secondes","Storytelling vidéo","Format et durée idéale","B-roll et montage rapide"]),
      ("Module 3 : Optimisation SEO Social", ["Hashtags stratégiques","Légendes engageantes","Heure de publication","Interaction communauté"]),
      ("Module 4 : Croissance de la Communauté", ["Collaborations et duos","Challenges et tendances","Lives et Q&A","Fidéliser ses abonnés"]),
      ("Module 5 : Monétisation", ["Programme Creator Fund","Partenariats et placements","Vente de produits numériques","Agences et freelance"]),
    ]
  },
  {
    "title": "Programmation Python et IA",
    "short": "Initiez-vous au langage le plus demandé au monde.",
    "price": 8000, "hours": 25,
    "desc": "Apprenez Python de zéro jusqu'à l'introduction à l'intelligence artificielle. Variables, boucles, fonctions, bibliothèques NumPy/Pandas, Machine Learning avec Scikit-learn. 100 exercices corrigés, projets pratiques, code source téléchargeable et attestation RIVO. Préparez une carrière en data ou IA.",
    "objectifs": ["Écrire des programmes Python de A à Z","Utiliser les bibliothèques essentielles (NumPy, Pandas)","Comprendre les bases du Machine Learning","Créer un chatbot ou système de recommandation","Préparer une carrière en data science ou IA"],
    "prerequis": "Aucun prérequis en programmation. Logique mathématique de base.",
    "outils": "Python 3 (gratuit), VS Code, Jupyter Notebook, Google Colab",
    "modules": [
      ("Module 1 : Bases de Python", ["Variables et types de données","Opérateurs","Conditions (if/elif/else)","Boucles (for, while)"]),
      ("Module 2 : Fonctions et Modules", ["Définir et appeler des fonctions","Portée des variables","Modules et import","Gestion des erreurs"]),
      ("Module 3 : Structures de Données", ["Listes, tuples, dictionnaires","Compréhensions de liste","Fichiers CSV et JSON","Manipulation de chaînes"]),
      ("Module 4 : Bibliothèques Scientifiques", ["NumPy pour le calcul","Pandas pour les données","Matplotlib pour les graphiques","Requests pour les APIs"]),
      ("Module 5 : Introduction à l'IA", ["Machine Learning concepts","Scikit-learn","Régression et classification","Projet final : modèle prédictif"]),
    ]
  },
  {
    "title": "Gestion de Projet Agile Scrum",
    "short": "Maîtrisez la méthodologie Scrum en entreprise.",
    "price": 6000, "hours": 15,
    "desc": "Maîtrisez le framework Scrum pour gérer des projets IT et non-IT efficacement. Rôles (Product Owner, Scrum Master, équipe), cérémonies (sprint planning, daily, review, retrospective), backlog et user stories. Templates Jira/Trello inclus. Préparation à la certification PSM I.",
    "objectifs": ["Comprendre le manifeste Agile et ses principes","Maîtriser les rôles Scrum","Organiser les sprints et cérémonies","Rédiger des user stories et épics","Utiliser des outils Agile (Jira, Trello)"],
    "prerequis": "Expérience en gestion de projet ou en équipe recommandée.",
    "outils": "Jira, Trello, Miro, Confluence",
    "modules": [
      ("Module 1 : Manifeste Agile", ["12 principes Agile","Agile vs Waterfall","Méthodes Agile","Quand utiliser Agile ?"]),
      ("Module 2 : Framework Scrum", ["Les 3 piliers","Product Owner","Scrum Master","Équipe de développement"]),
      ("Module 3 : Artefacts Scrum", ["Product Backlog","Sprint Backlog","Increment","Definition of Done"]),
      ("Module 4 : Cérémonies Scrum", ["Sprint Planning","Daily Scrum","Sprint Review","Sprint Retrospective"]),
      ("Module 5 : Outils et Pratiques", ["Jira pour le backlog","Burndown chart","Velocity","Planning Poker"]),
    ]
  },
  {
    "title": "Service Client et Relation Client",
    "short": "Fidélisez vos clients et gérez les réclamations.",
    "price": 3000, "hours": 10,
    "desc": "Formation pratique au service client et à la gestion des relations clients. Communication avec empathie, gestion des réclamations et clients difficiles, scripts d'appel et emails professionnels, mesure de la satisfaction (NPS, CSAT). Idéale pour les commerciaux, agents d'accueil et entrepreneurs.",
    "objectifs": ["Communiquer avec empathie et professionnalisme","Gérer les réclamations et clients difficiles","Fidéliser les clients par un service exceptionnel","Utiliser un CRM basique","Mesurer la satisfaction client"],
    "prerequis": "Tout public. Idéal pour commerciaux, agents d'accueil, entrepreneurs.",
    "outils": "CRM (HubSpot gratuit), email, téléphone, Google Forms",
    "modules": [
      ("Module 1 : Fondamentaux Service Client", ["Attentes des clients","Écoute active","Communication non-verbale","Empathie"]),
      ("Module 2 : Gestion des Réclamations", ["Les 4 étapes","Client difficile","Gestes commerciaux","Transformer une plainte en opportunité"]),
      ("Module 3 : Scripts et Templates", ["Accueil téléphonique","Email professionnel","Chat","Scripts de fidélisation"]),
      ("Module 4 : Outils CRM", ["Saisir les interactions","Historique et suivi","Relances","Rapports"]),
      ("Module 5 : Mesurer la Satisfaction", ["NPS","CSAT et CES","Enquêtes","Actions correctives"]),
    ]
  },
  {
    "title": "Sécurité Informatique et Cybersécurité",
    "short": "Protégez vos données contre les pirates.",
    "price": 9000, "hours": 20,
    "desc": "Protégez-vous et votre entreprise contre les cyberattaques. Phishing, ransomware, arnaques en ligne, mots de passe forts, authentification à deux facteurs, VPN et sécurité WiFi. Checklist de sécurité complète, guide des meilleurs outils gratuits et plan de sécurité pour entreprise inclus.",
    "objectifs": ["Créer des mots de passe forts et gérer ses identifiants","Reconnaître et éviter le phishing et les arnaques","Sécuriser sa connexion WiFi","Protéger ses données personnelles et professionnelles","Comprendre les bases de la cybersécurité"],
    "prerequis": "Utiliser un ordinateur ou smartphone. Aucune compétence technique requise.",
    "outils": "Gestionnaire de mots de passe (Bitwarden), VPN, antivirus, 2FA",
    "modules": [
      ("Module 1 : Menaces Cyber Actuelles", ["Types d'attaques","Ingénierie sociale","Arnaques courantes en Afrique","Statistiques cybersécurité"]),
      ("Module 2 : Mots de Passe et Accès", ["Mots de passe forts","Gestionnaire de mots de passe","Authentification 2FA","Sécurité comptes Google/Facebook"]),
      ("Module 3 : Sécuriser ses Appareils", ["Mises à jour et patches","Antivirus et pare-feu","Chiffrement","Sauvegarde 3-2-1"]),
      ("Module 4 : Sécurité Réseau", ["WiFi sécurisé (WPA3)","VPN","Réseaux publics","DNS et filtrage"]),
      ("Module 5 : Sécurité en Entreprise", ["Politique de sécurité","Formation des employés","Plan de réponse aux incidents","RGPD"]),
    ]
  },
  {
    "title": "Bourse et Trading pour Débutants",
    "short": "Apprenez à investir en bourse depuis votre téléphone.",
    "price": 7000, "hours": 20,
    "desc": "Formation au trading et à l'investissement boursier pour débutants. Marchés financiers, analyse technique (chandeliers, supports/résistances, RSI, MACD), gestion du risque et tenue d'un journal de trading. Simulateur de trading, guide des applications mobiles et attestation RIVO.",
    "objectifs": ["Comprendre le fonctionnement des marchés","Lire et analyser des graphiques boursiers","Appliquer les bases de l'analyse technique","Gérer le risque et ses émotions","Investir en bourse de façon responsable"],
    "prerequis": "Notions de base en gestion financière.",
    "outils": "Trading 212, eToro, BRVM app, TradingView",
    "modules": [
      ("Module 1 : Marchés Financiers", ["Actions, obligations, ETF, forex","BRVM","Courtiers et frais","Ouvrir un compte"]),
      ("Module 2 : Analyse Technique", ["Chandeliers japonais","Tendances","Supports et résistances","Volumes"]),
      ("Module 3 : Indicateurs Techniques", ["Moyennes mobiles","RSI et MACD","Bandes de Bollinger","TradingView"]),
      ("Module 4 : Stratégies de Trading", ["Day trading vs swing trading","Suivi de tendance","Breakout","Backtesting"]),
      ("Module 5 : Gestion du Risque", ["Taille de position","Stop-loss et take-profit","Ratio risque/rendement","Journal de trading"]),
    ]
  },
  {
    "title": "Rédaction Web et Copywriting",
    "short": "Écrivez des textes qui vendent et attirent les clients.",
    "price": 5000, "hours": 15,
    "desc": "Apprenez à écrire des textes web optimisés pour les moteurs de recherche et convaincants pour les lecteurs. Pages de vente, emails marketing, articles de blog SEO. Formules de copywriting (AIDA, PAS), 50 exemples commentés, templates prêts à l'emploi et attestation RIVO.",
    "objectifs": ["Rédiger des textes web optimisés SEO","Créer des pages de vente qui convertissent","Écrire des emails marketing efficaces","Maîtriser les formules de copywriting","Travailler en freelance comme rédacteur web"],
    "prerequis": "Bonne maîtrise du français écrit.",
    "outils": "Google Docs, WordPress, Yoast SEO, Mailchimp",
    "modules": [
      ("Module 1 : Fondamentaux du Copywriting", ["Différence copywriting / rédaction","Psychologie de la persuasion","Formules AIDA et PAS","Connaître son audience"]),
      ("Module 2 : Rédaction Web SEO", ["Mots-clés et intention de recherche","Structure d'un article","Balises titre et meta","Maillage interne"]),
      ("Module 3 : Pages de Vente", ["Titre accrocheur","Bénéfices vs caractéristiques","Preuves sociales","CTA irrésistible"]),
      ("Module 4 : Emails Marketing", ["Ligne d'objet","Storytelling dans les emails","Séquences automatiques","Tests A/B"]),
      ("Module 5 : Freelance Rédacteur", ["Trouver des clients","Tarification","Portfolio et Fiverr","Contrat et facturation"]),
    ]
  },
  {
    "title": "Décoration d'Intérieur",
    "short": "Transformez n'importe quel espace en lieu magnifique.",
    "price": 4000, "hours": 15,
    "desc": "Formation en décoration d'intérieur adaptée aux espaces africains. Harmonie des couleurs, agencement des meubles, éclairage d'ambiance, home staging pour la vente immobilière. 100 photos de réalisations inspirantes, guide des fournisseurs locaux et applications de simulation inclus.",
    "objectifs": ["Choisir des couleurs et matières harmonieuses","Agencer meubles et accessoires avec style","Maîtriser l'éclairage d'ambiance","Pratiquer le home staging","Proposer ses services en décoration"],
    "prerequis": "Intérêt pour la décoration. Aucun diplôme requis.",
    "outils": "Planche de tendances, apps de simulation (Planner 5D, Homestyler)",
    "modules": [
      ("Module 1 : Principes du Design Intérieur", ["Styles décoratifs","Psychologie des couleurs","Proportions et échelle","Rythme visuel"]),
      ("Module 2 : Couleurs et Matières", ["Cercle chromatique","Harmonies de couleurs","Matières (bois, métal, tissu)","Revêtements"]),
      ("Module 3 : Meubles et Agencement", ["Plan de masse","Circulation","Meubles multifonctions","Zones dans un espace"]),
      ("Module 4 : Éclairage d'Ambiance", ["Éclairage général, d'accent, décoratif","Luminaires tendance","LED économiques","Lumière naturelle simulée"]),
      ("Module 5 : Home Staging et Business", ["Préparer un bien","Dépersonnaliser","Petits travaux à fort impact","Photos immobilières"]),
    ]
  },
  {
    "title": "Maquillage Professionnel Complet",
    "short": "Du maquillage naturel au maquillage artistique.",
    "price": 5000, "hours": 25,
    "desc": "Formation complète en maquillage adaptée aux peaux africaines. Préparation de la peau, fond de teint, contouring, smoky eye, maquillage de mariée. 100 photos de démonstration sur différentes carnations, liste des meilleurs produits disponibles en Afrique et guide pour lancer son activité.",
    "objectifs": ["Préparer et prendre soin de la peau avant maquillage","Maîtriser le fond de teint et le contouring","Réaliser différents looks","Travailler sur toutes les carnations africaines","Ouvrir son activité de maquilleuse"],
    "prerequis": "Aucun prérequis. Passion pour la beauté recommandée.",
    "outils": "Pinceaux, fond de teint, palette correcteurs, highlighter, fixateur",
    "modules": [
      ("Module 1 : Soins et Préparation Peau", ["Types de peau","Nettoyage et hydratation","Primer et base","Protection solaire"]),
      ("Module 2 : Teint Parfait Peaux Noires", ["Fond de teint adapté","Correcteurs et anti-cernes","Poudres et fixation","Contouring"]),
      ("Module 3 : Maquillage des Yeux", ["Fards à paupières","Eye-liner et mascara","Sourcils parfaits","Faux cils"]),
      ("Module 4 : Maquillage des Lèvres", ["Lip liner","Rouges à lèvres longue durée","Gloss et tendances","Dégradé de lèvres"]),
      ("Module 5 : Maquillage Événementiel", ["Mariée","Soirée","Naturel quotidien","Business maquilleuse"]),
    ]
  },
]

# Formations supplémentaires avec modules génériques
EXTRA = [
    ("Puériculture et Garde d'Enfants", 3000, 15, "Devenez nounou professionnelle certifiée. Soins nourrisson, sécurité, activités d'éveil et premiers secours. Formation complète pour travailler en crèche, à domicile ou ouvrir sa propre garderie. Guide pratique pédiatrique et attestation RIVO."),
    ("Logistique et Gestion des Stocks", 5000, 12, "Organisez votre stock et vos livraisons efficacement. Entrepôt, suivi des stocks avec Excel et Odoo, choix des transporteurs, optimisation des coûts logistiques. Templates Excel de gestion et attestation RIVO."),
    ("Formation de Formateur", 6000, 15, "Apprenez à transmettre votre savoir et créer des formations en ligne ou en présentiel. Pédagogie adulte, conception de programme, animation de groupe, évaluation des apprenants. Templates de cours et attestation RIVO."),
    ("Menuiserie et Fabrication de Meubles", 6000, 25, "Fabriquez vos propres meubles en bois : outils, assemblages, finitions, vernissage. Formation pratique en atelier, plans téléchargeables pour 20 modèles de meubles et attestation RIVO."),
    ("Saponification et Cosmétiques Naturels", 4000, 15, "Fabriquez savons, crèmes et produits de beauté naturels avec des ingrédients africains : karité, coco, argan. 30 recettes naturelles, liste de fournisseurs et attestation RIVO."),
    ("Podcast et Audio Digital", 3000, 10, "Créez et diffusez votre podcast professionnel sur Spotify, Apple Podcasts. Thème, enregistrement, montage audio, couverture et promotion. Guide du matériel audio abordable et attestation RIVO."),
    ("Gestion de Crise et Communication", 4000, 10, "Protégez votre réputation en situation difficile : bad buzz, médias, réseaux sociaux, excuses publiques. Études de cas d'entreprises africaines et protocole de gestion de crise inclus."),
    ("Maintenance Informatique et Réparation", 5000, 20, "Réparez ordinateurs et smartphones : diagnostic, remplacement de composants (écran, clavier, batterie), réinstallation Windows/Linux. Guide des pièces détachées africaines et attestation RIVO."),
    ("Marketing d'Affiliation", 4000, 10, "Gagnez des commissions en recommandant des produits en ligne. Programmes d'affiliation africains et internationaux, création de contenu, suivi des performances. Liste de 50 programmes et attestation RIVO."),
    ("Production Musicale FL Studio", 7000, 20, "Créez vos propres beats et instrumentales pour l'Afrobeats, le coupé-décalé et les musiques africaines. FL Studio, mélodies, drums, plugins, mixage, mastering. 50 samples et projets inclus."),
    ("Tourisme et Hôtellerie", 4000, 15, "Formation aux métiers de l'accueil et du tourisme en Afrique : réservations, service à la clientèle, guidage touristique, vente de séjours. Documents types et simulation de situations réelles."),
    ("Dessin Artistique et Illustration", 3000, 20, "Du croquis au portait abouti : proportions, ombres, textures, dessin numérique (Procreate, Ibis Paint). 100 exercices progressifs et attestation RIVO. Idéal pour illustrateurs et créatifs."),
    ("Plantes Médicinales et Remèdes Naturels", 4000, 15, "Découvrez le pouvoir des plantes médicinales africaines : moringa, neem, bissap, kinkeliba. Reconnaissance, préparation de décoctions, pommades et huiles. 50 fiches plantes détaillées."),
    ("Vente Directe et Négociation", 3000, 10, "Maîtrisez l'art de la vente en face à face : prospection, présentation du produit, gestion des objections, conclusion et suivi. Scripts de vente adaptés au marché africain et attestation RIVO."),
    ("CV et Lettre de Motivation Percutants", 2000, 5, "Décrochez plus d'entretiens avec un CV professionnel et une lettre de motivation percutante. Structure, mots-clés ATS, adaptation par secteur. 20 templates téléchargeables et attestation RIVO."),
    ("Langue Portugaise pour les Affaires", 4000, 15, "Commercez avec le Brésil, le Portugal et l'Angola en portuguais. Conversation business, vocabulaire commercial, correspondance professionnelle. 15h de vidéos, exercices audio et attestation RIVO."),
    ("Apiculture et Production de Miel", 4000, 15, "Élevez des abeilles et vendez votre miel de qualité. Ruches modernes (Langstroth, Kenyane), entretien des colonies, récolte, extraction, conditionnement. Calendrier apicole et attestation RIVO."),
    ("Google Ads et Publicité en Ligne", 9000, 15, "Créez des campagnes Google Ads rentables : Search, Display, YouTube Ads, retargeting. Mots-clés, enchères, Quality Score, analyse des résultats. Compte démo pratique et attestation RIVO."),
    ("Facebook Ads et Instagram Ads", 7000, 15, "Publicités ciblées sur les réseaux Meta : audiences, créatifs performants, budget, A/B tests. Gestion complète d'une campagne Facebook/Instagram Ads pour le marché africain. Templates prêts à l'emploi."),
    ("SEO et Référencement Naturel", 8000, 15, "Soyez visible sur Google sans payer de publicité. Recherche de mots-clés, backlinks, SEO technique, audit de site, contenu optimisé. Checklist SEO, outils gratuits (Search Console, Ubersuggest) et attestation RIVO."),
    ("Adobe Photoshop Complet", 6000, 25, "Retouche photo et création graphique avec Photoshop : calques, masques, filtres, détourage, photomontage. De la retouche portrait au webdesign. 100 exercices progressifs et projets réels inclus."),
    ("Adobe Illustrator Complet", 6000, 20, "Dessin vectoriel et création de logos avec Adobe Illustrator. Courbes de Bézier, typographie créative, système de couleurs, exportation. 50 exercices, création d'une identité visuelle complète et attestation RIVO."),
    ("Adobe Premiere Pro Complet", 8000, 25, "Montage vidéo professionnel pour le cinéma, la publicité et le web. Timeline multicaméra, effets visuels, mixage audio, étalonnage, export. Projets réels tournés inclus et attestation RIVO."),
    ("After Effects et Motion Design", 9000, 20, "Créez des animations et effets visuels époustouflants avec After Effects. Keyframes, expressions, compositing, particules, infographies animées. Templates premium offerts et attestation RIVO."),
    ("Canva pour les Réseaux Sociaux", 2000, 10, "Créez tous vos visuels rapidement et professionnellement avec Canva. Templates, animations, posts, stories, reels, présentations, CVs. 100 templates personnalisés offerts et attestation RIVO."),
    ("Figma et UI/UX Design", 7000, 20, "Design d'interfaces web et mobile avec Figma. Wireframes, prototypes interactifs, design system, tests utilisateurs. Projets réels : app mobile et site web. Attestation RIVO et préparation aux entretiens UX."),
    ("Blender et Modélisation 3D", 8000, 25, "Créez des objets 3D pour le jeu vidéo, l'animation et l'impression 3D avec Blender. Modélisation, textures PBR, éclairage, rendu Cycles/EEVEE. Projets complets et assets gratuits inclus."),
    ("Kotlin et Développement Android", 10000, 30, "Créez des applications mobiles Android professionnelles en Kotlin. Activities, fragments, RecyclerView, Room, Retrofit, Firebase. Publier sur le Play Store. 3 projets complets et attestation RIVO."),
    ("Swift et Développement iOS", 10000, 30, "Créez des applications iPhone et iPad avec Swift et SwiftUI. UIKit, animations, CoreData, API REST, App Store. 3 applications complètes et attestation RIVO. Idéal pour développeurs iOS en herbe."),
    ("Flutter et Apps Multi-plateformes", 9000, 25, "Créez une seule application pour Android et iOS avec Flutter (Dart). Widgets, state management (Provider/Bloc), Firebase, déploiement. 2 projets complets et attestation RIVO."),
    ("React JS et Applications Web Modernes", 8000, 25, "Développez des interfaces web dynamiques et performantes avec React.js. Components, hooks, Redux, React Router, API REST. 3 projets pratiques dont un dashboard et attestation RIVO."),
    ("Node JS et Backend JavaScript", 8000, 25, "Créez des serveurs et APIs RESTful avec Node.js et Express. MongoDB, authentification JWT, upload de fichiers, déploiement sur VPS. 2 projets backend complets et attestation RIVO."),
    ("PHP et MySQL pour le Web", 7000, 25, "Développement backend avec PHP 8 et MySQL. CRUD complet, sessions et cookies, sécurité (PDO, XSS, CSRF), APIs REST. Projet : plateforme e-commerce complète et attestation RIVO."),
    ("WordPress et Création de Sites", 5000, 15, "Créez des sites professionnels sans coder avec WordPress. Thèmes (Elementor, Divi), plugins essentiels, WooCommerce pour la vente en ligne, SEO Yoast, sécurité. Templates premium inclus."),
    ("Data Science et Analyse de Données", 9000, 25, "Exploitez les données pour prendre des décisions stratégiques. Python, Pandas, NumPy, visualisation (Matplotlib, Seaborn), statistiques avancées, Machine Learning. Datasets réels africains inclus."),
    ("Power BI et Visualisation de Données", 6000, 15, "Créez des tableaux de bord interactifs et des rapports professionnels avec Power BI. Import de données, transformation (Power Query), DAX, dashboards. Exercices pratiques avec données réelles."),
    ("SQL et Bases de Données", 5000, 15, "Maîtrisez le langage SQL pour gérer et interroger des bases de données. SELECT, JOIN, GROUP BY, sous-requêtes, index, procédures stockées. 100 exercices progressifs avec MySQL et PostgreSQL."),
    ("Linux et Administration Serveur", 7000, 20, "Gérez des serveurs Linux comme un professionnel. Commandes de base, scripting bash, gestion des utilisateurs et permissions, services (Apache, Nginx), sécurité SSH. Machine virtuelle de pratique incluse."),
    ("Cloud Computing AWS", 10000, 25, "Déployez vos applications sur Amazon Web Services. EC2, S3, Lambda, RDS, IAM, VPC, sécurité cloud. Préparation à la certification AWS Cloud Practitioner. Labs pratiques avec compte AWS gratuit."),
    ("Blockchain et Web3", 9000, 20, "Comprenez et développez sur la blockchain. Bitcoin, Ethereum, smart contracts Solidity, NFTs, DeFi. Créer et déployer son premier smart contract sur testnet. Guide de sécurité crypto inclus."),
    ("Développement de Jeux Vidéo Unity", 10000, 30, "Créez votre premier jeu vidéo avec Unity (C#). Scènes, physics, UI canvas, animations, particules, audio, build Android/iOS. 3 jeux complets : platformer, puzzle, jeu mobile. Assets gratuits inclus."),
    ("Drones : Pilotage et Photographie Aérienne", 5000, 10, "Pilotez un drone légalement et réalisez de superbes photos et vidéos aériennes. Réglementation africaine, techniques de vol, cadrage aérien, montage de rushs drone. Checklist de sécurité et attestation RIVO."),
    ("Énergie Solaire et Installation", 8000, 20, "Installez des systèmes solaires photovoltaïques : dimensionnement, câblage, batteries, régulateurs MPPT, onduleurs. Idéal pour techniciens et entrepreneurs en énergie renouvelable. Schémas techniques et attestation RIVO."),
    ("Climatisation et Froid Industriel", 7000, 20, "Installez et réparez les systèmes de climatisation et de réfrigération. Diagnostic, charge de gaz réfrigérant, soudure brasure, entretien préventif. Guide technique avec fiches de données des fluides frigorigènes."),
    ("Plomberie et Tuyauterie", 5000, 20, "Réparez et installez les systèmes d'alimentation en eau et d'évacuation. Tuyaux (PER, PVC, cuivre), robinets, chauffe-eau, détartrage. Schémas de plomberie téléchargeables et attestation RIVO."),
    ("Soudure et Métallerie", 7000, 20, "Travaillez le métal : soudure à l'arc, MIG/MAG, TIG. Sécurité, préparation des pièces, techniques d'assemblage, finitions et peinture. Vidéos en atelier de soudure professionnel et attestation RIVO."),
    ("Conduite Automobile et Code de la Route", 3000, 15, "Préparez votre permis de conduire théorique et les bases de la conduite pratique. Code de la route africain, panneaux, règles de priorité, conduite défensive, éco-conduite. Tests en ligne inclus."),
    ("Mécanique Moto et Entretien", 4000, 15, "Réparez et entretenez votre moto vous-même. Moteur 2T et 4T, transmission, freins, pneus, carburateur, injection. Checklist d'entretien, guide des pièces détachées et attestation RIVO."),
    ("Réparation de Téléphones Portables", 5000, 15, "Réparez les smartphones : écran cassé, batterie défaillante, connecteur de charge, logiciel. Soudure micro, démontage, recyclage. Guide des pièces détachées et des outils en Afrique. Attestation RIVO."),
    ("Artisanat et Bijouterie Fantaisie", 3000, 10, "Créez des bijoux et accessoires originaux pour les vendre : perles, fils métalliques, résine, métal. Techniques de montage, finitions, packaging créatif. Liste de fournisseurs africains et guide de vente."),
    ("Cordonnerie et Réparation de Chaussures", 2000, 10, "Réparez semelles, coutures, teintures et structures de chaussures. Outils spécialisés, colles, matériaux. Formation pratique pour ouvrir un atelier de cordonnerie. Attestation RIVO."),
    ("Tapisserie et Ameublement", 4000, 15, "Restaurez et créez des meubles tapissés. Tissus d'ameublement, mousse, agrafage, capitonnage, finitions. Vidéos en atelier de tapisserie, guide des tissus disponibles en Afrique et attestation RIVO."),
    ("Peinture en Bâtiment et Décoration", 3000, 10, "Peignez murs, plafonds et boiseries comme un professionnel. Préparation des surfaces, sous-couche, finitions (mat, satiné, brillant), effets décoratifs (patine, béton ciré). Guide des peintures locales."),
    ("Carrelage et Revêtement de Sol", 5000, 15, "Posez du carrelage comme un professionnel. Mesure et calepinage, découpe, colles et joints, poses spéciales (chevrons, hexagone). Vidéos sur chantier et calcul des quantités de matériaux inclus."),
    ("Maçonnerie et Construction", 7000, 20, "Bases de la construction en Afrique : fondations, chaînages, murs en parpaings, béton armé, enduits. Dosages, coffrage, ferraillage, finitions. Vidéos sur chantier réel et normes de construction locales."),
    ("Permis Poids Lourd et Transport", 8000, 20, "Préparez le permis poids lourd (C, CE) et les compétences de transport routier. Code, conduite spécifique, réglementation sociale, tachygraphe, gestion de flotte. Documents de transport inclus."),
    ("Secourisme et Premiers Secours", 2000, 8, "Apprenez les gestes qui sauvent des vies. RCP adulte/enfant/nourrisson, défibrillateur (DAE), PLS, étouffement, hémorragie. Préparation à la certification PSC1. Attestation RIVO."),
    ("Incendie et Sécurité Incendie", 4000, 10, "Prévention et lutte contre les incendies dans les entreprises et bâtiments. Types d'extincteurs, évacuation, alarmes, consignes, normes. Exercices pratiques simulés et attestation RIVO."),
    ("Surveillance et Vidéoprotection", 5000, 12, "Installez des systèmes de sécurité : caméras IP, NVR, alarmes anti-intrusion, contrôle d'accès. Câblage, configuration, accès à distance via smartphone. Guide des marques et attestation RIVO."),
    ("Domotique et Maison Intelligente", 7000, 15, "Automatisez votre maison : lumières, volets, alarmes, thermostats, prises connectées. Protocoles (Z-Wave, Zigbee, WiFi), box domotique, assistants vocaux. Kits pratiques et attestation RIVO."),
    ("Robotique et Arduino", 8000, 20, "Construisez et programmez des robots avec Arduino (C++). Capteurs (ultrason, IR, DHT11), moteurs, servos, LCD, WiFi ESP8266. Projets : robot suiveur de ligne, station météo, bras robotique."),
    ("Impression 3D et Modélisation", 6000, 10, "Imprimez vos créations en 3D. Logiciels de tranchage (Cura, PrusaSlicer), matériaux (PLA, PETG, TPU), calibration, résolution des problèmes. Fichiers STL prêts à imprimer et attestation RIVO."),
    ("Commerce International et Import-Export", 8000, 15, "Importez et exportez des marchandises en Afrique. Procédures douanières, incoterms, documents de transport (connaissement, CMR), paiements internationaux (SWIFT, crédit documentaire). Documents types."),
    ("Gestion des Ressources Humaines", 6000, 20, "Gérez le personnel de votre entreprise : recrutement, contrats, paie, évaluation, gestion des conflits. Droit du travail OHADA, modèles de documents RH et attestation RIVO."),
    ("Comptabilité Générale et Fiscalité", 7000, 25, "Tenez la comptabilité d'une entreprise : bilan, compte de résultat, journaux, grand livre. TVA, déclarations fiscales, SYSCOHADA révisé. 50 exercices avec corrigés et attestation RIVO."),
    ("Gestion de la Paie", 5000, 15, "Calculez et éditez les bulletins de salaire : brut, cotisations, net, congés payés, déclarations sociales (CNPS/ONSS). Logiciel de paie, modèles Excel et attestation RIVO."),
    ("Assistanat de Direction et Secrétariat", 4000, 15, "Devenez assistant(e) de direction efficace. Gestion d'agenda, organisation de réunions, courrier professionnel, comptes-rendus, logiciels bureautiques. Templates professionnels et attestation RIVO."),
    ("Télémarketing et Vente par Téléphone", 3000, 8, "Vendez par téléphone avec des scripts qui marchent. Accroche téléphonique, argumentaire, gestion des objections, conclusion et suivi CRM. Scripts audio enregistrés et attestation RIVO."),
    ("Événementiel et Organisation de Fêtes", 5000, 15, "Organisez des événements réussis : mariages, anniversaires, conférences. Budget, prestataires, décoration, traiteur, planning. Checklists téléchargeables et contacts de prestataires africains."),
    ("Journalisme et Reportage", 5000, 15, "Devenez journaliste ou reporter. Enquête de terrain, interview, écriture journalistique, éthique de la presse, montage vidéo de reportage. Exercices terrain et attestation RIVO."),
    ("Blogging et Création de Site d'Actualité", 4000, 12, "Lancez votre blog ou site d'information rentable. WordPress, SEO news, contenu d'actualité, monétisation (AdSense, abonnements). Templates et guide de monétisation inclus."),
    ("Streaming et Gaming sur Twitch", 4000, 10, "Devenez streamer et gagnez de l'argent en jouant. OBS Studio, overlay personnalisé, interaction communauté, monétisation Twitch. Assets graphiques de streaming et attestation RIVO."),
    ("Langue Espagnole Débutant", 3500, 20, "Apprenez l'espagnol pour voyager et travailler en Amérique latine et en Espagne. Vocabulaire, grammaire, conversation. 20h de vidéos, exercices audio et attestation RIVO."),
    ("Langue Allemande Débutant", 3500, 20, "Initiez-vous à l'allemand pour les affaires et les études en Europe. Bases de prononciation, vocabulaire essentiel, situations quotidiennes. 20h de vidéos, exercices audio et attestation RIVO."),
    ("Langue Chinoise Mandarin Débutant", 6000, 20, "Découvrez le mandarin pour le commerce avec la Chine. Caractères de base, tons, conversation simple, vocabulaire business. 20h de vidéos, audio et système pinyin expliqué."),
    ("Langue Arabe Débutant", 4000, 20, "Apprenez l'arabe pour les affaires et les voyages au Maghreb et au Moyen-Orient. Alphabet arabe, vocabulaire commercial, conversation de base. 20h de vidéos, audio et attestation RIVO."),
    ("Français des Affaires et Rédaction Pro", 3000, 15, "Perfectionnez votre français écrit et oral pour le monde professionnel. Rapports, comptes-rendus, présentations, orthographe, syntaxe avancée. Exercices corrigés et attestation RIVO."),
    ("Prise de Parole en Public", 4000, 10, "Parlez avec aisance et conviction devant un auditoire. Gestion du trac, voix et diction, gestuelle, structure du discours, storytelling. Exercices filmés et analyse de grands orateurs."),
    ("Négociation Commerciale", 5000, 10, "Obtenez les meilleurs accords dans vos négociations commerciales. Préparation stratégique, techniques de négociation, concessions, closing, négociation en contexte africain. Scripts et cas pratiques."),
    ("Gestion du Temps et Productivité", 2000, 8, "Faites plus en moins de temps et sans stress. Méthodes GTD, Pomodoro, matrice d'Eisenhower, gestion de la procrastination, outils numériques. Templates de planning et attestation RIVO."),
    ("Leadership et Management d'Équipe", 5000, 15, "Devenez un leader inspirant et efficace. Styles de leadership, motivation d'équipe, délégation, feedback, résolution de conflits. Études de cas de leaders africains et attestation RIVO."),
    ("Animation et Travail avec les Enfants", 3000, 10, "Devenez animateur périscolaire ou de colonie de vacances. Jeux, activités créatives, gestion de groupe, sécurité des enfants, premiers secours pédiatriques. Guide d'activités avec matériel local."),
    ("Pêche et Aquaculture", 4000, 15, "Techniques modernes de pêche et d'élevage de poissons en Afrique. Pêche artisanale améliorée, cages flottantes, étangs piscicoles, alimentation, commercialisation. Calendrier piscicole et attestation RIVO."),
    ("Aviculture et Élevage de Poulets", 4000, 15, "Élevage de poulets de chair et de pondeuses rentable en Afrique. Construction du poulailler, races adaptées, alimentation, calendrier de vaccination, vente. Calcul de rentabilité inclus."),
    ("Élevage d'Escargots Géants Africains", 3000, 10, "L'héliciculture africaine : enclos, substrat, alimentation (feuilles, fruits), reproduction, récolte et commercialisation. Business très peu connu mais très rentable. Guide complet et attestation RIVO."),
    ("Maraîchage et Culture de Légumes", 3500, 15, "Cultivez tomates, piments, aubergines, salades, gombos. Techniques : sol, semis, repiquage, irrigation, engrais organiques et chimiques, protection phytosanitaire. Fiches techniques par légume incluses."),
    ("Transformation Agroalimentaire", 5000, 15, "Transformez vos récoltes agricoles en produits à valeur ajoutée. Jus de fruits (ditax, baobab), confitures, séchage, conserves, huile de palme artisanale. Recettes, emballage et réglementation alimentaire."),
    ("Pisciculture et Élevage de Tilapia", 4500, 15, "Produisez du poisson de qualité en bassin ou étang. Tilapia et catfish (silure africain). Qualité de l'eau, alimentation, reproduction contrôlée, récolte et vente. Calendrier de production inclus."),
    ("Gestion de l'Eau et Irrigation", 4000, 12, "Maîtrisez l'irrigation agricole pour optimiser votre production. Goutte-à-goutte, aspersion, gravité, pompes solaires, forage. Schémas d'installation, calcul des besoins en eau et attestation RIVO."),
    ("Permaculture et Agriculture Durable", 3500, 12, "Cultivez durablement en respectant la nature. Design permaculturel, compostage, associations de cultures, buttes jardinières, agroforesterie. Plans téléchargeables et attestation RIVO."),
    ("Nutrition et Diététique", 3000, 12, "Mangez sainement et équilibrez votre alimentation avec des aliments locaux africains. Groupes d'aliments, macronutriments, calories, menus équilibrés, perte de poids saine. Fiches recettes africaines équilibrées."),
    ("Cuisine Africaine Traditionnelle", 3000, 10, "Maîtrisez les grands classiques de la cuisine africaine. Attiéké, alloco, mafé, yassa poulet, ndolé, thiéboudiène, poulet braisé. 50 recettes détaillées avec photos étape par étape."),
    ("Boulangerie et Viennoiserie", 4000, 15, "Faites votre pain, croissants, brioches et pains spéciaux maison ou en boulangerie. Pétrissage, levée, façonnage, cuisson. 30 recettes adaptées aux fours africains et attestation RIVO."),
    ("Chocolaterie et Confiserie", 5000, 10, "Fabriquez des chocolats, bonbons et confiseries à vendre. Tempérage du chocolat, moulage, ganaches, caramels, pâtes de fruits, emballage. Recettes avec cacao africain et attestation RIVO."),
    ("Mixologie et Art du Cocktail", 3000, 8, "Devenez barman et créez des cocktails avec ou sans alcool. Matériel, techniques de base (shaker, muddle), recettes classiques et créations africaines. Fiches recettes et attestation RIVO."),
    ("Coaching Sportif et Fitness", 6000, 20, "Devenez coach sportif certifié. Anatomie fonctionnelle, conception de programmes d'entraînement, nutrition sportive, coaching individuel et en groupe. Fiches d'exercices et attestation RIVO."),
    ("Football : Techniques et Tactiques", 3000, 15, "Améliorez votre jeu de football et comprenez les tactiques. Techniques individuelles (dribbles, passes, tirs, headers), systèmes de jeu (4-3-3, 4-4-2), préparation physique. Exercices terrain inclus."),
    ("Natation pour Débutants", 2000, 10, "Apprenez à nager quel que soit votre âge. Gestion de la respiration, brasse, crawl, dos crawlé, départ plongé. Vidéos en piscine, conseils de sécurité aquatique et attestation RIVO."),
    ("Arts Martiaux et Self-Défense", 4000, 15, "Apprenez à vous défendre en toute situation. Karaté, judo, boxe française, krav maga : clés, projections, esquives, techniques de frappe. Démonstrations filmées et attestation RIVO."),
    ("Guitare Acoustique pour Débutants", 3000, 15, "Jouez vos premières chansons à la guitare acoustique. Accords (Do, Ré, Mi, La, Sol), rythmes, arpèges, chansons africaines et internationales. Tablatures téléchargeables et attestation RIVO."),
    ("Piano et Clavier Débutant", 4000, 15, "Apprenez le piano même sans connaître le solfège. Notes, accords de base, gammes, morceaux simples. Méthode visuelle avec 100 exercices progressifs, partitions et attestation RIVO."),
    ("Chant et Technique Vocale", 3000, 10, "Améliorez votre voix et chantez juste. Respiration diaphragmatique, placement de la voix, justesse, puissance et interprétation. Exercices audio quotidiens et attestation RIVO."),
    ("Danse Moderne et Chorégraphie", 2000, 10, "Apprenez à danser avec style : afrobeats, coupé-décalé, ndombolo, amapiano. Pas de base, coordination, enchaînements, création de chorégraphies. Vidéos de démonstration et attestation RIVO."),
    ("DJing et Mixage pour Débutants", 5000, 10, "Devenez DJ : platines, transitions fluides, sets complets. Matériel (contrôleurs, logiciels Serato/Rekordbox), beatmatching, mix harmonique, EQ. Samples et attestation RIVO."),
    ("Scénario et Écriture de Film", 5000, 12, "Écrivez votre premier scénario de court ou long métrage. Structure en 3 actes, création de personnages, dialogues naturels, mise en page professionnelle. Templates et logiciel Final Draft/Celtx."),
    ("Réalisation de Court-Métrage", 7000, 20, "Réalisez votre premier film de A à Z. Scénario, casting, repérages, tournage (cadre, lumière, son), montage, étalonnage et diffusion sur festivals. Interviews de réalisateurs africains incluses."),
    ("Animation 2D avec Adobe Animate", 6000, 15, "Créez des dessins animés et animations web avec Adobe Animate. Images clés, interpolations, personnages, symboles, export pour web/TV. Projets complets et assets libres de droits."),
    ("Effets Spéciaux VFX pour le Cinéma", 10000, 20, "Ajoutez des effets numériques à vos vidéos. Écran vert (chroma key), compositing After Effects, particules, explosions, titres cinéma. Assets VFX premium inclus et attestation RIVO."),
    ("Acting et Jeu d'Acteur", 5000, 15, "Devenez acteur pour le cinéma, la télévision et le théâtre. Improvisation, travail des émotions, mémorisation du texte, direction par le réalisateur, jeu face caméra. Exercices filmés et attestation RIVO."),
    ("Voix Off et Doublage", 4000, 10, "Devenez doubleur ou narrateur professionnel. Respiration, articulation, jeu vocal, enregistrement en studio maison (home studio). Guide du matériel abordable et attestation RIVO."),
    ("Son et Ingénierie Audio", 6000, 15, "Maîtrisez la prise de son et le mixage audio. Micros (dynamique, à condensateur), acoustique, table de mixage, logiciels DAW (Audacity, Reaper), mastering. Exercices pratiques et attestation RIVO."),
    ("Éclairage et Light Design", 5000, 12, "Maîtrisez l'éclairage pour la photographie, la vidéo, la scène et l'événementiel. Types de sources lumineuses, placement, ambiance, DMX, éclairage LED. Schémas de montage et attestation RIVO."),
    ("Droit des Affaires OHADA", 8000, 20, "Comprenez le droit OHADA pour sécuriser vos affaires en Afrique. Actes uniformes (sociétés, commerce général, sûretés), contrats, arbitrage, propriété intellectuelle. Modèles de contrats téléchargeables."),
    ("Propriété Intellectuelle et Brevets", 5000, 10, "Protégez vos créations, marques et inventions en Afrique. Copyright, marques déposées, brevets d'invention, enregistrement OAPI/ARIPO. Guides et formulaires de dépôt inclus."),
    ("Géopolitique et Relations Internationales", 5000, 15, "Comprenez les enjeux géopolitiques mondiaux et africains. Histoire des relations internationales, conflits en cours, économie politique, organisations (UA, ONU, CEDEAO). Analyses et cartes."),
    ("Histoire de l'Afrique et des Civilisations", 3000, 15, "Connaissez la vraie et complète histoire du continent africain. Grands empires (Mali, Ghana, Songhaï, Kongo), traite négrière, colonisation, décolonisation, enjeux actuels. Cartes historiques incluses."),
    ("Grandes Pensées Philosophiques", 3000, 12, "Découvrez les grands philosophes et leurs idées qui ont changé le monde. Platon, Aristote, Kant, Nietzsche, philosophie africaine (Ubuntu, Cheikh Anta Diop), éthique contemporaine."),
    ("Art Oratoire et Éloquence", 4000, 10, "Devenez un orateur captivant et persuasif. Discours structurés, rhétorique, figures de style, gestion du trac, concours d'éloquence. Exercices filmés et analyse des meilleurs orateurs africains."),
    ("Calligraphie et Belle Écriture", 2000, 8, "Apprenez l'art de la belle écriture manuscrite. Plume, pinceau et rotring. Styles (gothique, copperplate, moderne). Compositions artistiques, cartes et invitations. Exercices progressifs."),
    ("Poterie et Céramique", 4000, 12, "Créez des objets en argile : pots, vases, sculptures et vaisselle. Tour de potier, modelage à la main, émaillage, cuisson au four. Vidéos en atelier de poterie et attestation RIVO."),
    ("Vannerie et Tissage Artisanal", 2000, 10, "Fabriquez paniers, sacs, chapeaux et objets décoratifs en fibres végétales africaines. Techniques de tressage, teintures naturelles, motifs traditionnels. Liste de matières premières locales."),
    ("Reliure et Restauration de Livres", 3000, 10, "Réparez et restaurez des livres anciens et créez vos propres carnets. Couture à la main, collage, fabrication de couverture, dorure. Guide du matériel de reliure et attestation RIVO."),
    ("Horlogerie et Réparation de Montres", 5000, 15, "Réparez montres mécaniques et à quartz. Démontage, nettoyage des rouages, remplacement de pile et d'axe, réglage. Outils spécialisés, guide de pièces et attestation RIVO."),
    ("Lutherie et Fabrication de Guitare", 9000, 25, "Fabriquez votre propre guitare acoustique de A à Z. Choix du bois, découpe de la table, assemblage, vernissage, montage des mécaniques et cordes. Vidéos en atelier de lutherie professionnel."),
    ("Taxidermie et Conservation Animale", 6000, 15, "Apprenez à naturaliser les animaux pour musées, collections et trophées. Préparation de la peau, formol, montage sur mannequin, cadre et finitions. Législation africaine sur la faune sauvage."),
    ("Cartographie et SIG", 7000, 15, "Créez des cartes professionnelles avec les Systèmes d'Information Géographique. QGIS, GPS, import de données spatiales, analyses géospatiales, cartes thématiques. Données africaines libres incluses."),
    ("Topographie et Relevés de Terrain", 7000, 15, "Mesurez et cartographiez des terrains pour la construction et l'agriculture. Théodolite, GPS RTK, nivellement, report de plans, calcul de surfaces. Exercices terrain et attestation RIVO."),
    ("Géologie et Recherche Minière", 8000, 20, "Comprenez les sols, roches et ressources minérales en Afrique. Minéralogie, cartographie géologique, prospection artisanale, exploitation minière artisanale légale. Guide des ressources africaines."),
    ("Météorologie et Climatologie", 4000, 10, "Comprenez et prédisez le temps qu'il fait. Nuages, pression atmosphérique, vents, instruments météo, cartes synoptiques, impact du changement climatique. Données météo africaines incluses."),
    ("Océanographie et Environnement Marin", 5000, 12, "Étudiez les océans et la vie marine en Afrique. Courants marins, marées, écosystèmes côtiers, pêche durable, pollution plastique, protection des récifs. Documentaires et études de cas africains."),
    ("Zoologie et Comportement Animal", 5000, 15, "Étudiez les animaux sauvages et domestiques d'Afrique. Classification, éthologie, communication animale, conservation de la faune. Documentaires animaliers, safaris virtuels et attestation RIVO."),
    ("Botanique et Étude des Plantes", 4000, 12, "Identifiez et étudiez les plantes d'Afrique subsaharienne. Classification botanique, herbier, usages médicinaux et alimentaires, conservation. Fiches d'identification de 100 plantes africaines."),
    ("Astronomie et Observation du Ciel", 4000, 10, "Observez les étoiles, planètes et galaxies depuis l'Afrique. Télescope et jumelles, cartes du ciel, constellations africaines, astrophotographie avec smartphone. Guide du ciel africain inclus."),
    ("Mathématiques Appliquées", 3000, 20, "Renforcez vos bases en mathématiques pour les études, les concours et le travail. Algèbre, géométrie, statistiques, probabilités, analyse. 200 exercices corrigés progressifs et attestation RIVO."),
    ("Physique et Chimie Générale", 4000, 20, "Comprenez les bases de la physique et de la chimie. Mécanique, optique, électricité, atomes, réactions chimiques, stoechiométrie. Expériences pratiques, exercices et attestation RIVO."),
    ("Biologie et Sciences de la Vie", 4000, 20, "Étudiez le vivant : cellules, ADN, génétique, évolution, écosystèmes, corps humain, microbiologie. Schémas détaillés, animations 3D et exercices corrigés inclus."),
    ("Architecture et Conception de Bâtiments", 9000, 25, "Apprenez à concevoir des plans de maisons et bâtiments. Esquisses, plans 2D/3D, matériaux locaux, normes parasismiques. Logiciels (AutoCAD, SketchUp), projets réels africains."),
    ("Urbanisme et Aménagement du Territoire", 7000, 15, "Concevez des villes et quartiers durables et fonctionnels. Zonage, transports en commun, espaces verts, gestion des déchets, participation citoyenne. Études de cas de villes africaines."),
    ("Génie Civil et Construction", 9000, 25, "Bases du génie civil africain : béton armé, structures de bâtiments, routes et ponts. Calculs de structure, choix des matériaux, normes de construction, sécurité sur chantier."),
    ("Énergies Renouvelables", 8000, 20, "Solaire, éolien, biomasse, hydraulique : les énergies de l'avenir africain. Dimensionnement, installation, maintenance, analyse de rentabilité, financement de projets. Études de cas africains."),
    ("Gestion de l'Environnement et Déchets", 4000, 12, "Recyclage, traitement des déchets et économie circulaire en Afrique. Collecte, tri, valorisation (compostage, biogaz, recyclage), sensibilisation communautaire. Guides pratiques."),
    ("Changement Climatique et Adaptation", 3000, 10, "Comprenez le changement climatique et comment l'Afrique peut s'y adapter. Gaz à effet de serre, impacts en Afrique, solutions d'adaptation, négociations climatiques internationales."),
    ("Diplomatie et Protocole", 6000, 12, "Maîtrisez les codes de la diplomatie internationale et du protocole officiel. Cérémonial d'État, préséances, rédaction de notes diplomatiques, négociations bilatérales. Guide de protocole africain."),
    ("Archivistique et Gestion Documentaire", 4000, 10, "Classez et conservez les documents importants de votre organisation. Classement physique et numérique, indexation, numérisation, archivage légal. Logiciels libres de GED et attestation RIVO."),
    ("Bibliothéconomie et Gestion de Bibliothèque", 3000, 10, "Gérez une bibliothèque scolaire, communautaire ou numérique. Catalogage MARC21, prêt et retour, animation lecture, gestion du fonds documentaire. Logiciel PMB gratuit inclus."),
    ("Muséologie et Conservation du Patrimoine", 5000, 15, "Préservez et valorisez le patrimoine culturel africain. Conservation préventive et curative, exposition, médiation culturelle, inventaire numérique du patrimoine. Études de cas de musées africains."),
    ("Gestion des ONG et Associations", 4000, 12, "Créez et gérez une ONG ou association efficacement. Statuts juridiques, recherche de subventions, gestion de projets humanitaires, bénévolat, communication. Modèles de dossiers de financement."),
    ("Coopération Internationale et Développement", 6000, 15, "Travaillez dans l'humanitaire et le développement international. Bailleurs de fonds (AFD, UE, ONU), cycle de projet, suivi-évaluation, rapports d'activité. Templates et attestation RIVO."),
    ("Relations Publiques et Communication Corporate", 5000, 12, "Gérez l'image et la communication d'une entreprise ou institution. Communiqués de presse, relations médias, gestion d'événements corporate, lobbying. Exemples réels africains."),
    ("Démographie et Statistiques Sociales", 5000, 12, "Analysez les populations et leurs dynamiques. Recensement, indicateurs démographiques (natalité, mortalité, migration), pyramides des âges, projections. Données africaines incluses."),
    ("Criminologie et Sciences Forensiques", 6000, 15, "Comprenez le crime et les techniques d'enquête criminelle. Criminologie, empreintes digitales, ADN forensique, balistique, scène de crime, profilage. Études de cas africains."),
    ("Sécurité et Gestion des Risques", 6000, 15, "Protégez les personnes et les biens en entreprise et dans les projets. Audit de sécurité, plan de sécurité, gestion de crise, normes ISO 45001 et ISO 31000. Templates professionnels."),
    ("Aéronautique et Pilotage d'Avion Léger", 10000, 20, "Initiez-vous au pilotage d'avion léger (ULM, PPL). Aérodynamique, navigation aérienne, météorologie, réglementation, simulateur de vol. Idéal avant la formation en centre agréé."),
    ("Navigation Maritime et Plaisance", 7000, 15, "Apprenez à naviguer sur un voilier ou un bateau à moteur. Lecture de cartes marines, compas, balises, météo maritime, manœuvres de port, sécurité en mer. Attestation RIVO."),
    ("Plongée Sous-Marine et Apnée", 5000, 10, "Découvrez les fonds marins d'Afrique en sécurité. Équipement de plongée, techniques de descente et remontée, paliers de décompression, apnée, faune et flore marines africaines."),
    ("Alpinisme et Escalade", 4000, 10, "Initiez-vous à l'escalade et à la randonnée en montagne. Nœuds d'escalade, assurage, lecture de voies, sécurité, équipement. Démonstrations filmées et attestation RIVO."),
    ("Survie en Milieu Naturel", 4000, 10, "Apprenez à survivre en forêt africaine, désert ou savane. Faire du feu, construire un abri, trouver de l'eau, s'orienter sans GPS, plantes comestibles et dangereuses. Guide terrain illustré."),
]

def make_generic_modules(title):
    return [
        (f"Module 1 : Introduction", [
            f"Histoire et contexte de {title}",
            "Vocabulaire et concepts fondamentaux",
            "Outils, matériel et ressources nécessaires",
            "Débouchés professionnels et opportunités",
        ]),
        ("Module 2 : Techniques Fondamentales", [
            "Bases théoriques essentielles",
            "Premières techniques pratiques guidées",
            "Exercices pas à pas avec corrections",
            "Erreurs courantes à éviter",
        ]),
        ("Module 3 : Pratique Avancée", [
            "Méthodes et techniques professionnelles",
            "Cas pratiques et mises en situation réelle",
            "Optimisation de la qualité et de l'efficacité",
            "Standards professionnels du secteur",
        ]),
        ("Module 4 : Projets Réels", [
            "Projet guidé complet de A à Z",
            "Travaux personnels avec retours formateur",
            "Évaluation des compétences acquises",
            "Portfolio ou book de réalisations",
        ]),
        ("Module 5 : Professionnalisation et Business", [
            "Débouchés, opportunités et revenus potentiels",
            "Construire son réseau professionnel",
            "Tarification, gestion client et facturation",
            "Attestation RIVO et suite du parcours",
        ]),
    ]

if __name__ == "__main__":
    all_courses = list(COURSES)
    for title, price, hours, desc in EXTRA:
        all_courses.append({
            "title": title,
            "short": desc.split(".")[0][:80] + ".",
            "price": price, "hours": hours, "desc": desc,
            "objectifs": [
                f"Acquérir les fondamentaux de {title}",
                "Réaliser des travaux pratiques concrets et professionnels",
                "Appliquer les normes et standards du secteur",
                "Développer une activité rémunératrice",
                "Obtenir l'attestation RIVO officiellement reconnue",
            ],
            "prerequis": "Accessible à tous. Aucun prérequis académique exigé.",
            "outils": "Matériel et logiciels spécifiques détaillés dans le cours.",
            "modules": make_generic_modules(title),
        })

    print(f"Génération de {len(all_courses)} PDFs...")
    ok = err = 0
    for i, c in enumerate(all_courses, 1):
        fn = f"{i:03d}_{slug(c['title'])}.pdf"
        out = os.path.join(OUTPUT_DIR, fn)
        try:
            build_pdf(c, out)
            ok += 1
            print(f"  [{i:3d}/200] OK  {fn}")
        except Exception as e:
            err += 1
            print(f"  [{i:3d}/200] ERR {c['title']} -> {e}")

    print(f"\nTerminé : {ok} PDFs générés, {err} erreurs")
    print(f"Dossier : {OUTPUT_DIR}/")
