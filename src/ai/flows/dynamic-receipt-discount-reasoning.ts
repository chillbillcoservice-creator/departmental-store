'use server';

/**
 * @fileOverview A flow to dynamically generate a receipt preview for a departmental store based on applied discounts.
 *
 * - generateReceipt - A function that generates the receipt preview with dynamic discount information.
 * - GenerateReceiptInput - The input type for the generateReceipt function, including order details and discount.
 * - GenerateReceiptOutput - The return type for the generateReceipt function, containing the receipt preview.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateReceiptInputSchema = z.object({
  venueName: z.string().describe('The name of the departmental store or supermarket.'),
  items: z.array(
    z.object({
      name: z.string().describe('Name of the item.'),
      quantity: z.number().describe('Quantity of the item.'),
      price: z.number().describe('Price of the item.'),
    })
  ).describe('List of items in the order.'),
  discount: z.number().describe('Discount percentage (0-20).'),
  subtotal: z.number().describe('The subtotal of the items before the discount.'),
  total: z.number().describe('The total cost of the order after applying the discount.'),
  currency: z.string().optional().default('Rs.').describe('The currency symbol.'),
});

export type GenerateReceiptInput = z.infer<typeof GenerateReceiptInputSchema>;

const GenerateReceiptOutputSchema = z.object({
  receiptPreview: z.string().describe('Dynamically formatted receipt preview.'),
});

export type GenerateReceiptOutput = z.infer<typeof GenerateReceiptOutputSchema>;

export async function generateReceipt(input: GenerateReceiptInput): Promise<GenerateReceiptOutput> {
  return generateReceiptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReceiptPrompt',
  input: { schema: GenerateReceiptInputSchema },
  output: { schema: GenerateReceiptOutputSchema },
  prompt: `You are a point-of-sale (POS) assistant for a departmental store and supermarket. Your task is to generate a retail receipt preview. The receipt must be well-formatted, easy to read, and professional.

The receipt should have the following structure:
1. A header, which is the name of the store: {{{venueName}}}.
2. A section for "Item Details" with an aligned list of items. Each line should show: quantity, item name, and the total price for that line item (quantity * price).
3. A summary section showing the "Subtotal", "Discount" (only if applicable), and the final "Total".
4. A footer thanking the customer for shopping.

**Formatting Rules:**
- Use a monospaced font style for alignment.
- Ensure all prices are right-aligned for a clean look.
- The summary section should be clearly separated with lines.
- **CRITICAL**: If the discount percentage is 0, you MUST NOT show the "Discount" line in the summary.
- **CRITICAL**: Always use "{{{currency}}}" as the currency symbol.

**Order Data:**
- **Store Name**: {{{venueName}}}
- **Items**: I will provide an array of item objects. For each item, you must calculate the line total (item.price * item.quantity).
- **Discount Percentage**: {{discount}}%
- **Subtotal**: {{{currency}}}{{subtotal}}
- **Total**: {{{currency}}}{{total}}

**Here are the items for the current order:**
{{#each items}}
- {{quantity}} x {{name}} (at {{{currency}}}{{price}} each)
{{/each}}

**Example of a correctly formatted receipt with a discount:**
***********************************
     PREMIER DEPARTMENTAL STORE
***********************************

Item Details:
1. 1 x Basmati Rice 1kg   Rs.140.00
2. 2 x Amul Butter 100g   Rs.116.00

-----------------------------------
Subtotal:                 Rs.256.00
Discount (5%):            -Rs.12.80
-----------------------------------
Total:                    Rs.243.20

   Thank you for shopping with us!
***********************************

**Example of a correctly formatted receipt without a discount:**
***********************************
     PREMIER DEPARTMENTAL STORE
***********************************

Item Details:
1. 1 x Tata Salt 1kg       Rs.28.00
2. 2 x Maggi Noodles 70g   Rs.28.00

-----------------------------------
Subtotal:                  Rs.56.00
-----------------------------------
Total:                     Rs.56.00

   Thank you for shopping with us!
***********************************

Now, please generate the receipt for the provided order data, using {{{venueName}}} as the header.
`,
});

const generateReceiptFlow = ai.defineFlow(
  {
    name: 'generateReceiptFlow',
    inputSchema: GenerateReceiptInputSchema,
    outputSchema: GenerateReceiptOutputSchema,
  },
  async input => {
    try {
      const { output } = await prompt(input);
      if (!output) {
        return { receiptPreview: '' };
      }
      return output;
    } catch (error) {
      console.error("AI receipt generation failed, falling back to local format. Error:", error);
      return { receiptPreview: '' };
    }
  }
);
