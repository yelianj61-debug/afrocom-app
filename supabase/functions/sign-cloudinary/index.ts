// Edge Function Supabase — URL signée Cloudinary avec expiration 1h
// Utilise l'API Secret Cloudinary standard (algorithme SHA-1 officiel)
//
// Appel depuis le frontend :
//   const { signed_url } = await supabase.functions.invoke('sign-cloudinary', {
//     body: { public_id: 'afrotv/pdfs/mon-cours.pdf', resource_type: 'raw' }
//   });

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CLOUD_NAME = "dx0dzt35e";
const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET") ?? "eFlcGbbJ9mZOqtDsM4XTMMUYhwA";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

// Algorithme officiel Cloudinary : SHA-1(to_sign + api_secret) → base64url → 8 chars
async function cloudinarySign(toSign: string): Promise<string> {
  const data = new TextEncoder().encode(toSign + API_SECRET);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashBytes = new Uint8Array(hashBuffer);
  const base64 = btoa(String.fromCharCode(...hashBytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "").substring(0, 8);
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

    // Expiration dans 1 heure (timestamp Unix)
    const expires_at = Math.floor(Date.now() / 1000) + 3600;

    // Signature : SHA-1 de "expiration={exp}&public_id={pid}" + API_SECRET
    const toSign = `expiration=${expires_at}&public_id=${public_id}`;
    const sig = await cloudinarySign(toSign);

    // URL signée — format Cloudinary authenticated delivery
    const signedUrl =
      `https://res.cloudinary.com/${CLOUD_NAME}/${resource_type}/authenticated/` +
      `s--${sig}--/${public_id}`;

    return new Response(
      JSON.stringify({ signed_url: signedUrl, expires_at }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
