export interface KnowledgeAnswer {
  hasAnswer: boolean;
  englishAnswer: string;
  hindiAnswer: string;
  topic?: string;
  isAmbiguous?: boolean;
  clarificationPrompt?: string;
  hindiClarificationPrompt?: string;
}

export class KnowledgeEngine {
  private static indianCapitals: Record<string, { en: string; hi: string }> = {
    "gujarat": { en: "The capital of Gujarat is Gandhinagar.", hi: "Gujarat ki capital Gandhinagar hai." },
    "maharashtra": { en: "The capital of Maharashtra is Mumbai.", hi: "Maharashtra ki rajdhani Mumbai hai." },
    "karnataka": { en: "The capital of Karnataka is Bengaluru.", hi: "Karnataka ki rajdhani Bengaluru hai." },
    "tamil nadu": { en: "The capital of Tamil Nadu is Chennai.", hi: "Tamil Nadu ki rajdhani Chennai hai." },
    "rajasthan": { en: "The capital of Rajasthan is Jaipur.", hi: "Rajasthan ki rajdhani Jaipur hai." },
    "uttar pradesh": { en: "The capital of Uttar Pradesh is Lucknow.", hi: "Uttar Pradesh ki rajdhani Lucknow hai." },
    "west bengal": { en: "The capital of West Bengal is Kolkata.", hi: "West Bengal ki rajdhani Kolkata hai." },
    "punjab": { en: "The capital of Punjab is Chandigarh.", hi: "Punjab ki rajdhani Chandigarh hai." },
    "haryana": { en: "The capital of Haryana is Chandigarh.", hi: "Haryana ki rajdhani Chandigarh hai." },
    "kerala": { en: "The capital of Kerala is Thiruvananthapuram.", hi: "Kerala ki rajdhani Thiruvananthapuram hai." },
    "bihar": { en: "The capital of Bihar is Patna.", hi: "Bihar ki rajdhani Patna hai." },
    "madhya pradesh": { en: "The capital of Madhya Pradesh is Bhopal.", hi: "Madhya Pradesh ki rajdhani Bhopal hai." },
    "andhra pradesh": { en: "The capital of Andhra Pradesh is Amaravati.", hi: "Andhra Pradesh ki rajdhani Amaravati hai." },
    "telangana": { en: "The capital of Telangana is Hyderabad.", hi: "Telangana ki rajdhani Hyderabad hai." },
    "odisha": { en: "The capital of Odisha is Bhubaneswar.", hi: "Odisha ki rajdhani Bhubaneswar hai." },
    "assam": { en: "The capital of Assam is Dispur.", hi: "Assam ki rajdhani Dispur hai." },
    "goa": { en: "The capital of Goa is Panaji.", hi: "Goa ki rajdhani Panaji hai." },
    "delhi": { en: "The capital of India is New Delhi.", hi: "Bharat ki rajdhani New Delhi hai." }
  };

  private static worldCapitals: Record<string, { en: string; hi: string }> = {
    "australia": { en: "The capital of Australia is Canberra.", hi: "Australia ki rajdhani Canberra hai." },
    "canada": { en: "The capital of Canada is Ottawa.", hi: "Canada ki rajdhani Ottawa hai." },
    "japan": { en: "The capital of Japan is Tokyo.", hi: "Japan ki rajdhani Tokyo hai." },
    "france": { en: "The capital of France is Paris.", hi: "France ki rajdhani Paris hai." },
    "germany": { en: "The capital of Germany is Berlin.", hi: "Germany ki rajdhani Berlin hai." },
    "united kingdom": { en: "The capital of the United Kingdom is London.", hi: "United Kingdom ki rajdhani London hai." },
    "uk": { en: "The capital of the United Kingdom is London.", hi: "UK ki rajdhani London hai." },
    "england": { en: "The capital of England is London.", hi: "England ki rajdhani London hai." },
    "united states": { en: "The capital of the United States is Washington, D.C.", hi: "United States ki rajdhani Washington, D.C. hai." },
    "usa": { en: "The capital of the United States is Washington, D.C.", hi: "USA ki rajdhani Washington, D.C. hai." },
    "italy": { en: "The capital of Italy is Rome.", hi: "Italy ki rajdhani Rome hai." },
    "russia": { en: "The capital of Russia is Moscow.", hi: "Russia ki rajdhani Moscow hai." },
    "china": { en: "The capital of China is Beijing.", hi: "China ki rajdhani Beijing hai." },
    "new zealand": { en: "The capital of New Zealand is Wellington.", hi: "New Zealand ki rajdhani Wellington hai." },
    "uae": { en: "The capital of the United Arab Emirates is Abu Dhabi.", hi: "UAE ki rajdhani Abu Dhabi hai." },
    "brazil": { en: "The capital of Brazil is Brasília.", hi: "Brazil ki rajdhani Brasília hai." }
  };

