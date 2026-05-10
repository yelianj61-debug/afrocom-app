import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const LEEKPAY_SECRET = Deno.env.get("LEEKPAY_SECRET_KEY")!;
const LEEKPAY_API    = "https://leekpay.fr";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const { order_id, amount, customer_email, customer_name, callback_url } =
    await req.json();

  const res = await fetch(`${LEEKPAY_API}/api/v1/checkout`, {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${LEEKPAY_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency:     "XOF",
      description:  `TikTok Coins - Commande #${order_id}`,
      reference:    `TTC-${order_id}`,
      callback_url,
      customer: {
        email: customer_email,
        name:  customer_name || "Client",
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: "Erreur Leekpay", detail: data }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS } }
    );
  }

  /* Leekpay peut retourner l'URL dans différents champs selon la version de l'API */
  const paymentUrl =
    data.payment_url      ||
    data.checkout_url     ||
    data.url              ||
    data.link             ||
    data.redirect_url     ||
    data.payment_link     ||
    data?.data?.url       ||
    data?.data?.payment_url;

  if (!paymentUrl) {
    return new Response(
      JSON.stringify({ error: "URL introuvable", raw: data }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS } }
    );
  }

  return new Response(
    JSON.stringify({
      transaction_id: data.id || data.transaction_id || data?.data?.id,
      payment_url:    paymentUrl,
    }),
    { headers: { "Content-Type": "application/json", ...CORS } }
  );
});
