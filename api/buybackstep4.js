
module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const estimateMode = req.query?.estimate === 'true';
    const { cards, employeeName, payoutMethod, overrideTotal } = req.body;

    if (!cards || !Array.isArray(cards)) {
      return res.status(400).json({ error: 'Invalid or missing cards array' });
    }

    const SHOPIFY_DOMAIN = "ke40sv-my.myshopify.com";
    const ACCESS_TOKEN = "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";

    
const fetchVariantBySKU = async (sku) => {
  const query = `
    {
      productVariants(first: 1, query: "sku:${sku}") {
        edges {
          node {
            id
            title
            sku
            price
            inventoryQuantity
            product {
              title
            }
          }
        }
      }
    }
  `;

  const graphqlRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2023-10/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query })
  });

  const json = await graphqlRes.json();
  const variantEdge = json?.data?.productVariants?.edges?.[0];
  return variantEdge?.node || null;
};

  let totalValue = 0;
    const results = [];
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { cardName, quantity = 1 } = req.body;
  if (!cardName) {
    return res.status(400).json({ error: 'Missing card name' });
  }

  const SHOPIFY_DOMAIN = "ke40sv-my.myshopify.com";
  const ACCESS_TOKEN = "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";

  try {
    // Step 1: Find the product
    const productRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2023-10/products.json?title=${encodeURIComponent(cardName)}`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    const productText = await productRes.text();

    let productData;
    try {
      productData = JSON.parse(productText);
    } catch (parseErr) {
      return res.status(500).json({ error: "Invalid JSON from Shopify", raw: productText });
    }

    if (!productData.products || productData.products.length === 0) {
      return res.status(404).json({ error: 'Card not found in Shopify inventory' });
    }

    const product = productData.products[0];
    const variant = product.variants[0];
    const inventoryItemId = variant.inventory_item_id;

    // Step 2: Get location ID
    const locationRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2023-10/locations.json`, {
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    const locations = await locationRes.json();
    if (!locations.locations || locations.locations.length === 0) {
      return res.status(500).json({ error: 'No inventory locations found' });
    }

    const locationId = locations.locations[0].id;

    // Step 3: Adjust inventory level
    const adjustRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2023-10/inventory_levels/adjust.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available_adjustment: parseInt(quantity)
      })
    });

    const adjustData = await adjustRes.json();
    if (adjustRes.status !== 200) {
      return res.status(500).json({ error: "Failed to adjust inventory", details: adjustData });
    }

    // Return product info and confirmation
    return res.status(200).json({
      giftCardCode,
      estimate: estimateMode,
      employeeName,
      payoutMethod,
      results,
      total: totalValue.toFixed(2),
      overrideTotal: overrideTotal ? finalPayout.toFixed(2) : null
    });
  } catch (err) {
    console.error("Fatal API Error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};