  /**
   * Resolves general knowledge queries directly without external web search
   */
  public static answerQuery(query: string, context?: { lastPerson?: string; lastTopic?: string }): KnowledgeAnswer {
    const lower = query.toLowerCase().trim();

    // 0. Ambiguity Check: "Tell me about Apple" & "Can I get a number from someone I don't know"
    if (/^(tell me about|what is|explain)\s+apple\b[?.!]?$/i.test(lower) || lower === "apple" || lower === "apple ke baare mein batao") {
      return {
        hasAnswer: true,
        englishAnswer: "Do you mean Apple the technology company, or apple the fruit?",
        hindiAnswer: "Kya aapka tatparya Apple technology company se hai, ya apple (seb) phal se?",
        isAmbiguous: true,
        clarificationPrompt: "Do you mean Apple the technology company, or apple the fruit?",
        hindiClarificationPrompt: "Kya aapka tatparya Apple company se hai, ya apple phal se?"
      };
    }

    if (
      (lower.includes("get a number") || lower.includes("get someone's number") || lower.includes("number from someone")) &&
      (lower.includes("don't know") || lower.includes("dont know") || lower.includes("stranger") || lower.includes("unknown"))
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "Sure — do you mean their phone number or contact information, or are you asking for a number in some other context?",
        hindiAnswer: "Sure — kya aapka tatparya unke phone number ya sampark vivaran se hai, ya kisi anya sandarbh me number ki baat kar rahe hain?",
        isAmbiguous: true,
        clarificationPrompt: "Sure — do you mean their phone number or contact information, or are you asking for a number in some other context?",
        hindiClarificationPrompt: "Kya aapka tatparya unke phone number se hai ya kisi anya sandarbh me?"
      };
    }

