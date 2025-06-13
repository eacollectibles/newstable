
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

    for (const card of cards) {
      const { cardName, sku = null, quantity = 1 } = card;

      const productRes = await fetch(
        `https://${SHOPIFY_DOMAIN}/admin/api/2023-10/products.json?title=${encodeURIComponent(cardName)}`,
        {
          method: 'GET',
          headers: {
            'X-Shopify-Access-Token': ACCESS_TOKEN,
            'Content-Type': 'application/json'
          }
        }
      );

      const productText = await productRes.text();
      let productData;

      try {
        productData = JSON.parse(productText);
      } catch (err) {
        return res.status(500).json({ error: 'Failed to parse product data', details: err.message });
      }

      // If no product by title, try variant SKU match
      if (!productData || !productData.products || productData.products.length === 0) {
        const variantsRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2023-10/variants.json`, {
          method: 'GET',
          headers: {
            'X-Shopify-Access-Token': ACCESS_TOKEN,
            'Content-Type': 'application/json'
          }
        });

        const variantsText = await variantsRes.text();
        let variantsData;
        try {
          variantsData = JSON.parse(variantsText);
        } catch (parseErr) {
          return res.status(500).json({ error: 'Failed to parse variants data', details: parseErr.message });
        }

        
      let variantPrice = 0;
      let matchedVariant = null;

      // Option 1: GraphQL by SKU
      try {
        matchedVariant = await fetchVariantBySKU(sku || cardName);
        if (matchedVariant && matchedVariant.price) {
          variantPrice = parseFloat(matchedVariant.price);
          console.log("Resolved via Option 1 (SKU):", variantPrice);
        }
      } catch (err) {
        console.warn("Option 1 failed:", err.message);
      }

      // Option 2: REST search by title
      if (!variantPrice) {
        try {
          const productRes = await fetch(
            `https://${SHOPIFY_DOMAIN}/admin/api/2023-10/products.json?title=${encodeURIComponent(cardName)}`,
            {
              method: 'GET',
              headers: {
                'X-Shopify-Access-Token': ACCESS_TOKEN,
                'Content-Type': 'application/json'
              }
            }
          );
          const productText = await productRes.text();
          let productData = JSON.parse(productText);
          const product = productData?.products?.[0];
          const variant = product?.variants?.[0];
          if (variant?.price) {
            variantPrice = parseFloat(variant.price);
            matchedVariant = variant;
            console.log("Resolved via Option 2 (Title):", variantPrice);
          }
        } catch (err) {
          console.warn("Option 2 failed:", err.message);
        }
      }

      // Option 3: Fallback to all variants
      if (!variantPrice) {
        try {
          const variantsRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2023-10/variants.json`, {
            method: 'GET',
            headers: {
              'X-Shopify-Access-Token': ACCESS_TOKEN,
              'Content-Type': 'application/json'
            }
          });
          const variantsText = await variantsRes.text();
          const variantsData = JSON.parse(variantsText);
          const match = variantsData.variants.find(v => v.sku === sku || v.title === cardName);
          if (match?.price) {
            variantPrice = parseFloat(match.price);
            matchedVariant = match;
            console.log("Resolved via Option 3 (Brute Force):", variantPrice);
          }
        } catch (err) {
          console.warn("Option 3 failed:", err.message);
        }
      }

      // Option 4: Hardcoded fallback
      if (!variantPrice) {
        const fallbackPrices = {
          "Zapdos (H32)": 40.00,
          "Charizard (H1)": 100.00
        };
        if (fallbackPrices[cardName]) {
          variantPrice = fallbackPrices[cardName];
          console.log("Resolved via Option 4 (Static Table):", variantPrice);
        }
      }

      // Option 5: Fail and log
      if (!variantPrice) {
        return res.status(404).json({
          error: "Could not resolve item price for this card",
          attemptedSKU: sku,
          cardName
        });
      }

      const tradeInValue = parseFloat((variantPrice * 0.30).toFixed(2));
      totalValue += tradeInValue * quantity;

      results.push({
        cardName,
        match: matchedVariant.title,
        itemValue: variantPrice,
        tradeInValue,
        quantity
      });
      continue;

        } else {
          results.push({
            cardName,
            match: null,
            itemValue: 0,
            tradeInValue: 0,
            quantity
          });
          continue;
        }
      }

      // Fallback to first product variant
      
    }

    const finalPayout = overrideTotal !== undefined ? parseFloat(overrideTotal) : totalValue;

    
    let giftCardCode = null;
    if (payoutMethod === "store-credit" && finalPayout > 0) {
      try {
        const giftCardRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2023-10/gift_cards.json`, {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": ACCESS_TOKEN,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            gift_card: {
              initial_value: finalPayout.toFixed(2),
              note: `Buyback payout for ${employeeName || "Unknown"}`,
              currency: "CAD"
            }
          })
        });
        const giftCardData = await giftCardRes.json();
        giftCardCode = giftCardData?.gift_card?.code || null;
      } catch (err) {
        console.error("Gift card creation failed:", err);
      }
    }

    res.status(200).json({
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
