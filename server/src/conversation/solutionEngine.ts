export interface SolutionResult {
  hasDirectSolution: boolean;
  solution: string;
  hindiSolution?: string;
  suggestedAction?: string;
  fieldNeeded?: "order_id" | "customer_phone" | "customer_name" | "transaction_ref";
}

export class SolutionEngine {
  /**
   * Provides helpful, natural guidance for customer inquiries without
   * hallucinating merchant-specific policies, delivery times, or return windows.
   */
  public static solve(
    utterance: string,
    language: "English" | "Hindi" | "Hindi + English",
    entities: { customer_name?: string; order_id?: string; customer_phone?: string }
  ): SolutionResult {
    const text = utterance.toLowerCase().trim();
    const name = entities.customer_name ? `${entities.customer_name}, ` : "";
    const nameHi = entities.customer_name ? `${entities.customer_name} ji, ` : "";
    const orderId = entities.order_id ? `#${entities.order_id}` : "";

    // 0. Missing Reference Number / Forgotten Order ID
    if (
      (text.includes("remember") || text.includes("forgot") || text.includes("yaad nahi") || text.includes("bhool") || text.includes("don't have") || text.includes("dont have") || text.includes("lost") || text.includes("no ")) &&
      (text.includes("reference") || text.includes("order number") || text.includes("order id") || text.includes("tracking id") || text.includes("receipt"))
    ) {
      return {
        hasDirectSolution: true,
        solution: `${name}That's completely fine. If you don't have the reference number, you can check your order confirmation email or SMS, or share your registered phone number or email address so we can locate your record.`,
        hindiSolution: `${nameHi}Koi baat nahi. Agar aapke paas reference number nahi hai, to aap apna confirmation email ya SMS check kar sakte hain, ya registered phone number sajha karein taaki hum aapka record dhoondh sakein.`,
        suggestedAction: "ALTERNATIVE_LOOKUP",
        fieldNeeded: "customer_phone"
      };
    }

    // 0.5 General Order Help Request
    if (
      text.includes("need help with an order") ||
      text.includes("help with my order") ||
      text.includes("help with order") ||
      text.includes("order help") ||
      text.includes("order me madad") ||
      text === "i need help with an order." ||
      text === "i need help with an order" ||
      text === "need help with an order"
    ) {
      return {
        hasDirectSolution: true,
        solution: `${name}I can help with your order. Do you have your order number or reference number, or would you like to check tracking, returns, or cancellation?`,
        hindiSolution: `${nameHi}Main aapke order me madad kar sakta hoon. Kya aapke paas order number hai, ya aap tracking, return ya cancellation janna chahte hain?`,
        suggestedAction: "REQUEST_ORDER_ID",
        fieldNeeded: "order_id"
      };
    }

    // 1. Change Delivery Address / Phone Number
    if (
      text.includes("address") || text.includes("pata") || text.includes("location") ||
      text.includes("change phone") || text.includes("number change") || text.includes("update details")
    ) {
      return {
        hasDirectSolution: true,
        solution: `${name}You can usually update your delivery address or phone number before the package is out for delivery. If you share your order number, I can check if address edits are still available.`,
        hindiSolution: `${nameHi}Aap delivery se pehle apna pata ya phone number update kar sakte hain. Yadi aap order number batayein, to main dekh sakta hoon ki badlav sambhav hai ya nahi.`,
        suggestedAction: "UPDATE_PROFILE",
        fieldNeeded: "customer_phone"
      };
    }

    // 2. Order Cancellation
    if (
      text.includes("cancel") || text.includes("rok do") || text.includes("band kar") ||
      text.includes("cancellation") || text.includes("stop order")
    ) {
      return {
        hasDirectSolution: true,
        solution: `${name}Orders can usually be cancelled through your account before they ship. If the shipment is already on its way, you can also refuse it upon delivery. ${orderId ? `Would you like me to note a cancellation request for order ${orderId}?` : "Please share your order number if you'd like me to look into it."}`,
        hindiSolution: `${nameHi}Ship hone se pehle order ko account se cancel kiya ja sakta hai. Agar parcel nikal chuka hai, to aap delivery ke samay lene se inkaar bhi kar sakte hain. ${orderId ? `Kya main order ${orderId} ke liye cancellation request darj karoon?` : "Kripya apna order number batayein taaki main madad kar sakun."}`,
        suggestedAction: "PROCESS_CANCELLATION",
        fieldNeeded: entities.order_id ? undefined : "order_id"
      };
    }

    // 3. Returns, Replacements & Damaged Items
    if (
      text.includes("return") || text.includes("replacement") || text.includes("replace") ||
      text.includes("exchange") || text.includes("damage") || text.includes("broken") ||
      text.includes("wrong product") || text.includes("galat samaan") || text.includes("galat product") ||
      text.includes("galat item") || text.includes("toota") || text.includes("kharab") ||
      text.includes("vapas") || text.includes("wapas")
    ) {
      return {
        hasDirectSolution: true,
        solution: `${name}Usually, you can start a return through the seller's order page or contact their support team. If you have an order number or tell me which store you ordered from, I can guide you further.`,
        hindiSolution: `${nameHi}Aamtaur par aap seller ke order page se ya unki support team se return shuru kar sakte hain. Yadi aapke paas order number hai ya store ka naam batayein, to main aage margdarshan kar sakta hoon.`,
        suggestedAction: "INITIATE_RETURN",
        fieldNeeded: entities.order_id ? undefined : "order_id"
      };
    }

    // 4. Refund Timelines & Bank Deduction
    if (
      text.includes("refund") || text.includes("deducted") || text.includes("kat gaya") ||
      text.includes("money") || text.includes("paisa") || text.includes("charged twice") ||
      text.includes("double charge") || text.includes("payment fail") || text.includes("failed")
    ) {
      return {
        hasDirectSolution: true,
        solution: `${name}Refunds typically return to your original payment method within a few business days after a return is processed. If money was debited for a failed transaction, banks usually release the hold within 24 to 48 hours. If you have a reference number, please share it.`,
        hindiSolution: `${nameHi}Return process hone ke baad refund aamtaur par kuch business days me mool payment method me wapas aa jata hai. Yadi transaction fail hone par paise kate hain, to bank 24 se 48 ghante me auto-reverse kar deta hai.`,
        suggestedAction: "CHECK_PAYMENT",
        fieldNeeded: entities.order_id ? undefined : "order_id"
      };
    }

    // 5. Delivery Status & Courier Tracking
    if (
      text.includes("delivery") || text.includes("track") || text.includes("where is") ||
      text.includes("status") || text.includes("parcel") || text.includes("kab aayega") ||
      text.includes("kahan hai") || text.includes("delay") || text.includes("late") ||
      text.includes("shipment") || text.includes("courier")
    ) {
      if (entities.order_id) {
        return {
          hasDirectSolution: true,
          solution: `${name}I have located order ${orderId}. To check the exact shipping status and tracking link, please let me know which courier or store this order is with.`,
          hindiSolution: `${nameHi}Maine order ${orderId} check kar liya hai. Sahi tracking aur delivery status janne ke liye kripya store ya courier ka naam batayein.`,
          suggestedAction: "PROVIDE_TRACKING"
        };
      }
      return {
        hasDirectSolution: true,
        solution: `${name}If you have an order number or tracking ID, please share it so I can look up the shipment details for you.`,
        hindiSolution: `${nameHi}Yadi aapke paas order number ya tracking ID hai, to kripya sajha karein taaki main parcel ka status dekh sakun.`,
        suggestedAction: "REQUEST_ORDER_ID",
        fieldNeeded: "order_id"
      };
    }

    // 6. Working Hours & Support Availability
    const isSupportHoursQuery = Boolean(
      text.match(/(support hours|office hours|working hours|operating hours|calling hours|support timing|desk timing|helpdesk timing)/i) ||
      (text.includes("support") && (text.includes("available") || text.includes("timing") || text.includes("open"))) ||
      (text.includes("kab khulta") || text.includes("kab band") || text.includes("office time")) ||
      (text.includes("hours") && (text.includes("open") || text.includes("work") || text.includes("available")))
    );

    if (isSupportHoursQuery) {
      return {
        hasDirectSolution: true,
        solution: `${name}I'm available 24/7 to assist with your questions. If you need a human supervisor, our team is active during business hours, and I can connect you whenever needed.`,
        hindiSolution: `${nameHi}Main aapki sahayata ke liye 24 ghante uplabdh hoon. Agar aapko human supervisor se baat karni ho, to main zaroorat padne par unhe jod sakta hoon.`,
        suggestedAction: "INFO_HOURS"
      };
    }

    // 7. Human Supervisor Request
    if (
      text.includes("human") || text.includes("agent") || text.includes("executive") ||
      text.includes("supervisor") || text.includes("manager") || text.includes("insan") ||
      text.includes("baat karao") || text.includes("transfer")
    ) {
      return {
        hasDirectSolution: true,
        solution: `${name}I will connect you to a human supervisor right away, preserving all of our conversation context so you don't have to repeat anything.`,
        hindiSolution: `${nameHi}Main aapka call turant human supervisor ko transfer kar raha hoon, aur aapki saari jaankari unhe forward kar di gayi hai.`,
        suggestedAction: "ESCALATE_HUMAN"
      };
    }

    // 8. Warranty & Repairs
    if (
      text.includes("warranty") || text.includes("guarantee") || text.includes("service center") ||
      text.includes("repair") || text.includes("bill") || text.includes("invoice")
    ) {
      return {
        hasDirectSolution: true,
        solution: `${name}Warranty terms depend on the specific brand and product. Checking your receipt or the manufacturer's warranty page is usually the quickest way. If you have an order number, I can check what details we have on file.`,
        hindiSolution: `${nameHi}Warranty ki shartein product aur brand par nirbhar karti hain. Bill ya invoice check karna sabse aasan tareeka hai. Yadi aapke paas order number hai, to batayein.`,
        suggestedAction: "INFO_WARRANTY"
      };
    }

    // 9. Payment Methods
    if (
      text.includes("cod") || text.includes("cash on delivery") || text.includes("upi") ||
      text.includes("card") || text.includes("emi") || text.includes("net banking")
    ) {
      return {
        hasDirectSolution: true,
        solution: `${name}Most merchants accept UPI, credit/debit cards, and net banking. Cash on delivery availability depends on your specific delivery postal code and the seller.`,
        hindiSolution: `${nameHi}Zyadatar platforms par UPI, card aur net banking uplabdh hote hain. Cash on delivery aapke pin code aur seller par nirbhar karta hai.`,
        suggestedAction: "INFO_PAYMENT_METHODS"
      };
    }

    // Default friendly fallback
    return {
      hasDirectSolution: false,
      solution: `${name}I can help with parcel tracking, returns, cancellation questions, or connect you with a human supervisor. How can I assist you?`,
      hindiSolution: `${nameHi}Main parcel tracking, return, cancellation ya supervisor se connect karne me aapki madad kar sakta hoon. Aapko kis vishay par sahayata chahiye?`
    };
  }
}