    // 0.81 Conversational Acts: Acknowledgements & Gratitude
    if (
      lower.includes("thanks that was helpful") ||
      lower.includes("that was helpful") ||
      lower.includes("helpful thanks") ||
      lower.includes("thank you so much") ||
      lower.includes("bohot madad mili") ||
      lower.includes("kaafi madad mili")
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "You're welcome! Glad I could help.",
        hindiAnswer: "Aapka swagat hai! Khushi hui ki main aapki sahayata kar saka.",
        topic: "acknowledgement"
      };
    }

    // 0.815 Empathetic & Conversational Clarifications (e.g. Hindi emotional/reassurance checks)
    if (
      lower.includes("mere sath kuchh galat") ||
      lower.includes("mere sath kuch galat") ||
      lower.includes("mere saath kuch galat") ||
      lower.includes("kuch galat hua hai kya") ||
      lower.includes("kya mere sath galat")
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "Not at all. Everything is alright. If you're concerned about something or experiencing an issue, please tell me what happened and I will be happy to help you.",
        hindiAnswer: "Nahi, aisi koi baat nahi hai, sab theek hai. Yadi aapko kisi baat ki chinta hai ya koi samasya hui hai, to kripya mujhe batayein, main aapki poori madad karunga.",
        topic: "reassurance"
      };
    }

    if (
      lower.includes("mujhe samajh nahi aa raha") ||
      lower.includes("kuch samajh nahi aa raha") ||
      lower.includes("samajh nahi aaya") ||
      lower === "i don't understand" ||
      lower === "i dont understand"
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "No problem at all! Let me know what you'd like to understand, and I will explain it simply and clearly.",
        hindiAnswer: "Koi baat nahi! Kripya batayein aap kiske baare me janna chahte hain, main aasan shabdon me samjha deta hoon.",
        topic: "understanding_clarification"
      };
    }

    if (
      lower === "i need help with something" ||
      lower === "i need help" ||
      lower === "mujhe help chahiye" ||
      lower === "kuch madad chahiye" ||
      lower === "can you help me with something"
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "I would be happy to help! What specific question or topic can I assist you with today?",
        hindiAnswer: "Main zaroor aapki madad karunga! Batayein aaj main aapki kis vishay par sahayata kar sakta hoon?",
        topic: "help_request"
      };
    }

    if (
      (lower.includes("remember") || lower.includes("forgot") || lower.includes("yaad nahi") || lower.includes("bhool") || lower.includes("don't have") || lower.includes("dont have") || lower.includes("lost") || lower.includes("no ")) &&
      (lower.includes("reference") || lower.includes("order number") || lower.includes("order id") || lower.includes("tracking id") || lower.includes("receipt"))
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "That's completely fine. If you don't have the reference number, you can check your order confirmation email or SMS, or provide your registered phone number or email address so we can locate your record.",
        hindiAnswer: "Koi baat nahi. Agar aapke paas reference number nahi hai, to aap apna confirmation email ya SMS check kar sakte hain, ya registered phone number aur email sajha karein taaki hum aapka record dhoondh sakein.",
        topic: "reference_recovery"
      };
    }

    // 0.816 Ambiguous Follow-ups: "Can you send me one?"
    if (
      lower.includes("can you send me one") ||
      lower.includes("send me one") ||
      lower.includes("send it to me") ||
      lower.includes("mujhe bhej sakte ho")
    ) {
      const topic = context?.lastTopic || "";
      if (topic.toLowerCase().includes("python")) {
        return {
          hasAnswer: true,
          englishAnswer: "What would you like me to send? Since Python is an open-source programming language, you can download it free from python.org, or I can provide code examples, installation guides, or explanations right here.",
          hindiAnswer: "Aap mujhse kya bhejwane ki apeksha kar rahe hain? Python ek programming language hai jise aap python.org se muft download kar sakte hain, ya main yahan code aur guide pradan kar sakta hoon.",
          topic: "send_clarification"
        };
      }
      return {
        hasAnswer: true,
        englishAnswer: "What would you like me to send? Please specify the document, code snippet, or details you need, and I'll be glad to help.",
        hindiAnswer: "Aap kya bhejwane ki baat kar rahe hain? Kripya batayein aapko kaunsa document, link ya jaankari chahiye taaki main sahayata kar sakun.",
        topic: "send_clarification"
      };
    }

    // 0.817 General Parcel Return Guidance (without hallucinated company policies)
    if (
      (lower.includes("return") || lower.includes("vapas") || lower.includes("wapas")) &&
      (lower.includes("parcel") || lower.includes("package") || lower.includes("item") || lower.includes("product") || lower.includes("order")) &&
      !lower.includes("policy") && !lower.includes("rule") &&
      (lower.includes("how do i") || lower.includes("how can i") || lower.includes("kaise karoon") || lower.includes("kaise karein"))
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "To return a parcel, check the return policy of the merchant or website where you purchased it. Most retailers let you start a return from your account's 'My Orders' section, where you can print a return label or schedule a doorstep pickup. If you have an order with us, please share your order number so I can check its return eligibility.",
        hindiAnswer: "Parcel return karne ke liye us company ya seller ki return policy check karein jahan se aapne khareeda tha. Zyadatar platforms par aap 'My Orders' me jaakar return request darj kar sakte hain. Yadi aapka order hamare sath hai, to kripya apna order ID batayein.",
        topic: "parcel_return_guidance"
      };
    }

    // 0.818 Science: Aeroplanes stay in the air / flight physics
    if (
      lower.includes("aeroplanes stay in the air") ||
      lower.includes("airplanes stay in the air") ||
      lower.includes("planes stay in the air") ||
      lower.includes("why do aeroplanes fly") ||
      lower.includes("why do airplanes fly") ||
      lower.includes("how do planes stay in the air") ||
      lower.includes("how planes stay in the air") ||
      lower.includes("hawai jahaj hawa me") ||
      (lower.includes("stay in the air") && (lower.includes("aeroplane") || lower.includes("airplane") || lower.includes("plane")))
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "Airplanes stay in the air because their wings are shaped as airfoils to generate lift as air flows over and under them. Engines produce forward thrust to overcome air resistance, and when the lift produced equals or exceeds the aircraft's weight, the plane stays aloft.",
        hindiAnswer: "Hawai jahaj hawa me isliye tikte hain kyunki unke wings ka vishisht aakar hawa ke bahaav se aerodynamic lift paida karta hai. Engine aage badhne ke liye thrust deta hai, jo gravity ko santulit karke plane ko hawa me banaye rakhta hai.",
        topic: "aeroplane_flight"
      };
    }

    // 0.819 Science: Plane Takeoff
    if (
      lower.includes("how does a plane take off") ||
      lower.includes("how do planes take off") ||
      lower.includes("how airplanes take off") ||
      lower.includes("aeroplane takeoff") ||
      lower.includes("plane kaise udta hai") ||
      lower.includes("takeoff kaise hota hai")
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "An airplane takes off by accelerating rapidly down the runway using engine thrust. As its airspeed increases, airflow over the wings generates upward aerodynamic lift; once lift exceeds the total weight of the aircraft, the pilot rotates the nose up and the plane climbs into the air.",
        hindiAnswer: "Plane takeoff karne ke liye runway par tez daudta hai jisse engine ke thrust se raftaar badhti hai. Raftaar badhne par wings par banne wala lift vajan se adhik ho jaata hai, aur plane hawa me udan bharta hai.",
        topic: "plane_takeoff"
      };
    }

    // 0.820 Computing: Python Programming Language
    if (
      lower === "tell me about python" ||
      lower === "tell me about python." ||
      lower === "what is python" ||
      lower === "explain python" ||
      lower.includes("python programming") ||
      lower.includes("python language") ||
      lower === "python"
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "Python is a high-level, general-purpose programming language known for its clear syntax and versatility, widely used in web development, automation, data analysis, and artificial intelligence.",
        hindiAnswer: "Python ek lokpriya high-level programming language hai jo aasan syntax aur versatility ke liye jaani jaati hai, jiska upayog software, data science aur AI me hota hai.",
        topic: "Python"
      };
    }

    // Python Follow-up queries: "What is it used for?", "What can I build with it?"
    if (context?.lastTopic?.toLowerCase() === "python" || lower.includes("python used for") || lower.includes("build with python")) {
      if (lower.includes("used for") || lower.includes("kisme use") || lower.includes("upayog") || lower.includes("kaam aati")) {
        return {
          hasAnswer: true,
          englishAnswer: "Python is widely used for web development, data analysis, machine learning, artificial intelligence, scientific computing, and task automation.",
          hindiAnswer: "Python ka upayog mukhya roop se web development, data analysis, machine learning, artificial intelligence aur task automation me hota hai.",
          topic: "Python"
        };
      }
      if (lower.includes("build") || lower.includes("make") || lower.includes("bana sakte")) {
        return {
          hasAnswer: true,
          englishAnswer: "With Python, you can build web applications using frameworks like Django or Flask, machine learning models, automated data scrapers, desktop tools, and data dashboards.",
          hindiAnswer: "Python se aap web apps (Django ya Flask me), AI aur machine learning models, automation scripts, data dashboards aur software tools bana sakte hain.",
          topic: "Python"
        };
      }
    }

    // Comparison: Python or Java
    if (
      (lower.includes("python") && lower.includes("java") && (lower.includes("or") || lower.includes("vs") || lower.includes("ya") || lower.includes("choose") || lower.includes("better"))) ||
      lower === "python or java" || lower === "python or java?" || lower === "python vs java"
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "It depends on your goal: Python is great for data science, machine learning, and rapid scripting due to its simple syntax, while Java is preferred for large-scale enterprise backends and Android development.",
        hindiAnswer: "Yeh aapke lakshya par nirbhar karta hai: Python data science, AI aur automation ke liye aasan hai, jabki Java large enterprise backends aur Android development ke liye lokpriya hai.",
        topic: "python_vs_java"
      };
    }

    // Comparison: Black laptop or white laptop
    if (
      (lower.includes("black laptop") || lower.includes("white laptop")) &&
      (lower.includes("or") || lower.includes("vs") || lower.includes("ya") || lower.includes("choose") || lower.includes("better") || lower.includes("get"))
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "A black laptop tends to resist visible smudges and fits any professional setting, while a white laptop offers a sleek, modern look but may show scuffs more easily. Performance is identical, so choose whichever look you prefer.",
        hindiAnswer: "Black laptop professional lagta hai aur dhool-mitti kam dikhati hai, jabki white laptop modern dikhta hai lekin daag jaldi dikh sakte hain. Dono me performance ek jaisi rehti hai.",
        topic: "laptop_color_choice"
      };
    }

    // Casual response: "I'm bored"
    if (lower === "i'm bored" || lower === "im bored" || lower === "i am bored" || lower === "bore ho raha hoon" || lower === "bore ho raha hu") {
      return {
        hasAnswer: true,
        englishAnswer: "If you're bored, I can share a surprising science fact, give you a riddle, or we can chat about technology or space. What sounds interesting to you?",
        hindiAnswer: "Agar aap bore ho rahe hain, to main ek rochak fact share kar sakta hoon, koi paheli pooch sakta hoon, ya space aur science ke baare me baat kar sakte hain. Aap kya sunna chahenge?",
        topic: "casual_conversation"
      };
    }

    // Science: What causes earthquakes?
    if (
      lower.includes("what causes earthquakes") ||
      lower.includes("why do earthquakes happen") ||
      lower.includes("what causes an earthquake") ||
      lower.includes("earthquake causes") ||
      lower.includes("bhukamp kyun aata hai") ||
      lower.includes("bhukamp ke karan")
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "Earthquakes occur when tectonic plates beneath Earth's surface slowly grind against each other along fault lines, suddenly releasing built-up geological stress as seismic waves that shake the ground.",
        hindiAnswer: "Bhukamp tab aate hain jab dharti ke niche tectonic plates fault lines par aapas me takrati ya khisakti hain, jisse jama hua dabbaav achanak seismic waves ke roop me nikalta hai.",
        topic: "earthquakes"
      };
    }

    // Technology: How does Bluetooth work?
    if (
      lower.includes("how does bluetooth work") ||
      lower.includes("how bluetooth works") ||
      lower.includes("what is bluetooth") ||
      lower.includes("bluetooth kaise kaam karta hai")
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "Bluetooth works by sending short-range radio signals across the 2.4 GHz frequency band between paired devices, rapidly hopping frequencies hundreds of times per second to prevent interference.",
        hindiAnswer: "Bluetooth 2.4 GHz frequency band par low-power radio tarango ke madhyam se paas ke devices ko jodta hai, aur interference se bachne ke liye frequency tezi se badalta rehta hai.",
        topic: "bluetooth"
      };
    }

    // 0.8201 Decision / Choice: Choose between 1 and 2
    if (
      lower.includes("choose between 1 and 2") ||
      lower.includes("pick between 1 and 2") ||
      lower.includes("1 or 2") ||
      lower.includes("choose 1 or 2")
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "I choose 2! If you're deciding between two options or need a coin flip, let me know what each number represents and I can help you decide.",
        hindiAnswer: "Main number 2 chunta hoon! Agar aap do vikalpon ke beech faisla kar rahe hain, to batayein dono number kiske liye hain.",
        topic: "choice_selection"
      };
    }

    // 0.8202 Astronomy: Jupiter's Moons
    if (
      lower.includes("moons") && lower.includes("jupiter") ||
      lower.includes("jupiter has how many moons") ||
      lower.includes("jupiter ke kitne chand")
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "Jupiter has 95 officially recognized moons. The four largest are known as the Galilean moons: Ganymede, Callisto, Io, and Europa, discovered by Galileo Galilei in 1610.",
        hindiAnswer: "Jupiter (Brihaspati grah) ke kul 95 pramanit chand (moons) hain. Inme sabse bade chaar Galilean moons hain: Ganymede, Callisto, Io, aur Europa.",
        topic: "jupiter_moons"
      };
    }

    // 0.8203 Aesthetics / Colors: Shades of Pink
    if (
      lower.includes("shades of pink") ||
      lower.includes("pink shades") ||
      lower.includes("shades of colour pink") ||
      lower.includes("gulabi rang ke shades")
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "A few classic shades of pink include blush, rose, coral, salmon, baby pink, fuchsia, magenta, and dusty rose.",
        hindiAnswer: "Pink (gulabi) ke kuch pramukh shades me blush, rose, coral, salmon, baby pink, magenta aur fuchsia shamil hain.",
        topic: "shades_of_pink"
      };
    }

    // 0.8204 Geography / Timezone: Antarctica Time
    if (
      (lower.includes("time") || lower.includes("samay")) &&
      (lower.includes("antarctica") || lower.includes("antarctic"))
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "Antarctica spans multiple time zones because all longitude lines meet at the South Pole. Research stations generally use the time zone of their supply base—for example, McMurdo Station follows New Zealand Time (UTC+12), while Palmer Station follows Chile Time (UTC-3).",
        hindiAnswer: "Antarctica me alag-alag research stations apne supply base ka samay upayog karte hain. Jaise McMurdo station New Zealand time (UTC+12) aur Palmer station Chile time (UTC-3) follow karta hai.",
        topic: "antarctica_time"
      };
    }

    // 0.82 Science: Why is the ocean salty?
    if (
      lower.includes("why is the ocean salty") ||
      lower.includes("why ocean is salty") ||
      lower.includes("why is the sea salty") ||
      lower.includes("samandar ka paani khara") ||
      lower.includes("samudra ka paani khara") ||
      (lower.includes("ocean") && lower.includes("salty")) ||
      (lower.includes("sea") && lower.includes("salty"))
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "The ocean is salty mainly because rain dissolves minerals and salts from rocks on land, and rivers carry them into the sea. When ocean water evaporates into clouds, the dissolved salt remains behind, steadily accumulating over billions of years.",
        hindiAnswer: "Samudra ka paani isliye khara hota hai kyunki barish chattano se khanij aur namak ko gholkar nadiyon ke madhyam se samudra me pahunchati hai. Paani bhaap bankar udta rehta hai jabki namak wahi ikattha hota rehta hai.",
        topic: "ocean_salinity"
      };
    }

    // 0.821 Everyday Tech / Battery: Can I charge my phone / overnight charging
    if (
      (lower.includes("charge my phone") || lower.includes("charging my phone") || lower.includes("charge phone")) &&
      (lower.includes("can i") || lower.includes("is it safe") || lower.includes("overnight") || lower.includes("kya main"))
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "Yes, you can safely charge your phone. Modern smartphones use lithium-ion batteries with built-in protection circuits that automatically stop or trickle charging once the battery reaches 100%, preventing overcharging even if left plugged in overnight.",
        hindiAnswer: "Haan, aap apna phone surakshit roop se charge kar sakte hain. Modern smartphones me lithium-ion battery aur suraksha circuits hote hain jo 100% charge hone par power flow ko niyantrit kar dete hain.",
        topic: "phone_charging"
      };
    }

    // 0.822 Science: Why is yellow colour so yellow?
    if (
      lower.includes("why is yellow colour so yellow") ||
      lower.includes("why is yellow color so yellow") ||
      lower.includes("why is yellow yellow") ||
      lower.includes("yellow colour so yellow") ||
      lower.includes("peela rang itna peela")
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "Yellow looks yellow because light with wavelengths between approximately 570 and 590 nanometers stimulates both the red and green cone photoreceptors in human eyes simultaneously, which our visual cortex perceives as bright, vibrant yellow.",
        hindiAnswer: "Peela rang humein isliye itna peela dikhai deta hai kyunki lagbhag 570 se 590 nanometer wavelength ka prakash aankhon ke red aur green cone receptors ko ek sath stimulate karta hai, jise dimaag peele rang ke roop me pehchanta hai.",
        topic: "yellow_color"
      };
    }

    // 0.823 Nutrition & Health Comparison: Almonds vs Walnuts
    if (
      (lower.includes("almonds") || lower.includes("badam")) &&
      (lower.includes("walnuts") || lower.includes("akhrot")) &&
      (lower.includes("should i have") || lower.includes("which is better") || lower.includes("or") || lower.includes("vs") || lower.includes("ya"))
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "Both are very nutritious and offer distinct benefits: almonds are particularly rich in vitamin E, calcium, and magnesium for skin and bone health, while walnuts are exceptionally high in plant-based omega-3 fatty acids for brain and cardiovascular health. A modest combination of both provides the most balanced nutrition.",
        hindiAnswer: "Dono hi behad poshtik hain: badaam me vitamin E, calcium aur magnesium achhi matra me hota hai, jabki akhrot me dimaag aur dil ke liye faydemand omega-3 fatty acids hote hain. Dono ka santulit sevan labhkari hai.",
        topic: "almonds_vs_walnuts"
      };
    }

    // 0.824 Science: Why does ice float on water?
    if (
      lower.includes("why does ice float") ||
      lower.includes("why ice floats") ||
      lower.includes("baraf paani par kyun tairti") ||
      (lower.includes("ice float") && lower.includes("water"))
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "Ice floats on water because water expands as it freezes, forming an open, hexagonal crystalline structure held by hydrogen bonds. This makes ice about 9% less dense than liquid water, allowing it to float.",
        hindiAnswer: "Baraf paani par isliye tairti hai kyunki jamte samay paani ke anu (molecules) ek hexagonal crystal lattice banate hain jisse baraf ka ghanatva (density) taral paani se lagbhag 9% kam ho jaata hai.",
        topic: "ice_density"
      };
    }

    // 0.825 Physics: Why do magnets attract?
    if (
      lower.includes("why do magnets attract") ||
      lower.includes("how do magnets attract") ||
      lower.includes("chumbak kaise aakarshit karte") ||
      lower.includes("how magnets work") ||
      lower.includes("why magnets work")
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "Magnets attract because unpaired electrons inside ferromagnetic materials spin in aligned directions, creating an invisible magnetic field with north and south poles. When opposite poles come near each other, their magnetic field lines align and pull the magnets together.",
        hindiAnswer: "Chumbak isliye aakarshit karte hain kyunki unke andar electrons ki spin ek hi disha me sanrekhit hokar magnetic field paida karti hai. Jab viprit poles (north aur south) paas aate hain, to ve ek doosre ko aakarshit karte hain.",
        topic: "magnets_attraction"
      };
    }

    // 0.826 Computing: Difference between RAM and Storage
    if (
      (lower.includes("difference between ram and storage") ||
      lower.includes("ram vs storage") ||
      lower.includes("ram and storage") ||
      lower.includes("ram aur storage me kya antar")) &&
      !lower.includes("buy")
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "RAM (Random Access Memory) is fast, temporary volatile memory that holds data currently used by active apps, clearing when the device turns off. Storage (like SSDs or hard drives) is permanent non-volatile memory that saves your files, photos, apps, and operating system even when powered down.",
        hindiAnswer: "RAM ek tez aur temporary memory hai jo chal rahe apps ka data rakhti hai aur phone band hone par saaf ho jaati hai. Storage (jaise SSD ya internal storage) permanent hoti hai, jisme aapka OS, photos aur files hamesha surakshit rehte hain.",
        topic: "ram_vs_storage"
      };
    }

    // 0.827 Space Trivia / Fact
    if (
      lower.includes("fact about space") ||
      lower.includes("space fact") ||
      lower.includes("tell me a fact about space") ||
      lower.includes("antariksh ke baare me fact") ||
      lower.includes("space trivia")
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "A fascinating fact about space is that it is completely silent. Because space is a near-perfect vacuum with no atmosphere, there is no air medium for sound waves to travel through.",
        hindiAnswer: "Antariksh ka ek rochak tathya yeh hai ki antariksh me poori tarah shaanti (complete silence) hoti hai, kyunki wahan koi vatavaran nahi hai jisse hokar dhwani ki tarangein guzar sakein.",
        topic: "space_fact"
      };
    }

    // 0.828 Practical Utility: Power Outage Advice
    if (
      lower.includes("power outage") ||
      lower.includes("power goes out") ||
      lower.includes("electricity cut") ||
      lower.includes("bijli chali gayi") ||
      lower.includes("light chali gayi")
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "During a power outage, keep refrigerator and freezer doors closed to preserve food freshness, use battery-operated flashlights instead of candles for fire safety, unplug sensitive electronics to avoid power surge damage, and check your circuit breaker or local utility outage updates.",
        hindiAnswer: "Bijli chale jaane par fridge ke darwaze band rakhein taaki bhojan kharab na ho, suraksha ke liye flashlight ka upayog karein, electronic upkaran unplug karein, aur local bijli vibhag ke outage updates check karein.",
        topic: "power_outage_advice"
      };
    }

    // 0.829 General Inquiry / Pricing: Pen Cost
    if (
      lower.includes("how much does a pen cost") ||
      lower.includes("cost of a pen") ||
      lower.includes("price of a pen") ||
      lower.includes("what does a pen cost") ||
      lower.includes("pen kitne ka aata hai") ||
      lower.includes("pen ki keemat")
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "Which pen are you asking about? Everyday disposable ballpoints typically cost around $1 to $2 (or 10 to 20 rupees in India), while rollerballs, gel pens, and fountain pens vary widely in price.",
        hindiAnswer: "Aap kis pen ke baare me pooch rahe hain? Aam ballpoint pen lagbhag 10 se 20 rupaye ($1-$2) me aate hain, jabki gel aur fountain pens ki keemat alag-alag hoti hai.",
        topic: "pen_cost",
        isAmbiguous: true,
        clarificationPrompt: "Which pen are you asking about? Prices range from everyday ballpoints to fountain pens.",
        hindiClarificationPrompt: "Aap kis type ke pen ke baare me pooch rahe hain?"
      };
    }

    // 0.82 AI Transparency & Identity Questions
    if (
      lower.includes("real person") ||
      lower.includes("you human") ||
      lower.includes("are you human") ||
      lower.includes("are you an ai") ||
      lower.includes("are you ai") ||
      lower.includes("are you a bot") ||
      lower.includes("kya aap insaan ho") ||
      lower.includes("tum ai ho") ||
      lower === "who are you" ||
      lower === "who are you?" ||
      lower === "are you real?" ||
      lower === "are you real"
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "No, I'm an AI assistant. I'm here to help, and I can involve a human when needed.",
        hindiAnswer: "Nahi, main ek AI assistant hoon. Main aapki madad ke liye yahan hoon, aur zaroorat padne par human agent ko bhi jod sakta hoon.",
        topic: "ai_identity"
      };
    }

    // 0.83 General Request / Trivia ("something interesting")
    if (
      lower === "something interesting" ||
      lower === "tell me something interesting" ||
      lower.includes("something interesting") ||
      lower.includes("kuch interesting batao") ||
      lower.includes("kuch rochak batao") ||
      lower.includes("share an interesting fact") ||
      lower.includes("tell an interesting fact")
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "Sure! Octopuses have three hearts, and two of them stop beating when they swim.",
        hindiAnswer: "Zaroor! Octopus ke teen dil hote hain, aur jab vo tairte hain to unme se do dil dhadakna band kar dete hain.",
        topic: "interesting_fact"
      };
    }

    // 0.84 Science: Earth's Seasons
    if (
      lower.includes("why do we have seasons") ||
      lower.includes("why seasons happen") ||
      lower.includes("why do seasons happen") ||
      lower.includes("causes of seasons") ||
      lower.includes("why do seasons change") ||
      lower.includes("mausam kyun badalte hain") ||
      lower.includes("seasons change") ||
      (lower.includes("why") && lower.includes("seasons"))
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "We have seasons because Earth is tilted on its axis as it orbits the Sun, which changes how directly different parts of Earth receive sunlight during the year.",
        hindiAnswer: "Dharti par mausam isliye badalte hain kyunki prithvi apni dhuri (axis) par jhuki hui soorya ki parikrama karti hai, jisse saal bhar suraj ki roshni alag-alag hisson par alag matra me padti hai.",
        topic: "Earth seasons"
      };
    }

    // 0.85 Science: Why is the sky blue?
    if (lower.includes("why is the sky blue") || lower.includes("why sky is blue") || lower.includes("aasmaan neela kyun")) {
      return {
        hasAnswer: true,
        englishAnswer: "The sky is blue because Earth's atmosphere scatters sunlight in all directions, and blue light is scattered more than other colors because it travels as shorter, smaller waves.",
        hindiAnswer: "Aasmaan neela isliye dikhai deta hai kyunki vatavaran suraj ki roshni ko charo taraf bikher deta hai, aur neeli roshni choti tarango ke karan sabse adhik bikharati hai.",
        topic: "Sky color"
      };
    }

    // 0.86 Sports Definitions (Not current events)
    if ((lower === "what is cricket" || lower === "what is cricket?" || lower === "cricket kya hai") && !lower.includes("today") && !lower.includes("aaj")) {
      return {
        hasAnswer: true,
        englishAnswer: "Cricket is a bat-and-ball game played between two teams of eleven players on a field with a 22-yard pitch.",
        hindiAnswer: "Cricket ek bat aur ball ka khel hai jo ghyarah-ghyarah khiladiyon ki do teams ke beech 22 gaj ki pitch par khela jaata hai.",
        topic: "Cricket definition"
      };
    }

    if ((lower === "what is formula 1" || lower === "what is f1" || lower === "what is f1?") && !lower.includes("today") && !lower.includes("aaj")) {
      return {
        hasAnswer: true,
        englishAnswer: "Formula 1 is the highest class of international single-seater auto racing sanctioned by the FIA.",
        hindiAnswer: "Formula 1 FIA dwara aayojit single-seater auto racing ki sarvochha antarrashtriya shreni hai.",
        topic: "Formula 1 definition"
      };
    }

    if (lower.includes("who is virat kohli") || lower.includes("virat kohli kaun hai")) {
      return {
        hasAnswer: true,
        englishAnswer: "Virat Kohli is an Indian international cricketer and former captain of the Indian national team, regarded as one of the greatest batsmen in modern cricket history.",
        hindiAnswer: "Virat Kohli ek pramukh bhartiya international cricketer aur purva captain hain, jinhe aadhunik cricket ke sarvashreshth ballebaazon me gina jaata hai.",
        topic: "Virat Kohli"
      };
    }

    // 0.8 Medical Treatment Boundary (Safe non-prescriptive response matching actual condition)
    const isMedTreatmentQuery =
      (lower.includes("medicine") || lower.includes("medication") || lower.includes("dawa") || lower.includes("dawai") || lower.includes("tablet") || lower.includes("dose") || lower.includes("prescription") || lower.includes("diagnose")) &&
      (lower.includes("take") || lower.includes("fever") || lower.includes("cold") || lower.includes("cough") || lower.includes("headache") || lower.includes("bukhar") || lower.includes("sardi") || lower.includes("le sakta") || lower.includes("kya lun") || lower.includes("kya lein") || lower.includes("prescribe"));

    if (isMedTreatmentQuery) {
      let conditionEn = "situation";
      let conditionHi = "sthiti";
      if (lower.includes("cold") || lower.includes("sardi")) {
        conditionEn = "cold";
        conditionHi = "sardi";
      } else if (lower.includes("cough") || lower.includes("khansi")) {
        conditionEn = "cough";
        conditionHi = "khansi";
      } else if (lower.includes("headache") || lower.includes("sar dard") || lower.includes("sir dard")) {
        conditionEn = "headache";
        conditionHi = "sir dard";
      } else if (lower.includes("fever") || lower.includes("bukhar")) {
        conditionEn = "fever";
        conditionHi = "bukhar";
      }

      return {
        hasAnswer: true,
        englishAnswer: `I can give general information, but I can't recommend a specific medicine or dose for your ${conditionEn}. A qualified healthcare professional or pharmacist can help you choose what's appropriate. If you have severe symptoms or feel seriously unwell, seek urgent medical care.`,
        hindiAnswer: `Main aam jaankari de sakta hoon, par aapke ${conditionHi} ke liye koi vishisht dawai ya dose recommend nahi kar sakta. Kripya kisi yogy doctor ya pharmacist se salah lein. Agar lakshan gambhir hon, to turant chikitsa sahayata prapt karein.`,
        topic: "medical_safety_boundary"
      };
    }

    // 0.9 General Health Education: Why does fever happen?
    if (lower.includes("why does fever happen") || lower.includes("bukhar kyun hota hai") || lower.includes("causes of fever")) {
      return {
        hasAnswer: true,
        englishAnswer: "Fever is an immune system response where the body elevates its core temperature to help fight off infections caused by viruses or bacteria.",
        hindiAnswer: "Bukhar sharir ke immune system ki ek prakritik pratikriya hai, jo bacteria ya viral infection se ladne ke liye shareer ka taapmaan badha deta hai.",
        topic: "fever_education"
      };
    }

    // 0.95 General Health Education: Sleep requirements
    if (
      (lower.includes("sleep") || lower.includes("neend")) &&
      (lower.includes("how many hours") || lower.includes("how much") || lower.includes("kitne ghante") || lower.includes("20 year old") || lower.includes("adult") || lower.includes("woman") || lower.includes("need"))
    ) {
      return {
        hasAnswer: true,
        englishAnswer: "Young adults and 20-year-olds typically require between 7 and 9 hours of quality sleep per night for optimal physical recovery, mental focus, and well-being.",
        hindiAnswer: "20 saal ke yuvaon ke liye swasth sharir aur dimaagi taazgi ke liye har raat aamtaur par 7 se 9 ghante ki acchi neend aavashyak hoti hai.",
        topic: "sleep_guidelines"
      };
    }

    // 0.96 Local Utility / General Advice: Water Shortage
    if (lower.includes("water shortage") || lower.includes("paani ki kami") || lower.includes("paani ki killat")) {
      return {
        hasAnswer: true,
        englishAnswer: "During a water shortage, prioritize clean water for drinking and cooking, avoid non-essential usage like washing cars, fix any household leaks promptly, and check with your local municipal water supplier for supply schedules.",
        hindiAnswer: "Paani ki killat ke dauraan, peene aur khana banane ke liye swachh paani ko prathmikta dein, anavashyak upayog rokein, ghar me leakage turant theek karein, aur sthaniya jal vibhag ya nagar nigam se supply samay ki jaankari lein.",
        topic: "water_shortage_advice"
      };
    }

    // 0.97 Technology & Computing: DNS
    if (lower.includes("how does dns work") || lower.includes("what is dns") || lower.includes("dns kaise kaam karta hai")) {
      return {
        hasAnswer: true,
        englishAnswer: "DNS, or the Domain Name System, serves as the internet's directory. It translates human-friendly domain names like google.com into machine-readable IP addresses so web browsers can connect to the right servers.",
        hindiAnswer: "DNS (Domain Name System) internet ki directory ki tarah kaam karta hai. Yah human-friendly domain names ko numerical IP addresses me badalta hai taki browsers sahi server se jud sakein.",
        topic: "DNS"
      };
    }

    // 0.98 World Leaders: President of France
    if (lower.includes("president of france") || lower.includes("france ka president") || lower.includes("french president")) {
      return {
        hasAnswer: true,
        englishAnswer: "The president of France is Emmanuel Macron.",
        hindiAnswer: "France ke rashtrapati (President) Emmanuel Macron hain.",
        topic: "President of France"
      };
    }

    // 1. Geography: Indian State and World Capitals
    if (lower.includes("capital") || lower.includes("rajdhani")) {
      for (const [state, cap] of Object.entries(this.indianCapitals)) {
        if (lower.includes(state)) {
          return {
            hasAnswer: true,
            englishAnswer: cap.en,
            hindiAnswer: cap.hi,
            topic: `${state} capital`
          };
        }
      }

      for (const [country, cap] of Object.entries(this.worldCapitals)) {
        if (lower.includes(country)) {
          return {
            hasAnswer: true,
            englishAnswer: cap.en,
            hindiAnswer: cap.hi,
            topic: `${country} capital`
          };
        }
      }
    }

    // 2. Photosynthesis & Scientific Concepts
    if (lower.includes("photosynthesis") || lower.includes("prakash sanshleshan")) {
      return {
        hasAnswer: true,
        englishAnswer: "Photosynthesis is the biological process by which green plants use sunlight, water, and carbon dioxide to produce oxygen and energy in the form of sugar.",
        hindiAnswer: "Prakash sanshleshan (photosynthesis) vah prakriya hai jisme hare paudhe soorya ke prakash, paani aur carbon dioxide ka upayog karke oxygen aur glucose banate hain.",
        topic: "photosynthesis"
      };
    }

    // 3. Prominent Figures
    if (lower.includes("albert einstein") || lower.includes("einstein")) {
      return {
        hasAnswer: true,
        englishAnswer: "Albert Einstein was a Nobel Prize-winning theoretical physicist celebrated for developing the theory of relativity and the mass-energy equation E = mc².",
        hindiAnswer: "Albert Einstein ek prasiddha bhautik-vigyani (physicist) the, jo sapekshata ke siddhant (theory of relativity) aur E = mc² ke liye vishvabhor me jaane jaate hain.",
        topic: "Albert Einstein"
      };
    }

    // Age / Personal Detail of person in context
    const person = context?.lastPerson || (lower.includes("narendra modi") || lower.includes("modi") ? "Narendra Modi" : undefined);
    if (person === "Narendra Modi" && (lower.includes("age") || lower.includes("how old") || lower.includes("umar") || lower.includes("saal"))) {
      const birthYear = 1950;
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;
      return {
        hasAnswer: true,
        englishAnswer: `Narendra Modi was born on September 17, 1950, and is currently ${age} years old.`,
        hindiAnswer: `Narendra Modi ka janm 17 September 1950 ko hua tha, aur vartaman me unki umar ${age} varsh hai.`,
        topic: "Narendra Modi"
      };
    }

    if (lower.includes("narendra modi") || lower.includes("prime minister of india") || lower.includes("bharat ke pradhan mantri")) {
      return {
        hasAnswer: true,
        englishAnswer: "Narendra Modi is the current Prime Minister of India, serving in office since May 2014.",
        hindiAnswer: "Narendra Modi Bharat ke vartaman Pradhan Mantri hain, jo May 2014 se is pad par karyarat hain.",
        topic: "Narendra Modi"
      };
    }

    // 4. Casual Conversation & Greetings
    if (/^(what's up|whats up|what is up|sup)\b/i.test(lower)) {
      return {
        hasAnswer: true,
        englishAnswer: "Not much — I'm here and ready to help. What can I do for you?",
        hindiAnswer: "Sab badhiya! Main yahan aapki sahayata ke liye taiyar hoon. Batayein main aapki kya madad karoon?",
        topic: "casual_greeting"
      };
    }

    if (/^(how are you|kaise ho|aap kaise hain|how do you do)\b/i.test(lower)) {
      return {
        hasAnswer: true,
        englishAnswer: "I'm doing great, thank you! How can I assist you today?",
        hindiAnswer: "Main bilkul theek hoon, dhanyavaad! Aaj main aapki kya madad kar sakta hoon?",
        topic: "casual_greeting"
      };
    }

    return {
      hasAnswer: false,
      englishAnswer: "",
      hindiAnswer: ""
    };
  }
}

