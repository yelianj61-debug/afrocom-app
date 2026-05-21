// Edge Function Supabase : génère une URL Cloudinary signée (expiration 1h)
// Déployer : supabase functions deploy sign-cloudinary
//
// Prérequis Cloudinary :
//   1. Activer "Advanced Access Control" dans Settings → Security
//   2. Copier l'Auth Key (≠ API Secret) dans les secrets de cette fonction
//
// Utilisation depuis le frontend :
//   const { signed_url } = await supabase.functions.invoke('sign-cloudinary', {
//     body: { public_id: 'afrotv/pdfs/mon-fichier.pdf', resource_type: 'raw' }
//   });

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CLOUD_NAME = "dx0dzt35e";
// AUTH_KEY = la clé d'authentification Cloudinary (Paramètres → Sécurité → Auth Token Key)
// À stocker en secret : supabase secrets set CLOUDINARY_AUTH_KEY=<valeur>
const AUTH_KEY = Deno.env.get("CLOUDINARY_AUTH_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

async function hmacSha256Hex(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { public_id, resource_type = "raw" } = await req.json();

    if (!public_id) {
      return new Response(JSON.stringify({ error: "public_id requis" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (!AUTH_KEY) {
      return new Response(
        JSON.stringify({ error: "CLOUDINARY_AUTH_KEY non configuré" }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Expiration : maintenant + 1 heure
    const exp = Math.floor(Date.now() / 1000) + 3600;

    // Signature Cloudinary token-based auth
    // Format des claims : exp={exp}~acl=/{public_id}
    const acl = `/${public_id}`;
    const tokenClaims = `exp=${exp}~acl=${acl}`;
    const hmac = await hmacSha256Hex(AUTH_KEY, tokenClaims);

    // URL signée finale
    const signedUrl =
      `https://res.cloudinary.com/${CLOUD_NAME}/${resource_type}/upload/` +
      `__cld_token__=exp=${exp}~acl=${encodeURIComponent(acl)}~hmac=${hmac}/` +
      `${public_id}`;

    return new Response(
      JSON.stringify({ signed_url: signedUrl, expires_at: exp }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
